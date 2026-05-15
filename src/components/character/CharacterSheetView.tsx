'use client';

import { 
  User, Briefcase, Zap, Save, ArrowLeft, 
  Sword, Swords, ScrollText, GitBranch, UserCircle, X, Heart, Trash2, Edit3, ShoppingBag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataField, SelectField, SearchableSelect } from '@/components/ui/Fields';
import { Character, CharacterStats, Glosario, PersonajeItem, PersonajeTecnica, Registro } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import RegistroCard from '@/components/registros/RegistroCard';
import MissionForm from '@/components/registros/MissionForm';
import CombatForm from '@/components/registros/CombatForm';
import { useState, useMemo } from 'react';

interface CharacterSheetViewProps {
  character: Character;
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

  // Cálculos Memoizados para evitar trabajo redundante en cada render
  const { allRegistros, totalExp, totalRyous, missionCounts } = useMemo(() => {
    const allRegistrosMap = new Map<number, Registro>();
    [
      ...(character.registros_autor || []),
      ...(character.registros_participante?.map((p: any) => p.registro).filter(Boolean) || [])
    ].forEach((r: Registro) => allRegistrosMap.set(r.id, r));
    
    const allRegs = Array.from(allRegistrosMap.values()).sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    const missions = allRegs.filter(r => r.tipo === 'mision');

    const totalExpSpent = allRegs.reduce((sum, r) => sum + (r.data?.gasto_xp || 0), 0);
    const totalRyousSpent = allRegs.reduce((sum, r) => sum + (r.data?.gasto_ryous || 0), 0);

    return {
      allRegistros: allRegs,
      totalExp: (character.xp || 0) + totalExpSpent,
      totalRyous: (character.ryous || 0) + totalRyousSpent,
      missionCounts: {
        D: missions.filter(m => m.subtipo === 'D').length,
        C: missions.filter(m => m.subtipo === 'C').length,
        B: missions.filter(m => m.subtipo === 'B').length,
        A: missions.filter(m => m.subtipo === 'A').length,
        S: missions.filter(m => m.subtipo === 'S').length,
      }
    };
  }, [character.xp, character.ryous, character.registros_autor, character.registros_participante]);

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

    // 4. Combates
    if (req.combates) {
      const reqCombates = Number(req.combates);
      if (!isNaN(reqCombates) && reqCombates > 0) {
        const charCombates = (allRegistros || []).filter(r => r.tipo === 'combate').length;
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
      const reqPId = Number(req.personaje_id);
      if (!isNaN(reqPId) && reqPId > 0) {
        if (Number(character.id) !== reqPId) return false;
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

  // Memoizar las técnicas agrupadas
  const groupedTecnicas = useMemo(() => {
    return (character.personajes_tecnicas || []).reduce((acc: Record<string, Record<string, PersonajeTecnica[]>>, pt: PersonajeTecnica) => {
      // Soporte tanto para objeto directo como para array de Supabase
      const catData = pt.info_glosario?.info_glosario_categorias;
      const subData = pt.info_glosario?.info_glosario_subcategorias;

      const cat = (Array.isArray(catData) ? catData[0]?.nombre : catData?.nombre) || 'General';
      const sub = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'Otros';

      if (!acc[cat]) acc[cat] = {};
      if (!acc[cat][sub]) acc[cat][sub] = [];
      acc[cat][sub].push(pt);
      return acc;
    }, {});
  }, [character.personajes_tecnicas]);

  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null);
  const [registroTab, setRegistroTab] = useState<'mision' | 'accion' | 'combate'>('mision');
  const [recordPage, setRecordPage] = useState(1);
  const recordsPerPage = 5;
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

// Componentes Helper fuera del render principal para evitar re-montajes
const ResourceDisplay = ({ character, totalExp, totalRyous }: { character: Character, totalExp: number, totalRyous: number }) => (
  <div className="flex flex-wrap items-center gap-8 mb-12">
    <div className="flex items-center gap-6 px-10 py-6 ninja-card-oro group hover-ninja">
      <div className="w-12 h-12 bg-rojo-sangre rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(103,9,9,0.5)]">
        <span className="text-oro font-black -rotate-45 text-xl italic">¥</span>
      </div>
      <div>
        <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.3em] mb-2">RYOUS (DISPONIBLE / TOTAL)</p>
        <p className="text-2xl xl:text-4xl font-black text-oro leading-none">
          {new Intl.NumberFormat('es-ES').format(character.ryous || 0)}
          <span className="text-oro/20 mx-4">/</span>
          <span className="text-oro/60 text-lg xl:text-2xl">{new Intl.NumberFormat('es-ES').format(totalRyous)}</span>
        </p>
      </div>
    </div>
    <div className="flex items-center gap-6 px-10 py-6 ninja-card-oro group hover-ninja">
      <div className="w-12 h-12 bg-oro rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(255,230,159,0.3)]">
        <span className="text-rojo-sangre font-black -rotate-45 text-sm italic">XP</span>
      </div>
      <div>
        <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.3em] mb-2">EXPERIENCIA (DISPONIBLE / TOTAL)</p>
        <p className="text-2xl xl:text-4xl font-black text-oro leading-none">
          {new Intl.NumberFormat('es-ES').format(character.xp || 0)}
          <span className="text-oro/20 mx-4">/</span>
          <span className="text-oro/60 text-lg xl:text-2xl">{new Intl.NumberFormat('es-ES').format(totalExp)}</span>
        </p>
      </div>
    </div>
  </div>
);

const MissionCounter = ({ counts }: { counts: Record<string, number> }) => (
  <div className="space-y-8 mb-16">
    <div className="flex items-center gap-4">
      <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 h-auto" alt="icon" />
      <h3 className="text-xs xl:text-sm font-black text-oro uppercase tracking-[0.4em]">Historial de Misiones</h3>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
      {Object.entries(counts).map(([rank, count]) => (
        <div key={rank} className="ninja-card-oro p-6 text-center group hover-ninja transition-all">
          <p className="text-[10px] font-black text-oro/40 uppercase tracking-widest mb-3">RANGO {rank}</p>
          <p className="text-3xl xl:text-5xl font-black text-oro italic leading-none">{count}</p>
        </div>
      ))}
    </div>
  </div>
);


  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-20 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto mb-10 sm:mb-16 ninja-card-oro p-4 sm:p-8 xl:p-10 z-50">
        <div className="flex flex-col lg:flex-row justify-between items-center lg:items-center gap-6 lg:gap-10">
          
          {/* Top Row: Back Button & Actions (Mobile) / Left Side (Desktop) */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-6">
            <button onClick={onBack} className="flex items-center gap-3 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-[10px] sm:text-xs xl:text-lg shrink-0">
              <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
              <span>VOLVER</span>
            </button>

            {/* Title (Mobile) */}
            <div className="lg:hidden text-center flex-1 min-w-0">
              <h1 className="ninja-title text-2xl sm:text-3xl truncate px-2">
                {character.nombre_ninja || (isNew ? 'NUEVO SHINOBI' : '')}
              </h1>
            </div>

            {/* Mobile Actions Container (Optional if we want buttons here) */}
            <div className="lg:hidden flex items-center gap-2">
              {!isNew && canEdit && onDelete && (
                <button onClick={onDelete} className="p-2 text-rojo-sangre" title="Borrar">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Title & Info (Desktop) */}
          <div className="hidden lg:flex items-center gap-10 flex-1 justify-center">
            <div className="h-10 w-px bg-oro/10" />
            <div className="text-center">
              <h1 className="ninja-title text-5xl xl:text-7xl break-words">
                {character.nombre_ninja || (isNew ? 'NUEVO SHINOBI' : '')}
              </h1>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="text-[10px] xl:text-xs font-black text-oro/60 uppercase tracking-[0.3em]">{character.rango_jerarquico}</span>
                <div className="w-1 h-1 bg-rojo-sangre rotate-45 shrink-0" />
                <span className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.3em]">{aldeaObj?.nombre_completo || character.aldeas?.nombre_completo || 'SIN ALDEA'}</span>
              </div>
            </div>
            <div className="h-10 w-px bg-oro/10" />
          </div>

          {/* Info (Mobile) */}
          <div className="lg:hidden w-full flex justify-center gap-4 py-2 border-y border-oro/5">
             <span className="text-[9px] font-black text-oro/60 uppercase tracking-[0.2em]">{character.rango_jerarquico}</span>
             <div className="w-1 h-1 bg-rojo-sangre rotate-45 self-center" />
             <span className="text-[9px] font-black text-oro/40 uppercase tracking-[0.2em]">{aldeaObj?.nombre_completo || character.aldeas?.nombre_completo || 'SIN ALDEA'}</span>
          </div>

          {/* Actions Container */}
          <div className="flex items-center gap-4 sm:gap-6 w-full lg:w-auto justify-center lg:justify-end">
            <div className="hidden lg:flex items-center gap-4">
               {!isNew && canEdit && onDelete && (
                <button 
                  onClick={onDelete}
                  className="p-4 text-rojo-sangre hover:brightness-125 transition-all"
                  title="Borrar Personaje"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              )}
            </div>
            
            {(!isNew && canEdit) && (
              <button 
                onClick={() => isEditing ? onCancel() : setIsEditing?.(true)} 
                className={`flex-1 lg:flex-none px-6 sm:px-8 py-3 text-xs sm:text-sm ${isEditing ? 'ninja-btn-oro' : 'ninja-btn-ghost'}`}
              >
                {isEditing ? 'CANCELAR' : 'EDITAR FICHA'}
              </button>
            )}
            {(isEditing || isNew) && (
              <button 
                onClick={() => onSave()} 
                disabled={saving} 
                className={`flex-1 lg:flex-none px-8 sm:px-10 py-3 sm:py-4 text-xs sm:text-sm ${isNew ? 'ninja-btn-oro' : 'ninja-btn-rojo'}`}
              >
                {isNew ? 'INICIALIZAR' : 'GUARDAR'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="flex flex-nowrap gap-4 xl:gap-8 mb-16 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-12 space-y-12">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20">
              <div className="lg:col-span-7 space-y-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
                  <h3 className="text-xs xl:text-sm font-black text-oro/60 uppercase tracking-[0.4em]">Estadísticas Base</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {['NIN', 'GEN', 'TAI', 'SM', 'FUE', 'AGI', 'EST', 'INT'].map((s) => {
                    const val = character.stats_base[s as keyof CharacterStats] || 0;
                    const max = masters.rangoRules?.[character.rango]?.stat_max || 100;
                    return (
                      <div key={s} className="bg-black/40 border border-oro/10 p-6 relative group hover:border-oro/40 transition-all text-center overflow-hidden" style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}>
                        <div className="absolute top-0 right-0 w-16 h-16 bg-oro/5 rotate-45 -mr-8 -mt-8 pointer-events-none" />
                        <span className="text-[10px] font-black text-oro/40 uppercase tracking-widest block mb-4">{s}</span>
                        <input 
                          type="number" 
                          value={val} 
                          disabled={!isEditing && !isNew}
                          onChange={(e) => onUpdateStat(s as keyof CharacterStats, parseInt(e.target.value))}
                          className="bg-transparent text-3xl xl:text-4xl font-black text-oro w-full text-center outline-none disabled:cursor-default selection:bg-oro/20"
                        />
                        <div className="text-[8px] font-black text-oro/20 mt-2 uppercase tracking-tighter">LÍMITE: {max}</div>
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
                <div className="grid grid-cols-2 gap-6">
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
        )}
        {activeTab === 'inventario' && (
          <div className="space-y-12">
            <ResourceDisplay character={character} totalExp={totalExp} totalRyous={totalRyous} />
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map((pi: PersonajeItem, idx: number) => (
                              <div key={`${pi.item_id}-${idx}`} className="bg-black/40 p-6 border border-oro/10 relative group hover:border-oro/40 transition-all flex justify-between items-center overflow-hidden" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                                <div className="absolute top-0 right-0 w-12 h-12 bg-oro/5 rotate-45 -mr-6 -mt-6 pointer-events-none" />
                                <div className="relative z-10">
                                  <p className="font-black text-oro uppercase tracking-widest text-sm xl:text-base mb-1">{pi.info_glosario?.nombre_es}</p>
                                  <p className="text-[10px] text-oro/30 uppercase font-black tracking-tighter">{pi.info_glosario?.nombre_jp || '---'}</p>
                                </div>
              
                                <div className="relative z-10 flex items-center gap-4">
                                  {(isEditing || isNew) && (
                                   <button 
                                     onClick={()=>{
                                       const isNewlyAdded = !pi.id;
                                       if (isEditing || isNew) {
                                         if (isNewlyAdded) {
                                           if (pi.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pi.info_glosario.coste_exp);
                                           if (pi.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pi.info_glosario.coste_ryous);
                                         }
                                         onUpdateField('personajes_inventario', character.personajes_inventario?.filter((i: PersonajeItem)=>i.item_id !== pi.item_id));
                                       } else {
                                         onQuickRemoveItem?.(pi);
                                       }
                                     }} 
                                     className="text-rojo-sangre/40 p-3 hover:bg-rojo-sangre/10 hover:text-rojo-sangre transition-all"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 )}
                                </div>
                              </div>
                            ))}
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
                        return { 
                          label: `${i.nombre_es} (${subName}) — ${i.coste_exp} EXP / ${i.coste_ryous} RYOUS`, 
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
                        const currentExp = character.xp || 0;
                        const currentRyous = character.ryous || 0;

                        if (currentExp < costExp || currentRyous < costRyous) {
                          addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP Y ${costRyous} RYOUS.`, "error");
                          return;
                        }

                        onUpdateField('personajes_inventario', [...current, { item_id: it.id, info_glosario: it }]);
                        if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                        if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                      }
                    }} 
                  />
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'tecnicas' && (
          <div className="space-y-12">
            <ResourceDisplay character={character} totalExp={totalExp} totalRyous={totalRyous} />
            <SectionCard title="ARTES Y JUTSUS NINJA" icon={Zap} color="oro">
              <div className="space-y-16">
                {Object.entries(groupedTecnicas).map(([catName, subs]: [string, any]) => (
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map((pt: PersonajeTecnica, idx: number) => (
                              <div key={`${pt.tecnica_id}-${idx}`} className="bg-black/40 p-6 border border-oro/10 relative group hover:border-oro/40 transition-all flex justify-between items-center overflow-hidden" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                                <div className="absolute top-0 right-0 w-12 h-12 bg-oro/5 rotate-45 -mr-6 -mt-6 pointer-events-none" />
                                <div className="relative z-10 flex items-center gap-6">
                                   <div className="w-12 h-12 bg-oro/5 flex items-center justify-center text-xs font-black text-oro border border-oro/20" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)' }}>
                                     {pt.info_glosario?.requisitos?.rango || 'D'}
                                   </div>
                                   <div>
                                      <p className="font-black text-oro uppercase tracking-widest text-sm xl:text-base mb-1">{pt.info_glosario?.nombre_es}</p>
                                      <p className="text-[10px] text-oro/30 uppercase font-black tracking-tighter">{pt.info_glosario?.nombre_jp || '---'}</p>
                                   </div>
                                </div>
              
                                <div className="relative z-10">
                                  {(isEditing || isNew) && (
                                     <button 
                                       onClick={()=>{
                                         const isNewlyAdded = !pt.id;
                                         if (isEditing || isNew) {
                                           if (isNewlyAdded) {
                                             if (pt.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pt.info_glosario.coste_exp);
                                             if (pt.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pt.info_glosario.coste_ryous);
                                           }
                                           onUpdateField('personajes_tecnicas', character.personajes_tecnicas?.filter((t: PersonajeTecnica)=>t.tecnica_id !== pt.tecnica_id));
                                         } else {
                                           onQuickRemoveTechnique?.(pt);
                                         }
                                       }} 
                                       className="text-rojo-sangre/40 p-3 hover:bg-rojo-sangre/10 hover:text-rojo-sangre transition-all"
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </button>
                                   )}
                                </div>
                              </div>
                            ))}
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
                    label="APRENDER NUEVA TÉCNICA" 
                    placeholder="BUSCAR JUTSU EN EL GLOSARIO..."
                    options={(glosarioFiltrado || [])
                      .filter((i: Glosario) => i.categoria_id !== 2 && meetsRequirements(i) && !(character.personajes_tecnicas || []).some((pt: PersonajeTecnica) => pt.tecnica_id === i.id))
                      .map((t: any) => {
                        const subData = t.info_glosario_subcategorias;
                        const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'TÉCNICA';
                        return { 
                          label: `${t.nombre_es} (${subName}) — ${t.coste_exp} EXP / ${t.coste_ryous} RYOUS`, 
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
                        const currentExp = character.xp || 0;
                        const currentRyous = character.ryous || 0;

                        if (currentExp < costExp || currentRyous < costRyous) {
                          addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP Y ${costRyous} RYOUS.`, "error");
                          return;
                        }

                        onUpdateField('personajes_tecnicas', [...current, { tecnica_id: tec.id, info_glosario: tec }]);
                        if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                        if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                      }
                    }} 
                  />
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === 'onrol' && (
          <div className="grid gap-12">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataField label="EDAD" value={character.edad} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('edad', Number(v))} />
                <SelectField label="SEXO" value={character.sexo} options={['MASCULINO', 'FEMENINO', 'OTRO']} disabled={!isEditing && !isNew} onChange={(v)=>onUpdateField('sexo', v)} />
             </div>
             
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
          <div className="space-y-12">
            <ResourceDisplay character={character} totalExp={totalExp} totalRyous={totalRyous} />
            <MissionCounter counts={missionCounts} />
            
            <div className="flex flex-wrap gap-4 p-3 bg-black/40 border border-oro/10 w-fit mx-auto lg:mx-0 overflow-hidden" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
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
                      className={`flex items-center gap-4 px-10 py-4 font-black uppercase tracking-[0.2em] transition-all duration-300 group text-xs xl:text-sm ninja-clip-sm border ${
                        isActive 
                        ? 'bg-oro text-rojo-sangre shadow-[0_0_25px_rgba(255,230,159,0.4)] border-oro' 
                        : 'text-oro/40 hover:text-oro hover:bg-oro/10 border-oro/10 hover:border-oro/30 hover:-translate-y-1'
                      }`}
                    >
                      <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-125 text-oro/40 group-hover:text-oro'}`} />
                      {tab === 'mision' ? 'MISIONES' : tab === 'combate' ? 'COMBATES' : 'ACCIONES'}
                    </button>
                 );
               })}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-8 p-6 sm:p-8 ninja-card-oro relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-oro/40 uppercase tracking-[0.3em]">DESDE</span>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setRecordPage(1);
                    }}
                    className="ninja-input py-2"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-oro/40 uppercase tracking-[0.3em]">HASTA</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setRecordPage(1);
                    }}
                    className="ninja-input py-2"
                  />
                </div>
                {(startDate || endDate) && (
                  <button 
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setRecordPage(1);
                    }}
                    className="text-[10px] font-black text-rojo-sangre uppercase tracking-[0.3em] hover:brightness-125 transition-all border-b border-rojo-sangre/30 pb-1"
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
        {editingRegistro && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto ninja-card-oro p-8 xl:p-12">
              <div className="flex justify-between items-center mb-10 border-b border-oro/10 pb-6">
                <h2 className="ninja-title text-3xl xl:text-5xl">Editar Registro</h2>
                <button onClick={() => setEditingRegistro(null)} className="p-4 text-oro/40 hover:text-oro transition-all"><X className="w-10 h-10" /></button>
              </div>
             
             <div className="bg-oro/5 border border-oro/10 ninja-clip-md p-8 mb-10">
               <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.3em] mb-2">Tipo de Registro</p>
               <p className="text-2xl font-black text-oro uppercase italic">{editingRegistro.tipo}</p>
             </div>
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
          </div>
        )}
      </main>
    </div>
  );
}

