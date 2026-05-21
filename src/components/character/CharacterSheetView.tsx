'use client';

import { 
  User, Briefcase, Zap, Save, ArrowLeft, 
  Sword, Swords, ScrollText, GitBranch, UserCircle, X, Heart, Trash2, Edit3, ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';
import { createPortal } from 'react-dom';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { CharacterService } from '@/services/supabase/character.service';
import { ProfileService } from '@/services/supabase/profile.service';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataField, SelectField, SearchableSelect } from '@/components/ui/Fields';
import { Character, CharacterStats, Glosario, PersonajeItem, PersonajeTecnica, Registro } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import RegistroCard from '@/components/registros/RegistroCard';
import MissionTable from '@/components/registros/MissionTable';
import ActionTable from '@/components/registros/ActionTable';
import CombatTable from '@/components/registros/CombatTable';
import MissionForm from '@/components/registros/MissionForm';
import CombatForm from '@/components/registros/CombatForm';
import { CharacterRadarChart } from './CharacterRadarChart';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { RewardLogic } from '@/domain/character/logic';
import { resolveAldeaIcono } from '@/utils/aldea-icon';

interface CharacterSheetViewProps {
  character: Character;
  originalCharacter?: Character | null;
  masters: any; // Masters still contains mixed data, but we'll tipify its usage
  glosarioFiltrado: Glosario[];
  isEditing: boolean;
  canEdit: boolean;
  activeTab: string;
  saving: boolean;
  isAdmin?: boolean;
  isNew?: boolean;
  onUpdateField: (field: keyof Character, value: any) => void;
  onUpdateStat: (stat: keyof CharacterStats, value: number) => void;
  onSave: (section?: 'apariencia' | 'historia') => void | Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  onSetActiveTab: (tab: string) => void;
  onBack: () => void;
  onRefresh?: () => void;
  setIsEditing?: (val: boolean) => void;
  onQuickRemoveItem?: (item: PersonajeItem) => Promise<void>;
  onQuickRemoveTechnique?: (tec: PersonajeTecnica) => Promise<void>;
}

export function CharacterSheetView({
  character,
  originalCharacter,
  masters,
  glosarioFiltrado,
  isEditing,
  canEdit,
  activeTab,
  saving,
  isNew = false,
  isAdmin = false,
  onUpdateField,
  onUpdateStat,
  onSave,
  onCancel,
  onDelete,
  onSetActiveTab,
  onBack,
  onRefresh,
  setIsEditing,
  onQuickRemoveItem,
  onQuickRemoveTechnique
}: CharacterSheetViewProps) {
  const addToast = useToastStore(state => state.addToast);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cálculos Memoizados para evitar trabajo redundante en cada render
  const { allRegistros, totalExp, totalRyous, missionCounts, totalPuntosCombate } = useMemo(() => {
    const allRegistrosMap = new Map<number, Registro>();
    [
      ...(character.registros_autor || []),
      ...(character.registros_participante?.map((p: any) => p.registro).filter(Boolean) || [])
    ].forEach((r: Registro) => allRegistrosMap.set(r.id, r));
    
    const allRegs = Array.from(allRegistrosMap.values()).sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    const missions = allRegs.filter(r => r.tipo === 'mision');

    // Filtrar solo los registros que han sido formalmente aceptados para este personaje
    const acceptedRegs = allRegs.filter(r => {
      const p = r.participantes?.find(part => Number(part.personaje_id) === Number(character.id));
      return p?.estado === 'aceptado';
    });

    const totalExpSpent = acceptedRegs.reduce((sum, r) => sum + (r.data?.gasto_xp || 0), 0);
    const totalRyousSpent = acceptedRegs.reduce((sum, r) => sum + (r.data?.gasto_ryous || 0), 0);
    const totalPCSpent = acceptedRegs.reduce((sum, r) => sum + (r.data?.gasto_pc || 0), 0);

    // Calcular recursos no guardados (en edición) para mantener estables los totales
    const addedItems = (character.personajes_inventario || []).filter(ci => !(originalCharacter?.personajes_inventario || []).some(oi => Number(oi.item_id) === Number(ci.item_id)));
    const addedTecs = (character.personajes_tecnicas || []).filter(ct => !(originalCharacter?.personajes_tecnicas || []).some(ot => Number(ot.tecnica_id) === Number(ct.tecnica_id)));

    const unsavedExpSpent = 
      addedItems.reduce((sum, i) => sum + (i.info_glosario?.coste_exp || 0), 0) +
      addedTecs.reduce((sum, t) => sum + (t.info_glosario?.coste_exp || 0), 0);

    const unsavedRyousSpent = 
      addedItems.reduce((sum, i) => sum + (i.info_glosario?.coste_ryous || 0), 0) +
      addedTecs.reduce((sum, t) => sum + (t.info_glosario?.coste_ryous || 0), 0);

    const unsavedPCSpent = 
      addedItems.reduce((sum, i) => sum + (i.info_glosario?.requisitos?.combates || 0), 0) +
      addedTecs.reduce((sum, t) => sum + (t.info_glosario?.requisitos?.combates || 0), 0);

    return {
      allRegistros: allRegs,
      totalExp: (character.xp || 0) + totalExpSpent + unsavedExpSpent,
      totalRyous: (character.ryous || 0) + totalRyousSpent + unsavedRyousSpent,
      totalPuntosCombate: (character.puntos_combate || 0) + totalPCSpent + unsavedPCSpent,
      missionCounts: {
        D: missions.filter(m => m.subtipo === 'D').length,
        C: missions.filter(m => m.subtipo === 'C').length,
        B: missions.filter(m => m.subtipo === 'B').length,
        A: missions.filter(m => m.subtipo === 'A').length,
        S: missions.filter(m => m.subtipo === 'S').length,
      }
    };
  }, [
    character.id, 
    character.xp, 
    character.ryous, 
    character.puntos_combate, 
    character.registros_autor, 
    character.registros_participante,
    character.personajes_inventario,
    character.personajes_tecnicas,
    originalCharacter?.personajes_inventario,
    originalCharacter?.personajes_tecnicas
  ]);

  const meetsRequirements = (item: Glosario) => {
    if (!item.requisitos) return true;
    if (!character) return true;

    let req = item.requisitos;
    if (typeof req === 'string') {
      try { req = JSON.parse(req); } catch { return true; }
    }

    // 1. Rango
    if (req.rango && typeof req.rango === 'string') {
      const rankOrder: Record<string, number> = { 'D': 0, 'C': 1, 'B': 2, 'A': 3, 'S': 4 };
      const charR = (character.rango || 'D').toUpperCase();
      const reqR = req.rango.toUpperCase();
      
      const charRank = rankOrder[charR] ?? 0;
      const reqRank = rankOrder[reqR] ?? 0;
      if (charRank < reqRank) return false;
    }

    // 2. Stats
    if (req.stats && typeof req.stats === 'object') {
      for (const [stat, value] of Object.entries(req.stats)) {
        const reqValue = Number(value);
        if (isNaN(reqValue) || reqValue <= 0) continue;

        const sKey = stat.toUpperCase();
        // @ts-ignore
        const baseVal = Number(character.stats_base?.[sKey] || 0);
        // @ts-ignore
        const derivVal = Number(character.atributos_derivados?.[sKey] || 0);
        const currentVal = Math.max(baseVal, derivVal);

        if (currentVal < reqValue) return false;
      }
    }

    // 3. Misiones
    if (req.misiones && typeof req.misiones === 'object') {
      const counts = missionCounts || { D: 0, C: 0, B: 0, A: 0, S: 0 };
      for (const [rank, count] of Object.entries(req.misiones)) {
        const reqCount = Number(count);
        if (isNaN(reqCount) || reqCount <= 0) continue;
        
        const rKey = rank.toUpperCase() as keyof typeof counts;
        const charCount = Number(counts[rKey] || 0);
        if (charCount < reqCount) return false;
      }
    }

    // 4. Combates (Costo de Puntos de Combate)
    if (req.combates) {
      const reqCombates = Number(req.combates);
      if (!isNaN(reqCombates) && reqCombates > 0) {
        const charCombates = Number(character.puntos_combate || 0);
        if (charCombates < reqCombates) return false;
      }
    }

    // 5. Rama/Clan
    if (req.rama_id) {
      const reqRamaId = Number(req.rama_id);
      if (!isNaN(reqRamaId) && reqRamaId > 0) {
        const charRamaIds = (character.personajes_ramas || []).map(r => Number(r.rama_id));
        if (!charRamaIds.includes(reqRamaId)) return false;
      }
    }

    // 6. Exclusividad
    if (req.personaje_id) {
      const pId = req.personaje_id;
      if (Array.isArray(pId)) {
        const normalizedIds = pId.map(id => Number(id)).filter(id => !isNaN(id));
        if (normalizedIds.length > 0 && !normalizedIds.includes(Number(character.id))) {
          return false;
        }
      } else if (typeof pId === 'string') {
        const normalizedIds = pId.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
        if (normalizedIds.length > 0 && !normalizedIds.includes(Number(character.id))) {
          return false;
        }
      } else {
        const reqPId = Number(pId);
        if (!isNaN(reqPId) && reqPId > 0) {
          if (Number(character.id) !== reqPId) return false;
        }
      }
    }

    return true;
  };

  const { puntosGastados, puntosLibres } = useMemo(() => {
    const pg = Object.values(character.stats_base || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    return {
      puntosGastados: pg,
      puntosLibres: (Number(character.puntos_stats) || 0) - pg
    };
  }, [character.stats_base, character.puntos_stats]);

  const aldeaObj = useMemo(() => masters.aldeas.find((a: any) => a.id == character.aldea_id), [masters.aldeas, character.aldea_id]);
  const iconUrl = useMemo(() => aldeaObj ? resolveAldeaIcono(aldeaObj) : null, [aldeaObj]);
  
  const canAccessTraining = useMemo(() => {
    const currentRankValue = masters.rankOrder[character.rango || 'D'] || 0;
    const requiredRankValue = masters.rankOrder[masters.requiredTrainingRank] || 0;
    return currentRankValue >= requiredRankValue;
  }, [character.rango, masters.rankOrder, masters.requiredTrainingRank]);

  // Memoizar el inventario agrupado
  const groupedInventory = useMemo(() => {
    return (character.personajes_inventario || []).reduce((acc: Record<string, Record<string, PersonajeItem[]>>, pi: PersonajeItem) => {
      // Soporte tanto para objeto directo como para array de Supabase
      const catData = pi.info_glosario?.info_glosario_categorias;
      const subData = pi.info_glosario?.info_glosario_subcategorias;
      
      const cat = (Array.isArray(catData) ? catData[0]?.nombre : catData?.nombre) || 'General';
      const sub = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'Otros';
      
      if (!acc[cat]) acc[cat] = {};
      if (!acc[cat][sub]) acc[cat][sub] = [];
      acc[cat][sub].push(pi);
      return acc;
    }, {});
  }, [character.personajes_inventario]);

  const renderRequisitos = (reqs: any) => {
    if (!reqs) return <span className="text-[10px] text-oro/30 italic">Sin requisitos</span>;
    if (typeof reqs === 'string') return <span className="text-[10px] text-oro/60 font-bold uppercase">{reqs}</span>;
    
    const elements: React.ReactNode[] = [];
    
    if (reqs.rango) {
      elements.push(<span key="rango" className="text-rojo-sangre font-black">{reqs.rango}</span>);
    }
    if (reqs.rama_id) {
      elements.push(<span key="rama" className="text-oro font-black">RAMA/CLAN</span>);
    }
    if (reqs.combates) {
      elements.push(
        <span key="combates" className="text-emerald-500 font-black">
          P. COMBATE: <span className="text-emerald-400">{reqs.combates}</span>
        </span>
      );
    }
    
    if (reqs.stats && typeof reqs.stats === 'object') {
      Object.entries(reqs.stats).forEach(([stat, val]) => {
        if (val && val !== 0) {
          elements.push(
            <span key={stat} className="text-oro/50 font-black">
              {stat.toUpperCase()}: <span className="text-oro">{String(val)}</span>
            </span>
          );
        }
      });
    }

    if (reqs.misiones && typeof reqs.misiones === 'object') {
      Object.entries(reqs.misiones).forEach(([rangoM, cant]) => {
        if (cant && cant !== 0) {
          elements.push(
            <span key={rangoM} className="text-rojo-sangre font-black">
              M.{rangoM}: <span className="text-oro">{String(cant)}</span>
            </span>
          );
        }
      });
    }

    Object.entries(reqs).forEach(([key, value]) => {
      if (['rango', 'rama_id', 'stats', 'misiones', 'personaje_id', 'combates'].includes(key)) return;
      if (value === null || value === undefined || value === 0 || value === false || value === '') return;
      elements.push(
        <span key={key} className="text-oro/50 font-black">
          {key.replace('_', ' ').toUpperCase()}: <span className="text-oro">{String(value)}</span>
        </span>
      );
    });

    if (elements.length === 0) return <span className="text-[10px] text-oro/30 italic">Sin requisitos</span>;

    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-tighter leading-tight">
        {elements.map((el, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-oro/20">|</span>}
            {el}
          </Fragment>
        ))}
      </div>
    );
  };

  // Memoizar Técnicas agrupadas por subcategoría (categoria_id === 1 o fallbacks)
  const tecnicasGrouped = useMemo(() => {
    const list = (character.personajes_tecnicas || []).filter((pt: PersonajeTecnica) => {
      const catId = pt.info_glosario?.categoria_id;
      return catId === 1 || (catId !== 2 && catId !== 3 && catId !== 4);
    });
    return list.reduce((acc: Record<string, PersonajeTecnica[]>, pt: PersonajeTecnica) => {
      const subData = pt.info_glosario?.info_glosario_subcategorias;
      const sub = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'Otros';
      if (!acc[sub]) acc[sub] = [];
      acc[sub].push(pt);
      return acc;
    }, {});
  }, [character.personajes_tecnicas]);

  // Memoizar Pasivas agrupadas por subcategoría (categoria_id === 4)
  const pasivasGrouped = useMemo(() => {
    const list = (character.personajes_tecnicas || []).filter((pt: PersonajeTecnica) => {
      return pt.info_glosario?.categoria_id === 4;
    });
    return list.reduce((acc: Record<string, PersonajeTecnica[]>, pt: PersonajeTecnica) => {
      const subData = pt.info_glosario?.info_glosario_subcategorias;
      const sub = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'Otros';
      if (!acc[sub]) acc[sub] = [];
      acc[sub].push(pt);
      return acc;
    }, {});
  }, [character.personajes_tecnicas]);

  // Memoizar Kuchiyoses agrupadas por subcategoría (categoria_id === 3)
  const kuchiyosesGrouped = useMemo(() => {
    const list = (character.personajes_tecnicas || []).filter((pt: PersonajeTecnica) => {
      return pt.info_glosario?.categoria_id === 3;
    });
    return list.reduce((acc: Record<string, PersonajeTecnica[]>, pt: PersonajeTecnica) => {
      const subData = pt.info_glosario?.info_glosario_subcategorias;
      const sub = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'Otros';
      if (!acc[sub]) acc[sub] = [];
      acc[sub].push(pt);
      return acc;
    }, {});
  }, [character.personajes_tecnicas]);


  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null);
  const [registroTab, setRegistroTab] = useState<'mision' | 'accion' | 'combate'>('mision');
  const [recordPage, setRecordPage] = useState(1);
  const recordsPerPage = 10;
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editingImageKey, setEditingImageKey] = useState<'character' | 'user' | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');

  // Bloquear scroll de fondo al abrir el modal de edición
  useEffect(() => {
    if (editingRegistro || editingImageKey) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingRegistro, editingImageKey]);

// Componentes Helper fuera del render principal para evitar re-montajes
const ResourceDisplay = ({ character, totalExp, totalRyous, totalPuntosCombate, xpLimitUsage }: { character: Character, totalExp: number, totalRyous: number, totalPuntosCombate: number, xpLimitUsage?: number | null }) => (
  <div className="flex flex-wrap justify-center items-center gap-6 mb-8">
    <div className="flex items-center gap-4 px-8 py-4 ninja-card-oro group hover-ninja">
      <div className="w-10 h-10 bg-rojo-sangre rotate-45 flex items-center justify-center shadow-[0_0_12px_rgba(103,9,9,0.4)]">
        <span className="text-oro font-black -rotate-45 text-lg italic">¥</span>
      </div>
      <div>
        <p className="text-[9px] font-black text-oro/40 uppercase tracking-[0.3em] mb-1">RYOUS (DISPONIBLE / TOTAL)</p>
        <p className="text-xl xl:text-2xl font-black text-oro leading-none">
          {new Intl.NumberFormat('es-ES').format(character.ryous || 0)}
          <span className="text-oro/20 mx-3">/</span>
          <span className="text-oro/60 text-sm xl:text-lg">{new Intl.NumberFormat('es-ES').format(totalRyous)}</span>
        </p>
      </div>
    </div>
    <div className="flex items-center gap-4 px-8 py-4 ninja-card-oro group hover-ninja">
      <div className="w-10 h-10 bg-oro rotate-45 flex items-center justify-center shadow-[0_0_12px_rgba(255,230,159,0.25)]">
        <span className="text-rojo-sangre font-black -rotate-45 text-[11px] italic">XP</span>
      </div>
      <div>
        <p className="text-[9px] font-black text-oro/40 uppercase tracking-[0.3em] mb-1">
          {xpLimitUsage ? 'EXPERIENCIA (DISP. / TOTAL / LÍMITE)' : 'EXPERIENCIA (DISPONIBLE / TOTAL)'}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xl xl:text-2xl font-black text-oro leading-none">
            {new Intl.NumberFormat('es-ES').format(character.xp || 0)}
            <span className="text-oro/20 mx-3">/</span>
            <span className="text-oro/60 text-sm xl:text-lg">{new Intl.NumberFormat('es-ES').format(totalExp)}</span>
            {xpLimitUsage && (
              <>
                <span className="text-oro/20 mx-3">/</span>
                <span className="text-oro/60 text-sm xl:text-lg font-black text-oro/90">{new Intl.NumberFormat('es-ES').format(xpLimitUsage)}</span>
              </>
            )}
          </p>
          {xpLimitUsage && totalExp >= xpLimitUsage && (
            <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-rojo-sangre/20 border border-rojo-sangre/40 text-rojo-sangre tracking-widest ninja-clip-xs animate-pulse">
              LÍMITE
            </span>
          )}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4 px-8 py-4 ninja-card-oro group hover-ninja">
      <div className="w-10 h-10 bg-emerald-950/80 border border-emerald-500/30 rotate-45 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.2)]">
        <Swords className="w-5 h-5 text-emerald-400 -rotate-45" />
      </div>
      <div>
        <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.3em] mb-1">P. COMBATE (DISPONIBLE / TOTAL)</p>
        <p className="text-xl xl:text-2xl font-black text-emerald-400 leading-none">
          {character.puntos_combate || 0}
          <span className="text-emerald-500/20 mx-3">/</span>
          <span className="text-emerald-500/60 text-sm xl:text-lg">{totalPuntosCombate}</span>
        </p>
      </div>
    </div>
  </div>
);

const MissionCounter = ({ counts }: { counts: Record<string, number> }) => (
  <SectionCard title="HISTORIAL DE MISIONES" icon={ScrollText} color="oro">
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
      {Object.entries(counts).map(([rank, count]) => (
        <div key={rank} className="ninja-card-oro p-6 text-center group hover-ninja transition-all">
          <p className="text-[10px] font-black text-oro/40 uppercase tracking-widest mb-3">RANGO {rank}</p>
          <p className="text-3xl xl:text-5xl font-black text-oro italic leading-none">{count}</p>
        </div>
      ))}
    </div>
  </SectionCard>
);


  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-20 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto mb-6 sm:mb-8 ninja-card-oro p-4 sm:p-8 xl:p-10 z-50">
        <div className="flex flex-col gap-6 xl:gap-8 w-full">
          
          {/* Fila 1: Navegación/Breadcrumbs y Botones de Acción */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-oro/10 pb-4 w-full">
            {/* Breadcrumbs */}
            <div className="w-full sm:w-auto flex-1 min-w-0">
              <Breadcrumbs 
                items={
                  isNew
                    ? [
                        { label: 'Inicio', href: '/' },
                        { label: 'Crear Ficha' }
                      ]
                    : [
                        { label: 'Inicio', href: '/' },
                        { label: 'Mundo Ninja', href: '/mundo-ninja' },
                        ...(character.aldea_id && character.aldeas
                          ? [
                              { 
                                label: character.aldeas.abreviatura || character.aldeas.nombre_completo, 
                                href: `/mundo-ninja/${character.aldea_id}` 
                              }
                            ]
                          : character.aldea_id === null
                          ? [
                              { label: 'Renegados / Ninjas sin Aldea', href: '/mundo-ninja/renegados' }
                            ]
                          : []),
                        { label: character.nombre_ninja }
                      ]
                }
              />
            </div>

            {/* Botones de Acción (Editar/Guardar/Cancelar/Borrar) */}
            <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-end shrink-0">
              {!isNew && canEdit && onDelete && (
                <button 
                  onClick={onDelete}
                  className="p-3 text-rojo-sangre hover:scale-105 active:scale-95 hover:brightness-125 transition-all"
                  title="Borrar Personaje"
                >
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
              
              {(!isNew && canEdit) && (
                <button 
                  onClick={() => isEditing ? onCancel() : setIsEditing?.(true)} 
                  className={`px-5 sm:px-8 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${isEditing ? 'ninja-btn-oro' : 'ninja-btn-ghost'}`}
                >
                  {isEditing ? 'CANCELAR' : 'EDITAR FICHA'}
                </button>
              )}
              {(isEditing || isNew) && (
                <button 
                  onClick={() => onSave()} 
                  disabled={saving} 
                  className={`px-6 sm:px-10 py-2.5 sm:py-3.5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${isNew ? 'ninja-btn-oro' : 'ninja-btn-rojo'}`}
                >
                  {isNew ? 'INICIALIZAR' : 'GUARDAR'}
                </button>
              )}
            </div>
          </div>

          {/* Fila 2: Banner de Identidad del Personaje (Avatar, Nombre y Rango) */}
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 justify-center text-center md:text-left py-2">
            {/* Contenedor del Avatar */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 ninja-card-oro p-1.5 border-oro/20 bg-black/40 shadow-2xl flex items-center justify-center relative">
              {character.url_img ? (
                <img 
                  src={character.url_img} 
                  className="w-full h-full object-cover object-top"
                  alt="Avatar"
                />
              ) : (
                <User className="w-12 h-12 text-oro/20" />
              )}
              {iconUrl && (
                <div className="absolute -top-3 -right-3 z-20 transition-transform duration-300 hover:scale-110">
                  <img 
                    src={iconUrl} 
                    alt={aldeaObj?.nombre_completo || 'Aldea'} 
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain filter drop-shadow-[0_0_6px_rgba(255,215,0,0.7)] hover:drop-shadow-[0_0_10px_rgba(255,215,0,0.9)] transition-all duration-300"
                  />
                </div>
              )}
            </div>

            {/* Información del Personaje */}
            <div className="min-w-0 flex flex-col items-center md:items-start">
              <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                <div className="w-2 h-2 bg-rojo-sangre rotate-45" />
                <p className="text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.5em]">EXPEDIENTE NINJA OFICIAL</p>
              </div>

              <h1 className="ninja-title text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl italic break-words leading-tight text-center md:text-left px-2 md:px-0">
                {character.nombre_ninja || (isNew ? 'NUEVO SHINOBI' : '')}
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-6 mt-4">
                <div className="px-5 py-1.5 sm:px-6 sm:py-2 bg-rojo-sangre text-oro text-[10px] sm:text-xs xl:text-sm font-black uppercase tracking-[0.3em] shadow-lg">
                  RANGO {character.rango}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-oro/20 rotate-45" />
                  <span className="text-oro font-bold text-xs xl:text-base uppercase tracking-widest">{character.rango_jerarquico}</span>
                  {(aldeaObj?.nombre_completo || character.aldeas?.nombre_completo) && (
                    <>
                      <div className="w-1.5 h-1.5 bg-oro/20 rotate-45" />
                      <span className="text-oro/60 font-bold text-xs xl:text-base uppercase tracking-widest">{aldeaObj?.nombre_completo || character.aldeas?.nombre_completo}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="flex flex-nowrap gap-4 xl:gap-8 mb-4 sm:mb-4 justify-start sm:justify-center overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {['general', 'ninja', 'inventario', 'tecnicas', 'onrol', 'registros'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab} 
                onClick={() => onSetActiveTab(tab)} 
                className={`px-8 sm:px-12 py-4 text-[11px] xl:text-sm font-black uppercase tracking-widest transition-all duration-300 border ninja-clip-sm shrink-0 relative group ${
                  isActive 
                  ? 'bg-oro text-rojo-sangre border-oro shadow-[0_0_30px_rgba(255,230,159,0.5)]' 
                  : 'bg-black/60 text-oro/30 border-oro/10 hover:border-oro/60 hover:text-oro hover:bg-black/90'
                }`}
              >
                <span>{tab}</span>
                {!isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-oro transition-all duration-300 group-hover:w-[80%]" />
                )}
              </button>
            );
          })}
        </div>


        {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-fade-in">
              {/* Columna de Retrato */}
              <div className="lg:col-span-4 space-y-8 max-w-sm mx-auto lg:max-w-none w-full">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-b from-oro/20 to-transparent blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <div 
                    onClick={() => {
                      if (isEditing || isNew) {
                        setImageUrlInput(character.url_img || '');
                        setEditingImageKey('character');
                      }
                    }}
                    className={`relative aspect-[3/4] w-full ninja-card-oro overflow-hidden border-oro/20 group flex items-center justify-center bg-black/40 ${isEditing || isNew ? 'cursor-pointer hover:border-oro/40' : ''}`}
                  >
                    {character.url_img ? (
                      <img 
                        src={character.url_img} 
                        className="w-full h-full object-cover object-top hover:scale-110 transition-transform duration-700"
                        alt={character.nombre_ninja}
                      />
                    ) : (
                      <User className="w-24 h-24 text-oro/10 group-hover:text-oro/20 transition-colors" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                    
                    {/* Overlay de Edición */}
                    {(isEditing || isNew) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <div className="text-center">
                          <ImageIcon className="w-8 h-8 text-oro mx-auto mb-2" />
                          <p className="text-[10px] font-black text-oro uppercase tracking-widest">CAMBIAR IMAGEN</p>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between gap-4 z-20">
                      <div className="min-w-0">
                        <p className="ninja-title text-lg sm:text-2xl mb-1 truncate">{character.nombre_ninja}</p>
                        <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.3em]">{character.rango_jerarquico}</p>
                      </div>
                      {iconUrl && (
                        <div className="shrink-0 transition-transform duration-300 hover:scale-110">
                          <img 
                            src={iconUrl} 
                            alt={aldeaObj?.nombre_completo || 'Aldea'} 
                            className="w-12 h-12 object-contain filter drop-shadow-[0_0_8px_rgba(255,215,0,0.65)] hover:drop-shadow-[0_0_12px_rgba(255,215,0,0.9)] transition-all duration-300"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                  
                  {/* Si el usuario tiene url_img propia, mostrarla debajo como miniatura opcional o decorativa */}
                  {(Array.isArray(character.profiles) ? character.profiles[0]?.url_img : character.profiles?.url_img) ? (
                    <div 
                      onClick={() => {
                        if (isAdmin) {
                          const profileUrl = Array.isArray(character.profiles) ? character.profiles[0]?.url_img : character.profiles?.url_img;
                          setImageUrlInput(profileUrl || '');
                          setEditingImageKey('user');
                        }
                      }}
                      className={`ninja-card-oro p-6 flex items-center gap-6 group transition-all ${isAdmin ? 'cursor-pointer hover:border-oro/40' : ''}`}
                    >
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-oro/10 group-hover:border-oro/30 transition-all">
                        <img 
                          src={(Array.isArray(character.profiles) ? character.profiles[0]?.url_img : character.profiles?.url_img) || undefined} 
                          className="w-full h-full object-cover"
                          alt="Usuario"
                        />
                        {isAdmin && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit3 className="w-4 h-4 text-oro" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-oro/30 uppercase tracking-widest mb-1">IMAGEN DE JUGADOR</p>
                        <p className="text-xs font-bold text-oro uppercase">
                          {isAdmin ? 'HAGA CLIC PARA CAMBIAR' : 'SINCRONIZADA'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Si no tiene imagen de jugador, pero es admin, permitir asignarla
                    isAdmin && (
                      <div 
                        onClick={() => {
                          setImageUrlInput('');
                          setEditingImageKey('user');
                        }}
                        className="ninja-card-oro p-6 flex items-center justify-center gap-4 group cursor-pointer hover:border-oro/40 transition-all"
                      >
                        <ImageIcon className="w-5 h-5 text-oro/40 group-hover:text-oro transition-colors" />
                        <span className="text-[10px] font-black text-oro/60 uppercase tracking-widest">ASIGNAR IMAGEN DE JUGADOR</span>
                      </div>
                    )
                  )}
                </div>

              <div className="lg:col-span-8 space-y-8">
              <SectionCard title="INFORMACIÓN DEL JUGADOR" icon={User} color="oro">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <DataField 
                      label="USUARIO DISCORD (PLAYER)" 
                      value={
                        Array.isArray(character.profiles) 
                          ? character.profiles[0]?.username 
                          : character.profiles?.username || (isNew ? 'CARGANDO...' : 'NO VINCULADO')
                      } 
                      disabled={true} 
                    />
                    <DataField label="NOMBRE EN HOBBA" value={character.hobba_name} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('hobba_name', v)} />
                    <DataField label="TIEMPO EN EL RPG" value={character.tiempo_rpg} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('tiempo_rpg', v)} />
                  </div>
              </SectionCard>

              <SectionCard title="PERFIL DEL SHINOBI" icon={UserCircle} color="oro">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <DataField label="NOMBRE NINJA" value={character.nombre_ninja} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('nombre_ninja', v)} />
                    <SelectField 
                      label="ALDEA DE ORIGEN" 
                      value={character.aldea_id} 
                      options={masters.aldeas.map((a:any)=>({label:a.nombre_completo, value:a.id}))} 
                      disabled={!isEditing && !isNew} 
                      placeholder="SIN ALDEA"
                      onChange={(v)=>onUpdateField('aldea_id', v ? Number(v) : null)} 
                    />
                    <DataField label="RANGO ACTUAL" value={`RANGO ${character.rango}`} disabled={true} />
                    <SelectField 
                      label="POSICIÓN JERÁRQUICA" 
                      value={character.rango_jerarquico} 
                      options={masters.rangosJerarquicos || ["ESTUDIANTE", "GENIN", "CHUNIN", "JONIN"]} 
                      disabled={!isEditing && !isNew} 
                      onChange={(v)=>onUpdateField('rango_jerarquico', v)} 
                    />
                  </div>
              </SectionCard>

              <SectionCard title="RAMAS Y ESPECIALIDADES" icon={GitBranch} color="oro">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   {[1, 2].map(slot => {
                     const pr = character.personajes_ramas?.find((r: any) => Number(r.slot) === slot);
                     return (
                       <div key={slot} className="space-y-6 p-8 bg-black/40 border border-oro/10 relative overflow-hidden ninja-clip-md">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                          <h4 className="text-[10px] font-black text-oro/40 uppercase tracking-[0.3em] mb-4">ESPECIALIDAD SLOT {slot}</h4>
                          <div className="space-y-6">
                            <SelectField 
                              label="RAMA / CLAN" 
                              value={pr?.rama_id} 
                              options={masters.ramas
                                 .filter((r: any) => !r.aldea_id || Number(r.aldea_id) === Number(character.aldea_id))
                                 .map((r:any)=>({label:r.nombre, value:r.id}))
                               } 
                              disabled={!isEditing && !isNew} 
                              onChange={(v)=>{
                                const newRamas = [...(character.personajes_ramas?.filter((r:any)=>Number(r.slot) !== slot) || []), { slot, rama_id: Number(v), sub_especialidad_id: null, id_entrenamiento: null }];
                                onUpdateField('personajes_ramas', newRamas);
                              }} 
                            />
                            {masters.subEspecialidades.some((s: any) => s.rama_id === pr?.rama_id) && (
                              <SelectField 
                                label="SUB-ESPECIALIDAD" 
                                value={pr?.sub_especialidad_id} 
                                options={masters.subEspecialidades.filter((s:any)=>s.rama_id === pr?.rama_id).map((s:any)=>({label:s.nombre, value:s.id}))} 
                                disabled={!isEditing && !isNew} 
                                onChange={(v)=>{
                                  const newRamas = [...(character.personajes_ramas?.filter((r:any)=>Number(r.slot) !== slot) || []), { ...pr, slot, rama_id: pr?.rama_id, sub_especialidad_id: v ? Number(v) : null, id_entrenamiento: null }];
                                  onUpdateField('personajes_ramas', newRamas);
                                }} 
                              />
                            )}
                            {canAccessTraining && (
                              <SelectField 
                                label="ENTRENAMIENTO" 
                                value={pr?.id_entrenamiento} 
                                options={masters.entrenamientos
                                  .filter((e: any) => 
                                    e.id_ramaclan === pr?.rama_id && 
                                    (!pr?.sub_especialidad_id ? !e.id_subespecialidad : (e.id_subespecialidad === pr?.sub_especialidad_id || !e.id_subespecialidad))
                                  )
                                  .map((e: any) => ({ label: e.nombre_esp, value: e.id }))
                                } 
                                disabled={!isEditing && !isNew} 
                                onChange={(v) => {
                                  const newRamas = [...(character.personajes_ramas?.filter((r: any) => Number(r.slot) !== slot) || []), { ...pr, slot, id_entrenamiento: v ? Number(v) : null }];
                                  onUpdateField('personajes_ramas', newRamas);
                                }} 
                              />
                            )}
                          </div>
                       </div>
                     );
                   })}
                </div>
              </SectionCard>
            </div>
          </div>
        )}
        
        {activeTab === 'ninja' && (
          <div className="animate-fade-in">
            <SectionCard 
              title="ATRIBUTOS Y ESTADÍSTICAS" 
              icon={Heart} 
              color="oro" 
              headerAction={
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-oro/40 uppercase tracking-[0.3em] mb-1">Puntos Disponibles</span>
                  <span className="text-3xl xl:text-5xl font-black text-oro italic">
                    {puntosLibres}
                    <span className="text-oro/20 text-sm xl:text-lg ml-2">/ {character.puntos_stats}</span>
                  </span>
                </div>
              }
            >
              {/* Gráfico en Radar Dinámico */}
              <div className="flex justify-center items-center w-full mb-2 border-b border-oro/5 pb-2 -mt-6">
                <CharacterRadarChart 
                  stats={character.stats_base} 
                  maxVal={10} 
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20">
                <div className="lg:col-span-7 space-y-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
                    <h3 className="text-xs xl:text-sm font-black text-oro/60 uppercase tracking-[0.4em]">Estadísticas Base</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    {['NIN', 'GEN', 'TAI', 'SM', 'FUE', 'AGI', 'EST', 'INT'].map((s) => {
                      const val = character.stats_base[s as keyof CharacterStats] || 0;
                      const max = masters.rangoRules?.[character.rango]?.stat_max || 10;
                      return (
                        <div key={s} className="bg-black/40 border border-oro/10 p-6 flex justify-between items-center relative group hover:border-oro/40 transition-all overflow-hidden" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 0px)' }}>
                          <div className="absolute top-0 right-0 w-12 h-12 bg-oro/5 rotate-45 -mr-6 -mt-6 pointer-events-none" />
                          <div className="flex flex-col items-start relative z-10">
                            <span className="text-xs font-black text-oro/40 uppercase tracking-[0.2em]">{s}</span>
                            <span className="text-[8px] font-black text-oro/20 mt-1 uppercase tracking-tighter">LÍMITE: {max}</span>
                          </div>
                          <div className="flex items-center gap-2 relative z-10">
                            <input 
                              type="number" 
                              value={val} 
                              disabled={!isEditing && !isNew}
                              onChange={(e) => onUpdateStat(s as keyof CharacterStats, parseInt(e.target.value))}
                              className="bg-transparent text-2xl xl:text-3xl font-black text-oro w-16 text-right outline-none disabled:cursor-default selection:bg-oro/20 leading-none py-1"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-10 lg:border-l lg:border-oro/5 lg:pl-12 xl:pl-20">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
                    <h3 className="text-xs xl:text-sm font-black text-oro/60 uppercase tracking-[0.4em]">Atributos Calculados</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'VIT', val: character.atributos_derivados.VIT, color: 'text-rojo-sangre' },
                      { label: 'CH', val: character.atributos_derivados.CH, color: 'text-blue-500' },
                      { label: 'VEL', val: character.atributos_derivados.VEL, color: 'text-oro' },
                      { label: 'RES', val: `${character.atributos_derivados.RES}%`, color: 'text-oro/80' },
                      { label: 'VR', val: character.atributos_derivados.VR, color: 'text-oro/60' },
                      { label: 'DET', val: character.atributos_derivados.DET, color: 'text-oro/40' },
                    ].map(attr => (
                      <div key={attr.label} className="bg-black/60 border border-oro/10 p-6 flex justify-between items-center group hover:border-oro/40 transition-all" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                        <span className="text-xs font-black text-oro/40 uppercase tracking-[0.2em]">{attr.label}</span>
                        <span className={`text-2xl xl:text-3xl font-black ${attr.color} italic leading-none`}>
                          {String(attr.val || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        )}
        {activeTab === 'inventario' && (
          <div className="space-y-8 animate-fade-in">
            <ResourceDisplay character={character} totalExp={totalExp} totalRyous={totalRyous} totalPuntosCombate={totalPuntosCombate} xpLimitUsage={masters?.xpLimitUsage} />
            <SectionCard title="MOCHILA Y PERTENENCIAS" icon={Briefcase} color="oro">
              <div className="space-y-16">
                {Object.entries(groupedInventory).map(([catName, subs]: [string, any]) => (
                  <div key={catName} className="space-y-8">
                    <div className="flex items-center gap-6">
                      <h3 className="text-xl xl:text-3xl font-black text-oro uppercase tracking-[0.2em]">{catName}</h3>
                      <div className="flex-1 h-px bg-oro/10" />
                    </div>
              
                    <div className="space-y-10">
                      {Object.entries(subs).map(([subName, items]: [string, any]) => (
                        <div key={subName} className="space-y-6">
                          <h4 className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                            <div className="w-1 h-1 bg-rojo-sangre rotate-45" />
                            {subName}
                          </h4>
                          <div className="overflow-x-auto rounded-[4px] border border-oro/10 ninja-table-container backdrop-blur-md">
                            <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
                              <thead>
                                <tr className="ninja-table-header text-[10px] font-black uppercase tracking-[0.2em] text-oro border-b border-oro/15">
                                  <th className="py-4 px-6 w-[40%]">Objeto</th>
                                  <th className="py-4 px-6 w-[45%]">Requisitos</th>
                                  <th className="py-4 px-6 w-[15%] text-center">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-oro/5 ninja-table-body">
                                {items.map((pi: PersonajeItem, idx: number) => (
                                  <tr key={`${pi.item_id}-${idx}`} className="hover:bg-oro/[0.02] transition-colors">
                                    <td className="py-4 px-6">
                                      <div className="flex flex-col">
                                        <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base">
                                          {pi.info_glosario?.nombre_es}
                                        </span>
                                        {pi.info_glosario?.nombre_jp && (
                                          <span className="text-[10px] text-oro/30 uppercase font-black tracking-tighter mt-0.5">
                                            {pi.info_glosario?.nombre_jp}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      {renderRequisitos(pi.info_glosario?.requisitos)}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                      {(isEditing || isNew) && (
                                        <button 
                                          onClick={() => {
                                            const isNewlyAdded = !pi.id;
                                            if (isEditing || isNew) {
                                              if (isNewlyAdded) {
                                                if (pi.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pi.info_glosario.coste_exp);
                                                if (pi.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pi.info_glosario.coste_ryous);
                                                if (pi.info_glosario?.requisitos?.combates) onUpdateField('puntos_combate', (character.puntos_combate || 0) + pi.info_glosario.requisitos.combates);
                                              }
                                              onUpdateField('personajes_inventario', character.personajes_inventario?.filter((i: PersonajeItem) => i.item_id !== pi.item_id));
                                            } else {
                                              onQuickRemoveItem?.(pi);
                                            }
                                          }} 
                                          className="text-rojo-sangre/60 p-2 hover:bg-rojo-sangre/10 hover:text-rojo-sangre transition-all rounded-[3px]"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {(canEdit || isNew) && (isEditing || isNew) && (
                <div className="mt-20 pt-12 border-t border-oro/10">
                  <SearchableSelect 
                    label="ADQUIRIR NUEVO OBJETO" 
                    placeholder="BUSCAR EN EL GLOSARIO DE EQUIPO..."
                    options={(glosarioFiltrado || [])
                      .filter((i: Glosario) => i.categoria_id === 2 && meetsRequirements(i) && !(character.personajes_inventario || []).some((pi: PersonajeItem) => pi.item_id === i.id))
                      .map((i: any) => {
                        const subData = i.info_glosario_subcategorias;
                        const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'GENERAL';
                        const pcCostText = ` / ${i.requisitos?.combates || 0} PC`;
                        return { 
                          label: `${i.nombre_es} (${subName}) — ${i.coste_exp} EXP / ${i.coste_ryous} RYOUS${pcCostText}`, 
                          value: i.id 
                        };
                      })
                    } 
                    onChange={(v) => {
                      const it = (glosarioFiltrado || []).find((i: any) => i.id === Number(v));
                      const current = character.personajes_inventario || [];
                      
                      if (it && !current.some((i: any) => i.item_id === it.id)) {
                        const costExp = it.coste_exp || 0;
                        const costRyous = it.coste_ryous || 0;
                        const costPC = it.requisitos?.combates || 0;
                        const currentExp = character.xp || 0;
                        const currentRyous = character.ryous || 0;
                        const currentPC = character.puntos_combate || 0;

                        if (currentExp < costExp || currentRyous < costRyous || currentPC < costPC) {
                          addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPC} P. COMBATE.`, "error");
                          return;
                        }

                        onUpdateField('personajes_inventario', [...current, { item_id: it.id, info_glosario: it }]);
                        if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                        if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                        if (costPC > 0) onUpdateField('puntos_combate', currentPC - costPC);
                      }
                    }} 
                  />
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'tecnicas' && (
          <div className="space-y-8 animate-fade-in">
            <ResourceDisplay character={character} totalExp={totalExp} totalRyous={totalRyous} totalPuntosCombate={totalPuntosCombate} xpLimitUsage={masters?.xpLimitUsage} />

            {/* SECCIÓN 1: ARTES Y JUTSUS NINJA */}
            <SectionCard title="ARTES Y JUTSUS NINJA" icon={Zap} color="oro">
              {Object.keys(tecnicasGrouped).length === 0 ? (
                <div className="py-12 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
                  No tienes técnicas aprendidas
                </div>
              ) : (
                <div className="space-y-10">
                  {Object.entries(tecnicasGrouped).map(([subName, items]: [string, any]) => (
                    <div key={subName} className="space-y-6">
                      <h4 className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                        <div className="w-1 h-1 bg-rojo-sangre rotate-45" />
                        {subName}
                      </h4>
                      <div className="overflow-x-auto rounded-[4px] border border-oro/10 ninja-table-container backdrop-blur-md">
                        <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                          <thead>
                            <tr className="ninja-table-header text-[10px] font-black uppercase tracking-[0.2em] text-oro border-b border-oro/15">
                              <th className="py-4 px-6 w-[35%]">Técnica</th>
                              <th className="py-4 px-6 w-[15%] text-center">Rango</th>
                              <th className="py-4 px-6 w-[35%]">Requisitos</th>
                              <th className="py-4 px-6 w-[15%] text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-oro/5 ninja-table-body">
                            {items.map((pt: PersonajeTecnica, idx: number) => (
                              <tr key={`${pt.tecnica_id}-${idx}`} className="hover:bg-oro/[0.02] transition-colors">
                                <td className="py-4 px-6">
                                  <div className="flex flex-col">
                                    <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base">
                                      {pt.info_glosario?.nombre_es}
                                    </span>
                                    {pt.info_glosario?.nombre_jp && (
                                      <span className="text-[10px] text-oro/30 uppercase font-black tracking-tighter mt-0.5">
                                        {pt.info_glosario?.nombre_jp}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className="inline-block px-2.5 py-1 bg-oro/5 border border-oro/20 text-oro text-xs font-black rounded-sm">
                                    {pt.info_glosario?.requisitos?.rango || 'D'}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  {renderRequisitos(pt.info_glosario?.requisitos)}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  {(isEditing || isNew) && (
                                    <button 
                                      onClick={() => {
                                        const isNewlyAdded = !pt.id;
                                        if (isEditing || isNew) {
                                          if (isNewlyAdded) {
                                            if (pt.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pt.info_glosario.coste_exp);
                                            if (pt.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pt.info_glosario.coste_ryous);
                                            if (pt.info_glosario?.requisitos?.combates) onUpdateField('puntos_combate', (character.puntos_combate || 0) + pt.info_glosario.requisitos.combates);
                                          }
                                          onUpdateField('personajes_tecnicas', character.personajes_tecnicas?.filter((t: PersonajeTecnica) => t.tecnica_id !== pt.tecnica_id));
                                        } else {
                                          onQuickRemoveTechnique?.(pt);
                                        }
                                      }} 
                                      className="text-rojo-sangre/60 p-2 hover:bg-rojo-sangre/10 hover:text-rojo-sangre transition-all rounded-[3px]"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(canEdit || isNew) && (isEditing || isNew) && (
                <div className="mt-12 pt-12 border-t border-oro/10">
                  <SearchableSelect 
                    label="APRENDER NUEVA TÉCNICA" 
                    placeholder="BUSCAR JUTSU EN EL GLOSARIO..."
                    options={(glosarioFiltrado || [])
                      .filter((i: Glosario) => i.categoria_id === 1 && meetsRequirements(i) && !(character.personajes_tecnicas || []).some((pt: PersonajeTecnica) => pt.tecnica_id === i.id))
                      .map((t: any) => {
                        const subData = t.info_glosario_subcategorias;
                        const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'TÉCNICA';
                        const pcCostText = ` / ${t.requisitos?.combates || 0} PC`;
                        return { 
                          label: `${t.nombre_es} (${subName}) — ${t.coste_exp} EXP / ${t.coste_ryous} RYOUS${pcCostText}`, 
                          value: t.id 
                        };
                      })
                    } 
                    onChange={(v) => {
                      const tec = (glosarioFiltrado || []).find((t: any) => t.id === Number(v));
                      const current = character.personajes_tecnicas || [];
                      
                      if (tec && !current.some((t: any) => t.tecnica_id === tec.id)) {
                        const costExp = tec.coste_exp || 0;
                        const costRyous = tec.coste_ryous || 0;
                        const costPC = tec.requisitos?.combates || 0;
                        const currentExp = character.xp || 0;
                        const currentRyous = character.ryous || 0;
                        const currentPC = character.puntos_combate || 0;

                        if (currentExp < costExp || currentRyous < costRyous || currentPC < costPC) {
                          addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPC} P. COMBATE.`, "error");
                          return;
                        }

                        onUpdateField('personajes_tecnicas', [...current, { tecnica_id: tec.id, info_glosario: tec }]);
                        if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                        if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                        if (costPC > 0) onUpdateField('puntos_combate', currentPC - costPC);
                      }
                    }} 
                  />
                </div>
              )}
            </SectionCard>

            {/* SECCIÓN 2: HABILIDADES PASIVAS */}
            <SectionCard title="HABILIDADES PASIVAS" icon={ScrollText} color="oro">
              {Object.keys(pasivasGrouped).length === 0 ? (
                <div className="py-12 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
                  No tienes habilidades pasivas
                </div>
              ) : (
                <div className="space-y-10">
                  {Object.entries(pasivasGrouped).map(([subName, items]: [string, any]) => (
                    <div key={subName} className="space-y-6">
                      <h4 className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                        <div className="w-1 h-1 bg-rojo-sangre rotate-45" />
                        {subName}
                      </h4>
                      <div className="overflow-x-auto rounded-[4px] border border-oro/10 ninja-table-container backdrop-blur-md">
                        <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                          <thead>
                            <tr className="ninja-table-header text-[10px] font-black uppercase tracking-[0.2em] text-oro border-b border-oro/15">
                              <th className="py-4 px-6 w-[35%]">Habilidad Pasiva</th>
                              <th className="py-4 px-6 w-[15%] text-center">Rango</th>
                              <th className="py-4 px-6 w-[35%]">Requisitos</th>
                              <th className="py-4 px-6 w-[15%] text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-oro/5 ninja-table-body">
                            {items.map((pt: PersonajeTecnica, idx: number) => (
                              <tr key={`${pt.tecnica_id}-${idx}`} className="hover:bg-oro/[0.02] transition-colors">
                                <td className="py-4 px-6">
                                  <div className="flex flex-col">
                                    <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base">
                                      {pt.info_glosario?.nombre_es}
                                    </span>
                                    {pt.info_glosario?.nombre_jp && (
                                      <span className="text-[10px] text-oro/30 uppercase font-black tracking-tighter mt-0.5">
                                        {pt.info_glosario?.nombre_jp}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className="inline-block px-2.5 py-1 bg-oro/5 border border-oro/20 text-oro text-xs font-black rounded-sm">
                                    {pt.info_glosario?.requisitos?.rango || 'D'}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  {renderRequisitos(pt.info_glosario?.requisitos)}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  {(isEditing || isNew) && (
                                    <button 
                                      onClick={() => {
                                        const isNewlyAdded = !pt.id;
                                        if (isEditing || isNew) {
                                          if (isNewlyAdded) {
                                            if (pt.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pt.info_glosario.coste_exp);
                                            if (pt.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pt.info_glosario.coste_ryous);
                                            if (pt.info_glosario?.requisitos?.combates) onUpdateField('puntos_combate', (character.puntos_combate || 0) + pt.info_glosario.requisitos.combates);
                                          }
                                          onUpdateField('personajes_tecnicas', character.personajes_tecnicas?.filter((t: PersonajeTecnica) => t.tecnica_id !== pt.tecnica_id));
                                        } else {
                                          onQuickRemoveTechnique?.(pt);
                                        }
                                      }} 
                                      className="text-rojo-sangre/60 p-2 hover:bg-rojo-sangre/10 hover:text-rojo-sangre transition-all rounded-[3px]"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(canEdit || isNew) && (isEditing || isNew) && (
                <div className="mt-12 pt-12 border-t border-oro/10">
                  <SearchableSelect 
                    label="APRENDER NUEVA PASIVA" 
                    placeholder="BUSCAR HABILIDAD PASIVA EN EL GLOSARIO..."
                    options={(glosarioFiltrado || [])
                      .filter((i: Glosario) => i.categoria_id === 4 && meetsRequirements(i) && !(character.personajes_tecnicas || []).some((pt: PersonajeTecnica) => pt.tecnica_id === i.id))
                      .map((t: any) => {
                        const subData = t.info_glosario_subcategorias;
                        const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'PASIVA';
                        const pcCostText = ` / ${t.requisitos?.combates || 0} PC`;
                        return { 
                          label: `${t.nombre_es} (${subName}) — ${t.coste_exp} EXP / ${t.coste_ryous} RYOUS${pcCostText}`, 
                          value: t.id 
                        };
                      })
                    } 
                    onChange={(v) => {
                      const tec = (glosarioFiltrado || []).find((t: any) => t.id === Number(v));
                      const current = character.personajes_tecnicas || [];
                      
                      if (tec && !current.some((t: any) => t.tecnica_id === tec.id)) {
                        const costExp = tec.coste_exp || 0;
                        const costRyous = tec.coste_ryous || 0;
                        const costPC = tec.requisitos?.combates || 0;
                        const currentExp = character.xp || 0;
                        const currentRyous = character.ryous || 0;
                        const currentPC = character.puntos_combate || 0;

                        if (currentExp < costExp || currentRyous < costRyous || currentPC < costPC) {
                          addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPC} P. COMBATE.`, "error");
                          return;
                        }

                        onUpdateField('personajes_tecnicas', [...current, { tecnica_id: tec.id, info_glosario: tec }]);
                        if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                        if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                        if (costPC > 0) onUpdateField('puntos_combate', currentPC - costPC);
                      }
                    }} 
                  />
                </div>
              )}
            </SectionCard>

            {/* SECCIÓN 3: INVOCACIONES Y KUCHIYOSES */}
            <SectionCard title="INVOCACIONES Y KUCHIYOSES" icon={Swords} color="oro">
              {Object.keys(kuchiyosesGrouped).length === 0 ? (
                <div className="py-12 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
                  No tienes ningún pacto kuchiyose
                </div>
              ) : (
                <div className="space-y-10">
                  {Object.entries(kuchiyosesGrouped).map(([subName, items]: [string, any]) => (
                    <div key={subName} className="space-y-6">
                      <h4 className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                        <div className="w-1 h-1 bg-rojo-sangre rotate-45" />
                        {subName}
                      </h4>
                      <div className="overflow-x-auto rounded-[4px] border border-oro/10 ninja-table-container backdrop-blur-md">
                        <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                          <thead>
                            <tr className="ninja-table-header text-[10px] font-black uppercase tracking-[0.2em] text-oro border-b border-oro/15">
                              <th className="py-4 px-6 w-[35%]">Invocación / Kuchiyose</th>
                              <th className="py-4 px-6 w-[15%] text-center">Rango</th>
                              <th className="py-4 px-6 w-[35%]">Requisitos</th>
                              <th className="py-4 px-6 w-[15%] text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-oro/5 ninja-table-body">
                            {items.map((pt: PersonajeTecnica, idx: number) => (
                              <tr key={`${pt.tecnica_id}-${idx}`} className="hover:bg-oro/[0.02] transition-colors">
                                <td className="py-4 px-6">
                                  <div className="flex flex-col">
                                    <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base">
                                      {pt.info_glosario?.nombre_es}
                                    </span>
                                    {pt.info_glosario?.nombre_jp && (
                                      <span className="text-[10px] text-oro/30 uppercase font-black tracking-tighter mt-0.5">
                                        {pt.info_glosario?.nombre_jp}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className="inline-block px-2.5 py-1 bg-oro/5 border border-oro/20 text-oro text-xs font-black rounded-sm">
                                    {pt.info_glosario?.requisitos?.rango || 'D'}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  {renderRequisitos(pt.info_glosario?.requisitos)}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  {(isEditing || isNew) && (
                                    <button 
                                      onClick={() => {
                                        const isNewlyAdded = !pt.id;
                                        if (isEditing || isNew) {
                                          if (isNewlyAdded) {
                                            if (pt.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pt.info_glosario.coste_exp);
                                            if (pt.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pt.info_glosario.coste_ryous);
                                            if (pt.info_glosario?.requisitos?.combates) onUpdateField('puntos_combate', (character.puntos_combate || 0) + pt.info_glosario.requisitos.combates);
                                          }
                                          onUpdateField('personajes_tecnicas', character.personajes_tecnicas?.filter((t: PersonajeTecnica) => t.tecnica_id !== pt.tecnica_id));
                                        } else {
                                          onQuickRemoveTechnique?.(pt);
                                        }
                                      }} 
                                      className="text-rojo-sangre/60 p-2 hover:bg-rojo-sangre/10 hover:text-rojo-sangre transition-all rounded-[3px]"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(canEdit || isNew) && (isEditing || isNew) && (
                <div className="mt-12 pt-12 border-t border-oro/10">
                  <SearchableSelect 
                    label="INVOCAR KUCHIYOSE" 
                    placeholder="BUSCAR KUCHIYOSE EN EL GLOSARIO..."
                    options={(glosarioFiltrado || [])
                      .filter((i: Glosario) => i.categoria_id === 3 && meetsRequirements(i) && !(character.personajes_tecnicas || []).some((pt: PersonajeTecnica) => pt.tecnica_id === i.id))
                      .map((t: any) => {
                        const subData = t.info_glosario_subcategorias;
                        const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'KUCHIYOSE';
                        const pcCostText = ` / ${t.requisitos?.combates || 0} PC`;
                        return { 
                          label: `${t.nombre_es} (${subName}) — ${t.coste_exp} EXP / ${t.coste_ryous} RYOUS${pcCostText}`, 
                          value: t.id 
                        };
                      })
                    } 
                    onChange={(v) => {
                      const tec = (glosarioFiltrado || []).find((t: any) => t.id === Number(v));
                      const current = character.personajes_tecnicas || [];
                      
                      if (tec && !current.some((t: any) => t.tecnica_id === tec.id)) {
                        const costExp = tec.coste_exp || 0;
                        const costRyous = tec.coste_ryous || 0;
                        const costPC = tec.requisitos?.combates || 0;
                        const currentExp = character.xp || 0;
                        const currentRyous = character.ryous || 0;
                        const currentPC = character.puntos_combate || 0;

                        if (currentExp < costExp || currentRyous < costRyous || currentPC < costPC) {
                          addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPC} P. COMBATE.`, "error");
                          return;
                        }

                        onUpdateField('personajes_tecnicas', [...current, { tecnica_id: tec.id, info_glosario: tec }]);
                        if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                        if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                        if (costPC > 0) onUpdateField('puntos_combate', currentPC - costPC);
                      }
                    }} 
                  />
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'onrol' && (
          <div className="space-y-8 animate-fade-in">
            <SectionCard title="DATOS PERSONALES" icon={User} color="oro">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataField label="EDAD" value={character.edad} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('edad', Number(v))} />
                <SelectField label="SEXO" value={character.sexo} options={['MASCULINO', 'FEMENINO', 'OTRO']} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('sexo', v)} />
              </div>
            </SectionCard>
             
            <SectionCard title="DESCRIPCIÓN FÍSICA Y APARIENCIA" icon={Sword} color="oro" headerAction={!isNew && canEdit && isEditing && <button onClick={()=>onSave('apariencia')} className="px-8 py-3 bg-oro text-rojo-sangre text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-xl shadow-oro/20" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>SINCRONIZAR DISCORD</button>}>
              <textarea 
                value={character.apariencia} 
                disabled={!isEditing && !isNew} 
                onChange={(e)=>onUpdateField('apariencia', e.target.value)} 
                className="w-full h-80 bg-black/40 border border-oro/10 p-10 text-oro/80 italic text-xl xl:text-2xl leading-relaxed outline-none focus:border-oro/40 transition-all disabled:opacity-80 resize-none" 
                placeholder="DESCRIBE LOS RASGOS, VESTIMENTA Y MARCAS DE TU SHINOBI..." 
                style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
              />
            </SectionCard>
            <SectionCard title="HISTORIA Y CRÓNICA NINJA" icon={ScrollText} color="oro" headerAction={!isNew && canEdit && isEditing && <button onClick={()=>onSave('historia')} className="px-8 py-3 bg-oro text-rojo-sangre text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-xl shadow-oro/20" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>SINCRONIZAR DISCORD</button>}>
              <textarea 
                value={character.historia} 
                disabled={!isEditing && !isNew} 
                onChange={(e)=>onUpdateField('historia', e.target.value)} 
                className="w-full h-[600px] bg-black/40 border border-oro/10 p-10 text-oro/80 text-xl xl:text-2xl leading-relaxed outline-none focus:border-oro/40 transition-all disabled:opacity-80 resize-none" 
                placeholder="RELATA LOS ORÍGENES, MOTIVACIONES Y EL CAMINO NINJA DE TU PERSONAJE..." 
                style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
              />
            </SectionCard>
          </div>
        )}

        {activeTab === 'registros' && (
          <div className="space-y-8 animate-fade-in">
            <ResourceDisplay character={character} totalExp={totalExp} totalRyous={totalRyous} totalPuntosCombate={totalPuntosCombate} xpLimitUsage={masters?.xpLimitUsage} />
            <MissionCounter counts={missionCounts} />
            
            {/* Header Row: Subtabs Buttons & Filters */}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8">
              
              {/* Left Side: Subtabs Buttons (exactly styled like the main sheet tabs menu) */}
              <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {(['mision', 'accion', 'combate'] as const).map(tab => {
                  const Icon = tab === 'mision' ? ScrollText : tab === 'combate' ? Swords : Zap;
                  const isActive = registroTab === tab;
                  
                  return (
                    <button 
                      key={tab} 
                      onClick={() => {
                        setRegistroTab(tab);
                        setRecordPage(1);
                      }}
                      className={`px-8 sm:px-12 py-4 text-[11px] xl:text-sm font-black uppercase tracking-widest transition-all duration-300 border ninja-clip-sm shrink-0 relative group flex items-center gap-4 ${
                        isActive 
                        ? 'bg-oro text-rojo-sangre border-oro shadow-[0_0_30px_rgba(255,230,159,0.5)]' 
                        : 'bg-black/60 text-oro/30 border-oro/10 hover:border-oro/60 hover:text-oro hover:bg-black/90'
                      }`}
                    >
                      <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110 text-rojo-sangre' : 'group-hover:scale-125 text-oro/30 group-hover:text-oro'}`} />
                      <span>{tab === 'mision' ? 'MISIONES' : tab === 'combate' ? 'COMBATES' : 'ACCIONES'}</span>
                      {!isActive && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-oro transition-all duration-300 group-hover:w-[80%]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Side: Sleek Date Filters */}
              <div 
                className="flex flex-wrap items-center gap-4 sm:gap-6 py-2.5 px-6 bg-black/40 border border-oro/10 relative overflow-hidden"
                style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
              >
                {/* Decorative golden details matching theme */}
                <div className="absolute top-0 right-0 w-8 h-8 bg-oro/5 rotate-45 -mr-4 -mt-4 pointer-events-none" />

                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-oro/40 uppercase tracking-[0.2em]">DESDE</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setRecordPage(1);
                    }}
                    className="ninja-input py-1 px-3 text-xs bg-black/20 border-oro/15 focus:border-oro/30"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-oro/40 uppercase tracking-[0.2em]">HASTA</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setRecordPage(1);
                    }}
                    className="ninja-input py-1 px-3 text-xs bg-black/20 border-oro/15 focus:border-oro/30"
                  />
                </div>
                {(startDate || endDate) && (
                  <button 
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setRecordPage(1);
                    }}
                    className="text-[9px] font-black text-rojo-sangre uppercase tracking-[0.2em] hover:brightness-125 transition-all border-b border-rojo-sangre/30 pb-0.5"
                  >
                    LIMPIAR FILTROS
                  </button>
                )}
              </div>

            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {(() => {
                const records = allRegistros.filter(r => {
                  if (registroTab === 'mision') return r.tipo === 'mision';
                  if (registroTab === 'combate') return r.tipo === 'combate';
                  return r.tipo === 'accion';
                });

                // Filter by date if applicable
                const filteredRecords = records.filter((r: any) => {
                  const date = r.registros?.fecha || r.fecha;
                  if (!date) return true;
                  const d = new Date(date).getTime();
                  if (startDate && d < new Date(startDate).getTime()) return false;
                  if (endDate && d > new Date(endDate).getTime()) return false;
                  return true;
                });

                // Paginate
                const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
                const currentRecords = filteredRecords.slice((recordPage - 1) * recordsPerPage, recordPage * recordsPerPage);

                if (currentRecords.length === 0) {
                  return (
                    <div className="py-32 text-center ninja-card-oro">
                      <p className="text-oro/20 font-black uppercase tracking-[0.4em] text-xl">Sin registros en esta categoría</p>
                    </div>
                  );
                }

                if (registroTab === 'mision') {
                  const misionesList = currentRecords.map((r: any) => r.registros || r);
                  return (
                    <div className="space-y-12">
                      <MissionTable 
                        misiones={misionesList}
                        onRefresh={onRefresh}
                        onEdit={(reg) => setEditingRegistro(reg)}
                        isAdmin={isAdmin}
                        subjectId={character.id}
                      />

                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-10 pt-10 border-t border-oro/10">
                          <button 
                            onClick={() => setRecordPage(prev => Math.max(1, prev - 1))}
                            disabled={recordPage === 1}
                            className="p-4 ninja-btn-oro"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <span className="text-xs xl:text-sm font-black text-oro uppercase tracking-[0.4em] italic">
                            PÁGINA <span className="text-oro/40">{recordPage}</span> DE <span className="text-oro/40">{totalPages}</span>
                          </span>
                          <button 
                            onClick={() => setRecordPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={recordPage === totalPages}
                            className="p-4 ninja-btn-oro"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                if (registroTab === 'accion') {
                  const accionesList = currentRecords.map((r: any) => r.registros || r);
                  return (
                    <div className="space-y-12">
                      <ActionTable 
                        acciones={accionesList}
                        onRefresh={onRefresh}
                        onEdit={(reg) => setEditingRegistro(reg)}
                        isAdmin={isAdmin}
                        subjectId={character.id}
                      />

                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-10 pt-10 border-t border-oro/10">
                          <button 
                            onClick={() => setRecordPage(prev => Math.max(1, prev - 1))}
                            disabled={recordPage === 1}
                            className="p-4 ninja-btn-oro"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <span className="text-xs xl:text-sm font-black text-oro uppercase tracking-[0.4em] italic">
                            PÁGINA <span className="text-oro/40">{recordPage}</span> DE <span className="text-oro/40">{totalPages}</span>
                          </span>
                          <button 
                            onClick={() => setRecordPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={recordPage === totalPages}
                            className="p-4 ninja-btn-oro"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                if (registroTab === 'combate') {
                  const combatesList = currentRecords.map((r: any) => r.registros || r);
                  return (
                    <div className="space-y-12">
                      <CombatTable 
                        combates={combatesList}
                        onRefresh={onRefresh}
                        onEdit={(reg) => setEditingRegistro(reg)}
                        isAdmin={isAdmin}
                        subjectId={character.id}
                      />

                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-10 pt-10 border-t border-oro/10">
                          <button 
                            onClick={() => setRecordPage(prev => Math.max(1, prev - 1))}
                            disabled={recordPage === 1}
                            className="p-4 ninja-btn-oro"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>
                          <span className="text-xs xl:text-sm font-black text-oro uppercase tracking-[0.4em] italic">
                            PÁGINA <span className="text-oro/40">{recordPage}</span> DE <span className="text-oro/40">{totalPages}</span>
                          </span>
                          <button 
                            onClick={() => setRecordPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={recordPage === totalPages}
                            className="p-4 ninja-btn-oro"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-12">
                    <div className="grid grid-cols-1 gap-8 xl:gap-12">
                      {currentRecords.map((r: any) => (
                        <RegistroCard 
                          key={r.id} 
                          registro={r.registros || r} 
                          onRefresh={onRefresh}
                          onEdit={(reg) => setEditingRegistro(reg)}
                          isAdmin={isAdmin}
                          subjectId={character.id}
                        />
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-10 pt-10 border-t border-oro/10">
                        <button 
                          onClick={() => setRecordPage(prev => Math.max(1, prev - 1))}
                          disabled={recordPage === 1}
                          className="p-4 ninja-btn-oro"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <span className="text-xs xl:text-sm font-black text-oro uppercase tracking-[0.4em] italic">
                          PÁGINA <span className="text-oro/40">{recordPage}</span> DE <span className="text-oro/40">{totalPages}</span>
                        </span>
                        <button 
                          onClick={() => setRecordPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={recordPage === totalPages}
                          className="p-4 ninja-btn-oro"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        {editingRegistro && mounted && createPortal(
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center items-start sm:items-center animate-in fade-in duration-300">
            <div className="w-full max-w-4xl my-auto">
              {editingRegistro.tipo === 'combate' ? (
                <CombatForm 
                  initialData={editingRegistro} 
                  onCreated={() => { setEditingRegistro(null); onRefresh ? onRefresh() : window.location.reload(); }} 
                />
              ) : (
                <MissionForm 
                  initialData={editingRegistro} 
                  onCreated={() => { setEditingRegistro(null); onRefresh ? onRefresh() : window.location.reload(); }} 
                  initialType={editingRegistro.tipo as any}
                />
              )}
            </div>
          </div>,
          document.body
        )}
        {editingImageKey && mounted && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg ninja-card-oro p-8 space-y-6 relative overflow-hidden" style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}>
              {/* Decoración de fondo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="flex items-center justify-between relative z-10">
                <h3 className="text-xl font-black text-oro uppercase tracking-[0.3em] flex items-center gap-4 italic">
                  <ImageIcon className="w-6 h-6" />
                  {editingImageKey === 'character' ? 'Apariencia del Ninja' : 'Imagen de Jugador'}
                </h3>
                <button 
                  onClick={() => setEditingImageKey(null)}
                  className="text-oro/40 hover:text-oro transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <p className="text-oro/60 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  {editingImageKey === 'character' 
                    ? 'Introduce la URL de la imagen para este personaje. Se recomienda una relación de aspecto 3:4.' 
                    : 'Introduce la URL de la imagen de perfil del jugador.'}
                </p>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-oro/20 group-focus-within:text-oro transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" 
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="w-full bg-black/60 border border-oro/20 text-oro p-4 pl-12 text-sm focus:outline-none focus:border-oro transition-all selection:bg-oro/20"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 relative z-10">
                <button 
                  onClick={() => setEditingImageKey(null)}
                  className="flex-1 px-6 py-4 bg-black/40 border border-oro/10 text-oro/60 text-xs font-black uppercase tracking-widest hover:bg-black/60 hover:text-oro transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    const finalVal = imageUrlInput.trim() || null;
                    if (isEditing) {
                      if (editingImageKey === 'character') {
                        onUpdateField('url_img', finalVal);
                      } else {
                        const currentProfile = Array.isArray(character.profiles) ? character.profiles[0] : character.profiles;
                        const updatedProfile = { ...currentProfile, url_img: finalVal };
                        onUpdateField('profiles', Array.isArray(character.profiles) ? [updatedProfile] : updatedProfile);
                      }
                      setEditingImageKey(null);
                    } else {
                      try {
                        if (editingImageKey === 'character') {
                          await CharacterService.updateCharacter(character.id, { url_img: finalVal });
                        } else {
                          const userId = Array.isArray(character.profiles) ? character.profiles[0]?.id : character.profiles?.id;
                          const finalUserId = userId || character.user_id;
                          if (finalUserId) {
                            await ProfileService.updateProfile(finalUserId, { url_img: finalVal });
                          } else {
                            throw new Error("No user ID associated with the profile.");
                          }
                        }
                        
                        addToast("Imagen actualizada correctamente.", "success");
                        
                        if (onRefresh) {
                          onRefresh();
                        } else {
                          window.location.reload();
                        }
                      } catch (err) {
                        console.error("Error al actualizar la imagen:", err);
                        addToast("Hubo un error al guardar la imagen.", "error");
                      } finally {
                        setEditingImageKey(null);
                      }
                    }
                  }}
                  className="flex-1 px-6 py-4 ninja-btn-oro text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <Save className="w-4 h-4" />
                  <span>Aplicar</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </main>
    </div>
  );
}

