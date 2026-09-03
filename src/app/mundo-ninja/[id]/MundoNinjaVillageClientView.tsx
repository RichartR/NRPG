'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, User, UserPlus, Plus, X, Search, Trash2, ChevronRight, Users, Edit } from 'lucide-react';
import Link from 'next/link';
import { NinjaSearchInput } from '@/components/character/NinjaSearchInput';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { PaginationPageInput } from '@/components/ui/PaginationPageInput';
import { PaginationContainer } from '@/components/ui/PaginationContainer';
import { createClient } from '@/utils/supabase/client';
import { useToastStore } from '@/components/ui/Toast';
import { ProfileService } from '@/services/supabase/profile.service';
import { searchAny } from '@/lib/utils/search';
import { InfoNPC } from '@/domain/types';
import NPCModal from '@/components/npc/NPCModal';
import NPCFormModal from '@/components/npc/NPCFormModal';


// ─── MemberSelector ── componente de nivel superior para evitar remounts ────
function MemberSelector({
  label,
  value,
  onSelect,
  onClear,
  getOptions,
  excludeIds,
  requireNoGenin = false,
}: {
  label: string;
  value: any;
  onSelect: (n: any) => void;
  onClear: () => void;
  getOptions: (query: string, excludeIds: number[], requireNoGenin: boolean) => any[];
  excludeIds: (number | undefined)[];
  requireNoGenin?: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce: espera 200 ms antes de filtrar
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(inputValue), 200);
    return () => clearTimeout(t);
  }, [inputValue]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = getOptions(
    debouncedQuery,
    excludeIds.filter(Boolean) as number[],
    requireNoGenin,
  );

  const handleClear = () => {
    setInputValue('');
    setDebouncedQuery('');
    onClear();
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">{label}</label>
      {value ? (
        <div className="flex items-center justify-between bg-oro/5 border border-oro/30 px-4 py-3 ninja-clip-xs">
          <div className="truncate">
            <span className="font-bold text-white text-sm">{value.nombre_ninja}</span>
            <span className="text-[10px] text-oro/40 uppercase font-black block tracking-wider">{value.rango_jerarquico}</span>
          </div>
          <button type="button" onClick={handleClear} className="text-oro/40 hover:text-naranja-naruto transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Buscar shinobi..."
            className="w-full bg-black/50 border border-oro/20 px-4 py-3 text-white focus:border-oro/50 focus:outline-none transition-colors text-sm"
          />
          <Search className="absolute right-3 top-3.5 w-4 h-4 text-oro/30 pointer-events-none" />
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-neutral-950 border border-oro/20 max-h-48 overflow-y-auto z-50 divide-y divide-oro/5">
              {options.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => { onSelect(n); setShowDropdown(false); setInputValue(''); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-oro/5 text-sm transition-colors flex justify-between items-center"
                >
                  <span className="text-white font-medium">{n.nombre_ninja}</span>
                  <span className="text-[10px] text-oro/55 uppercase font-black tracking-widest">{n.rango_jerarquico}</span>
                </button>
              ))}
              {options.length === 0 && (
                <div className="px-4 py-3 text-xs text-oro/20 italic">
                  {requireNoGenin ? 'No se encontraron shinobi elegibles (rango Chunin+)' : 'No se encontraron shinobi'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MundoNinjaVillageClientViewProps {
  id: string;
  isRenegado: boolean;
  aldea: any;
  ninjas: any[];
  maxCupos: number;
  puedeCrearFicha: boolean;
  aldeaParam: string;
  searchQuery: string;
  filteredNinjas: any[];
  paginatedNinjas: any[];
  totalPages: number;
  currentPage: number;
  searchParamSuffix: string;
  rangosJerarquicos: string[];
  initialEquipos?: any[];
}

export default function MundoNinjaVillageClientView({
  id,
  isRenegado,
  aldea,
  ninjas,
  maxCupos,
  puedeCrearFicha,
  aldeaParam,
  searchQuery,
  filteredNinjas,
  paginatedNinjas,
  totalPages,
  currentPage,
  searchParamSuffix,
  rangosJerarquicos,
  initialEquipos = [],
}: MundoNinjaVillageClientViewProps) {
  const [viewMode, setViewMode] = useState<'censo' | 'gestion'>('censo');
  // null = foro index, 'info' = tema información, 'equipos' = tema equipos, 'npc' = tema npc
  const [activeTopic, setActiveTopic] = useState<null | 'info' | 'equipos' | 'npc'>(null);

  const [equipos, setEquipos] = useState<any[]>(initialEquipos);
  const [userRole, setUserRole] = useState<{ character: any; isAdmin: boolean; canManage: boolean } | null>(null);
  const [canManageNPC, setCanManageNPC] = useState(false);

  // Estados de NPCs
  const [npcs, setNpcs] = useState<InfoNPC[]>([]);
  const [loadingNPCs, setLoadingNPCs] = useState(false);
  const [selectedNPC, setSelectedNPC] = useState<InfoNPC | null>(null);
  const [editingNPC, setEditingNPC] = useState<InfoNPC | null>(null);
  const [showNPCForm, setShowNPCForm] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [nombreEquipo, setNombreEquipo] = useState('');

  // Miembros seleccionados para el nuevo equipo
  const [lider, setLider] = useState<any>(null);
  const [int1, setInt1] = useState<any>(null);
  const [int2, setInt2] = useState<any>(null);
  const [int3, setInt3] = useState<any>(null);

  const [saving, setSaving] = useState(false);

  const addToast = useToastStore((state) => state.addToast);
  const supabase = createClient();

  const fetchNPCs = async () => {
    setLoadingNPCs(true);
    try {
      const targetAldeaId = isRenegado ? null : Number(id);
      const res = await fetch(`/api/npc?aldea_id=${targetAldeaId ?? 'null'}`);
      const resData = await res.json();
      if (res.ok && resData.data) {
        setNpcs(resData.data);
      }
    } catch (err) {
      console.error('Error al cargar NPCs:', err);
    } finally {
      setLoadingNPCs(false);
    }
  };

  useEffect(() => {
    fetchNPCs();
  }, [id, isRenegado]);

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await ProfileService.getProfile(session.user.id);
        const roles = profile?.roles || [];
        const isAdmin = roles.includes('admin');
        const myChar = ninjas.find((n) => n.user_id === session.user.id);

        setUserRole({
          character: myChar || null,
          isAdmin,
          canManage: isAdmin || !!myChar,
        });

        const canNpc = roles.includes('admin') || roles.includes('moderador') || roles.includes('mod') || roles.includes('narrador');
        setCanManageNPC(canNpc);
      }
    }
    fetchUserRole();
  }, [ninjas]);

  const handleDeleteNPC = async (npc: InfoNPC) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al NPC "${npc.name}"?`)) return;
    try {
      const res = await fetch(`/api/npc/${npc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar el NPC');
      }
      addToast('NPC eliminado exitosamente', 'success');
      setSelectedNPC(null);
      fetchNPCs();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };


  const getAvailableNinjas = (searchQuery: string, excludeIds: number[], requireNoGenin: boolean = false) => {
    return ninjas.filter(n => {
      const username = (Array.isArray(n.profiles) ? n.profiles[0]?.username : n.profiles?.username) || n.hobba_name || '';
      const notExcluded = !excludeIds.includes(n.id);
      const rankingOk = !requireNoGenin || (n.rango_jerarquico && n.rango_jerarquico.toLowerCase() !== 'genin');
      return searchAny(searchQuery, [n.nombre_ninja, username]) && notExcluded && rankingOk;
    });
  };

  const handleCreateEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreEquipo.trim()) {
      addToast('El nombre del equipo es obligatorio', 'error');
      return;
    }
    // Mínimo 2 miembros de cualquier combinación de slots
    const totalMembers = [lider, int1, int2, int3].filter(Boolean).length;
    if (totalMembers < 2) {
      addToast('El equipo necesita mínimo 2 miembros', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/equipos-ninja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_equipo: nombreEquipo,
          aldea_id: Number(id),
          lider_id: lider?.id || null,
          integrante_1_id: int1?.id || null,
          integrante_2_id: int2?.id || null,
          integrante_3_id: int3?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el equipo');
      }

      addToast('Equipo creado exitosamente', 'success');

      const { data: updatedEquipos, error } = await supabase
        .from('reg_equipos_ninja')
        .select(`
          *,
          lider:lider_id(id, nombre_ninja, profiles:user_id(username)),
          integrante_1:integrante_1_id(id, nombre_ninja, profiles:user_id(username)),
          integrante_2:integrante_2_id(id, nombre_ninja, profiles:user_id(username)),
          integrante_3:integrante_3_id(id, nombre_ninja, profiles:user_id(username))
        `)
        .eq('aldea_id', Number(id))
        .eq('activo', true)
        .order('fecha_creacion', { ascending: false });

      if (!error && updatedEquipos) {
        setEquipos(updatedEquipos);
      }

      // Reset form
      setNombreEquipo('');
      setLider(null);
      setInt1(null);
      setInt2(null);
      setInt3(null);
      setIsCreating(false);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisolverEquipo = async (equipoId: number) => {
    if (!confirm('¿Estás seguro de que deseas disolver este equipo?')) return;
    try {
      const res = await fetch(`/api/equipos-ninja/${equipoId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al disolver el equipo');
      }
      addToast('Equipo disuelto exitosamente', 'success');
      setEquipos(prev => prev.filter(e => e.id !== equipoId));
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const ranks = useMemo(() => {
    return rangosJerarquicos.length > 0
      ? rangosJerarquicos
      : ["Genin", "Chunin", "Tokubetsu Jonin", "Jonin", "Anbu", "Sannin", "Kage"];
  }, [rangosJerarquicos]);

  const groupedNinjas = useMemo(() => {
    return ranks.reduce((acc, rank) => {
      acc[rank] = ninjas.filter((n) => {
        const charRank = (n.rango_jerarquico || '').trim().toLowerCase();
        const targetRank = rank.trim().toLowerCase();
        return charRank === targetRank;
      });
      return acc;
    }, {} as Record<string, any[]>);
  }, [ranks, ninjas]);

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-[1750px] mx-auto w-full">
        <header className="mb-12 ninja-card-oro p-8 xl:p-12 relative overflow-hidden">
          {/* Imagen de fondo de la aldea */}
          {(isRenegado || aldea?.url_imagen) && (
            <div className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none scale-105">
              <img src={isRenegado ? "/assets/images/renegados.webp" : aldea.url_imagen} alt="" className="w-full h-full object-cover grayscale brightness-50" />
            </div>
          )}

          <div className="relative z-10 mb-10">
            <Breadcrumbs
              items={[
                { label: 'Inicio', href: '/' },
                { label: 'Mundo Ninja', href: '/mundo-ninja' },
                { label: isRenegado ? 'Renegados / Ninjas sin Aldea' : (aldea?.abreviatura || aldea?.nombre_completo || '') }
              ]}
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
            <div className="flex items-center gap-8">
              <div className="w-24 h-24 xl:w-32 xl:h-32 bg-black/40 border border-oro/20 ninja-clip-md overflow-hidden flex items-center justify-center shadow-2xl backdrop-blur-sm">
                {isRenegado ? (
                  <img src="/assets/images/renegados.webp" alt="Renegados" className="w-full h-full object-cover filter brightness-95" />
                ) : aldea?.url_imagen ? (
                  <img src={aldea.url_imagen} alt="" className="w-full h-full object-cover filter brightness-95" />
                ) : (
                  <MapPin className="w-12 h-12 text-oro drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]" />
                )}
              </div>
              <div>
                <h1 className="ninja-title text-4xl xl:text-7xl mb-2">
                  {isRenegado ? 'RENEGADOS' : aldea?.nombre_completo}
                </h1>
                <div className="flex items-center gap-4">
                  <span className="text-caption xl:text-xs font-black text-oro/60 uppercase tracking-[0.3em]">
                    SHINOBI REGISTRADOS
                  </span>
                  <div className="w-1 h-1 bg-oro/20 rotate-45" />
                  <span className="text-xl xl:text-2xl font-black text-oro italic leading-none">
                    {isRenegado ? ninjas.length : `${ninjas.length}/${maxCupos}`}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA de creación de ficha */}
            <div className="shrink-0">
              {puedeCrearFicha && (
                <Link
                  href={`/crear-ficha${aldeaParam}`}
                  className="flex items-center justify-center gap-4 px-10 py-5 ninja-btn-oro text-xs xl:text-sm"
                >
                  <UserPlus className="w-5 h-5" /> CREAR PERSONAJE
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="w-full space-y-8">
          {/* Cabecera de controles */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-oro/5">
            <div className="flex-1 w-full md:w-auto">
              {viewMode === 'censo' && ninjas.length > 0 && (
                <NinjaSearchInput isRenegado={isRenegado} placeholder="Buscar shinobi por nombre..." />
              )}
            </div>

            {/* Selector de modo */}
            {!isRenegado && (
              <div className="flex gap-2 bg-neutral-900/60 border border-oro/10 p-1.5 ninja-clip-xs shrink-0 w-full md:w-auto justify-center">
                <button
                  onClick={() => setViewMode('censo')}
                  className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ninja-clip-xs ${viewMode === 'censo'
                    ? 'bg-oro text-naranja-naruto shadow-lg shadow-oro/10'
                    : 'text-oro/55 hover:text-oro hover:bg-oro/5'
                    }`}
                >
                  Censo
                </button>
                <button
                  onClick={() => { setViewMode('gestion'); setActiveTopic(null); }}
                  className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ninja-clip-xs ${viewMode === 'gestion'
                    ? 'bg-oro text-naranja-naruto shadow-lg shadow-oro/10'
                    : 'text-oro/55 hover:text-oro hover:bg-oro/5'
                    }`}
                >
                  Gestión Aldea
                </button>
              </div>
            )}
          </div>

          {/* ═══════════════════════ VISTA CENSO ═══════════════════════ */}
          {viewMode === 'censo' ? (
            <>
              {searchQuery && filteredNinjas.length > 0 && (
                <div className="flex justify-end pr-2">
                  <span className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] italic">
                    Encontrados {filteredNinjas.length} de {ninjas.length} registrados
                  </span>
                </div>
              )}

              {filteredNinjas.length > 0 ? (
                <>
                  <div className="ninja-card-oro overflow-hidden border border-oro/20 bg-black/40 backdrop-blur-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-oro/10 text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.3em]">
                            <th className="py-6 px-8 w-24 whitespace-nowrap">Apariencia</th>
                            <th className="py-6 px-8 w-full whitespace-nowrap">SHINOBI</th>
                            <th className="py-6 px-8 text-center whitespace-nowrap">JERARQUÍA</th>
                            <th className="py-6 px-8 text-right whitespace-nowrap">RANGO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-oro/5">
                          {paginatedNinjas.map((ninja) => (
                            <tr key={ninja.id} className="group hover:bg-oro/5 transition-all duration-300 relative cursor-pointer">
                              <td className="py-5 px-8">
                                <div className="w-12 h-12 shrink-0 border border-oro/20 bg-black/40 overflow-hidden flex items-center justify-center ninja-clip-xs">
                                  {ninja.url_img ? (
                                    <img
                                      src={ninja.url_img}
                                      className="w-full h-full object-cover object-top"
                                      alt="Avatar"
                                    />
                                  ) : (
                                    <User className="w-6 h-6 text-oro/25" />
                                  )}
                                </div>
                              </td>
                              <td className="py-5 px-8">
                                <Link href={`/ficha/${ninja.id}`} className="block after:absolute after:inset-0 after:z-10">
                                  <p className="ninja-title text-xl xl:text-2xl group-hover:text-white transition-colors leading-tight">
                                    {ninja.nombre_ninja}
                                  </p>
                                  <p className="text-caption text-oro/30 font-black uppercase tracking-widest mt-1 italic whitespace-nowrap">
                                    {ninja.hobba_name || (Array.isArray(ninja.profiles) ? ninja.profiles[0]?.username : ninja.profiles?.username)}
                                  </p>
                                </Link>
                              </td>
                              <td className="py-5 px-8 text-center whitespace-nowrap">
                                <span className="text-caption xl:text-xs font-black text-oro/60 uppercase tracking-widest whitespace-nowrap">
                                  {ninja.rango_jerarquico || 'SIN RANGO'}
                                </span>
                              </td>
                              <td className="py-5 px-8 text-right whitespace-nowrap">
                                <span className="inline-block px-4 py-1.5 bg-oro/10 text-oro border-oro/20 text-caption xl:text-xs font-black border uppercase tracking-widest ninja-clip-xs whitespace-nowrap">
                                  RANGO {ninja.rango}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="mt-10">
                      <PaginationContainer isRenegado={isRenegado} maxWidthClass="max-w-md">
                        {currentPage > 1 ? (
                          <Link
                            href={`/mundo-ninja/${id}?page=${currentPage - 1}${searchParamSuffix}`}
                            className="px-4 py-2 border border-oro/30 hover:bg-oro/20 text-oro hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                          >
                            Anterior
                          </Link>
                        ) : (
                          <span
                            className="px-4 py-2 border border-oro/5 text-oro/10 cursor-not-allowed text-xs font-black uppercase tracking-widest"
                            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                          >
                            Anterior
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 justify-center">
                          <PaginationPageInput
                            currentPage={currentPage}
                            totalPages={totalPages}
                            isRenegado={isRenegado}
                            urlParamName="page"
                          />
                          <span className="text-oro/40 font-black text-xs">
                            / {totalPages}
                          </span>
                        </div>

                        {currentPage < totalPages ? (
                          <Link
                            href={`/mundo-ninja/${id}?page=${currentPage + 1}${searchParamSuffix}`}
                            className="px-4 py-2 border border-oro/30 hover:bg-oro/20 text-oro hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                          >
                            Siguiente
                          </Link>
                        ) : (
                          <span
                            className="px-4 py-2 border border-oro/5 text-oro/10 cursor-not-allowed text-xs font-black uppercase tracking-widest"
                            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                          >
                            Siguiente
                          </span>
                        )}
                      </PaginationContainer>
                    </div>
                  )}
                </>
              ) : ninjas.length > 0 ? (
                <div className="py-32 text-center ninja-card-oro opacity-75 flex flex-col items-center gap-6">
                  <User className="w-16 h-16 text-oro/10 animate-pulse" />
                  <div className="space-y-2">
                    <h3 className="text-lg xl:text-xl font-black text-oro/40 uppercase tracking-[0.3em] italic leading-none">NO SE ENCONTRARON shinobi</h3>
                    <p className="text-caption font-black text-oro/20 uppercase tracking-[0.4em]">Ninguna ficha coincide con &quot;{searchQuery}&quot;</p>
                  </div>
                  <Link
                    href={`/mundo-ninja/${id}`}
                    className="px-6 py-3 border border-oro/30 hover:bg-oro/20 text-oro text-caption xl:text-xs font-black uppercase tracking-widest mt-2"
                    style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                  >
                    Limpiar búsqueda
                  </Link>
                </div>
              ) : (
                <div className="py-48 text-center ninja-card-oro opacity-50 flex flex-col items-center gap-8">
                  <User className="w-24 h-24 text-oro/10" />
                  <div className="space-y-2">
                    <h3 className="text-xl xl:text-2xl font-black text-oro/40 uppercase tracking-[0.4em] italic leading-none">AÚN NO HAY shinobi EN ESTA REGIÓN</h3>
                    <p className="text-caption xl:text-xs font-black text-oro/20 uppercase tracking-[0.6em]">EL DESTINO AGUARDA A SU PRIMER HÉROE</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ═══════════════════════ VISTA GESTIÓN — FORO ═══════════════════════ */
            <div className="animate-in fade-in duration-500 space-y-0">

              {/* ── Cabecera del tablón ──────────────────────────────── */}
              <div className="ninja-card-oro overflow-hidden">
                {/* Encabezado del foro */}
                <div className="px-8 py-5 border-b border-oro/10 flex items-center justify-between bg-black/20">
                  {activeTopic ? (
                    <button
                      onClick={() => setActiveTopic(null)}
                      className="flex items-center gap-2 text-oro/50 hover:text-oro transition-colors text-xs font-black uppercase tracking-widest"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      Volver al tablón
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-oro/60 uppercase tracking-[0.3em]">
                        Tablón de la Aldea
                      </span>
                    </div>
                  )}
                  {activeTopic && (
                    <span className="text-xs font-black text-oro/30 uppercase tracking-widest">
                      {activeTopic === 'info' ? 'Información de la Aldea' : activeTopic === 'equipos' ? 'Registro de Equipos Ninja' : 'Personajes NPC'}
                    </span>
                  )}
                </div>

                {/* ── Sin topic activo: índice del foro ───────────── */}
                {!activeTopic && (
                  <>
                    {/* Cabecera de columnas */}
                    <div className="hidden md:grid grid-cols-[1fr_auto] gap-4 px-8 py-3 border-b border-oro/5 text-[10px] font-black text-oro/20 uppercase tracking-[0.3em]">
                      <span>Tema</span>
                      <span className="w-24 text-center">Entradas</span>
                    </div>

                    {/* ── Tema 1: Información ─────────────────── */}
                    <button
                      onClick={() => setActiveTopic('info')}
                      className="w-full group border-b border-oro/5 hover:bg-oro/[0.03] transition-all duration-200 text-left"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center px-8 py-6">
                        {/* Título + descripción */}
                        <div className="flex items-center gap-4 min-w-0">
                          <ChevronRight className="w-4 h-4 text-oro/20 group-hover:text-oro/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                          <div className="min-w-0">
                            <p className="ninja-title text-xl xl:text-2xl group-hover:text-white transition-colors leading-tight">
                              Información de la Aldea
                            </p>
                            <p className="text-caption font-black text-oro/30 uppercase tracking-[0.2em] mt-1.5 truncate">
                              Censo jerárquico · cupos activos · {aldea?.nombre_completo}
                            </p>
                          </div>
                        </div>

                        {/* Contador */}
                        <div className="hidden md:flex flex-col items-center w-24">
                          <span className="text-xl font-black text-oro tabular-nums">{ninjas.length}</span>
                          <span className="text-[9px] font-black text-oro/20 uppercase tracking-widest">shinobi</span>
                        </div>
                      </div>
                    </button>

                    {/* ── Tema 2: Equipos Ninja ───────────────── */}
                    <button
                      onClick={() => setActiveTopic('equipos')}
                      className="w-full group border-b border-oro/5 hover:bg-oro/[0.03] transition-all duration-200 text-left"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center px-8 py-6">
                        {/* Título + descripción */}
                        <div className="flex items-center gap-4 min-w-0">
                          <ChevronRight className="w-4 h-4 text-oro/20 group-hover:text-oro/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                          <div className="min-w-0">
                            <p className="ninja-title text-xl xl:text-2xl group-hover:text-white transition-colors leading-tight">
                              Registro de Equipos Ninja
                            </p>
                            <p className="text-caption font-black text-oro/30 uppercase tracking-[0.2em] mt-1.5 truncate">
                              Formaciones activas · líderes · composición de cada equipo
                            </p>
                          </div>
                        </div>

                        {/* Contador */}
                        <div className="hidden md:flex flex-col items-center w-24">
                          <span className="text-xl font-black text-oro tabular-nums">{equipos.length}</span>
                          <span className="text-[9px] font-black text-oro/20 uppercase tracking-widest">EQUIPOS</span>
                        </div>
                      </div>
                    </button>

                    {/* ── Tema 3: Personajes NPC ───────────────── */}
                    <button
                      onClick={() => setActiveTopic('npc')}
                      className="w-full group hover:bg-oro/[0.03] transition-all duration-200 text-left"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center px-8 py-6">
                        {/* Título + descripción */}
                        <div className="flex items-center gap-4 min-w-0">
                          <ChevronRight className="w-4 h-4 text-oro/20 group-hover:text-oro/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                          <div className="min-w-0">
                            <p className="ninja-title text-xl xl:text-2xl group-hover:text-white transition-colors leading-tight">
                              NPC
                            </p>
                            <p className="text-caption font-black text-oro/30 uppercase tracking-[0.2em] mt-1.5 truncate">
                              Personajes no jugadores · autoridades · mentores · figuras clave
                            </p>
                          </div>
                        </div>

                        {/* Contador */}
                        <div className="hidden md:flex flex-col items-center w-24">
                          <span className="text-xl font-black text-oro tabular-nums">{npcs.length}</span>
                          <span className="text-[9px] font-black text-oro/20 uppercase tracking-widest">NPCS</span>
                        </div>
                      </div>
                    </button>
                  </>
                )}

                {/* ── Topic: INFORMACIÓN ────────────────────────────── */}
                {activeTopic === 'info' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Imagen de la aldea con overlay */}
                    {aldea?.url_imagen && (
                      <div className="p-8 xl:p-12 pb-0">
                        <div className="w-full h-64 xl:h-[450px] overflow-hidden bg-black/20 relative border border-oro/20 ninja-clip-md">
                          <img
                            src={aldea.url_imagen}
                            alt={aldea?.nombre_completo}
                            className="w-full h-full object-cover filter brightness-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent pointer-events-none" />
                          <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none">
                            <div className="flex flex-col gap-4 w-full items-start">
                              <div className="flex flex-col gap-1 min-w-0">
                                <h3 className="ninja-title text-3xl sm:text-5xl xl:text-6xl transition-all leading-tight py-1">
                                  {aldea?.nombre_completo}
                                </h3>
                                {aldea?.nombre_jap && (
                                  <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">
                                    {aldea.nombre_jap}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col items-start gap-0.5 shrink-0">
                                <span className="text-2xl md:text-3xl xl:text-4xl font-black text-oro tabular-nums leading-none">
                                  {ninjas.length}/{maxCupos}
                                </span>
                                <span className="text-caption md:text-xs xl:text-sm font-black text-oro/20 uppercase tracking-widest">
                                  shinobi
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Censo Jerárquico */}
                    <div className="p-8 xl:p-12 space-y-8">
                      <div className="border-b border-oro/10 pb-4">
                        <h3 className="text-xl font-black text-oro uppercase tracking-[0.25em]">
                          Censo Jerárquico
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {ranks.map((rank) => {
                          const members = groupedNinjas[rank] || [];
                          return (
                            <div key={rank} className="bg-black/30 border border-oro/5 p-6 space-y-4 relative overflow-hidden ninja-clip-sm flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between border-b border-oro/10 pb-3 mb-2">
                                  <h4 className="text-sm font-black text-oro uppercase tracking-wider">{rank}</h4>
                                  <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest">
                                    {members.length} {members.length === 1 ? 'SHINOBI' : 'shinobi'}
                                  </span>
                                </div>
                                {members.length > 0 ? (
                                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {members.map((member) => {
                                      const username = (Array.isArray(member.profiles) ? member.profiles[0]?.username : member.profiles?.username) || member.hobba_name || '';
                                      return (
                                        <Link
                                          key={member.id}
                                          href={`/ficha/${member.id}`}
                                          className="flex items-center justify-between p-3.5 bg-neutral-900/40 hover:bg-oro/5 border border-oro/5 hover:border-oro/20 transition-all cursor-pointer group ninja-clip-xs"
                                        >
                                          <div className="truncate pr-4">
                                            <p className="font-bold text-white group-hover:text-oro transition-colors text-sm xl:text-base leading-tight truncate">
                                              {member.nombre_ninja}
                                            </p>
                                            <p className="text-[10px] text-oro/40 font-black uppercase tracking-wider mt-0.5 truncate">
                                              @{username}
                                            </p>
                                          </div>
                                          <span className="px-3 py-1 bg-oro/5 text-oro text-[10px] font-black border border-oro/20 uppercase tracking-widest ninja-clip-xs shrink-0">
                                            RANGO {member.rango}
                                          </span>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="py-8 text-center bg-black/10 border border-dashed border-oro/5 ninja-clip-xs">
                                    <p className="text-xs font-black text-oro/20 uppercase tracking-widest">
                                      Sin shinobi en este rango
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Equipos Activos */}
                      <div className="space-y-6 pt-4 border-t border-oro/10">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-oro uppercase tracking-[0.25em] flex items-center gap-3">
                            Equipos Activos
                          </h3>
                          <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest">
                            {equipos.length} {equipos.length === 1 ? 'EQUIPO' : 'EQUIPOS'}
                          </span>
                        </div>
                        {equipos.length > 0 ? (
                          <div className="ninja-card-oro overflow-hidden border border-oro/20 bg-black/40 backdrop-blur-sm">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                  <tr className="border-b border-oro/10 text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.3em] bg-black/40">
                                    <th className="py-5 px-8 whitespace-nowrap">Nombre de Equipo</th>
                                    <th className="py-5 px-8 whitespace-nowrap">Líder</th>
                                    <th className="py-5 px-8 whitespace-nowrap">Integrantes</th>
                                    <th className="py-5 px-8 whitespace-nowrap">Creado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-oro/5">
                                  {equipos.map((equipo) => {
                                    const members = [equipo.integrante_1, equipo.integrante_2, equipo.integrante_3].filter(Boolean);
                                    return (
                                      <tr key={equipo.id} className="hover:bg-oro/5 transition-all duration-200">
                                        <td className="py-5 px-8">
                                          <p className="ninja-title text-xl xl:text-2xl leading-tight">{equipo.nombre_equipo}</p>
                                        </td>
                                        <td className="py-5 px-8">
                                          <div>
                                            <p className="ninja-title text-lg xl:text-xl leading-tight text-white">{equipo.lider?.nombre_ninja || 'Sin Líder'}</p>
                                            {equipo.lider && (
                                              <p className="text-[10px] text-oro/40 uppercase font-black tracking-wider mt-0.5">
                                                @{(Array.isArray(equipo.lider?.profiles) ? equipo.lider?.profiles[0]?.username : equipo.lider?.profiles?.username) || ''}
                                              </p>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-5 px-8">
                                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                                            {members.map((m) => (
                                              <div key={m.id} className="flex items-center gap-1 bg-black/20 border border-oro/5 px-3 py-1.5 ninja-clip-xs">
                                                <div>
                                                  <p className="ninja-title text-sm leading-tight text-white">{m.nombre_ninja}</p>
                                                  <p className="text-[9px] text-oro/30 font-black uppercase tracking-wider">
                                                    @{(Array.isArray(m.profiles) ? m.profiles[0]?.username : m.profiles?.username) || ''}
                                                  </p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="py-5 px-8 whitespace-nowrap">
                                          <span className="text-caption font-black text-oro/60 uppercase tracking-widest whitespace-nowrap">
                                            {equipo.fecha_creacion ? new Date(equipo.fecha_creacion).toLocaleDateString('es-ES') : ''}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="py-12 text-center bg-black/20 border border-dashed border-oro/10 ninja-clip-xs">
                            <p className="text-xs font-black text-oro/30 uppercase tracking-[0.2em]">
                              Sin equipos activos registrados en esta aldea
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Topic: EQUIPOS NINJA ──────────────────────────── */}
                {activeTopic === 'equipos' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Barra de acciones del tema */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-oro/5 bg-black/10">
                      <div className="flex items-center gap-3">
                        <span className="text-caption font-black text-oro/50 uppercase tracking-[0.25em]">
                          {equipos.length} {equipos.length === 1 ? 'EQUIPO ACTIVO' : 'EQUIPOS ACTIVOS'}
                        </span>
                      </div>
                      {userRole?.canManage && !isCreating && (
                        <button
                          onClick={() => setIsCreating(true)}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 ninja-btn-oro text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Registrar Equipo
                        </button>
                      )}
                    </div>

                    {/* Formulario de creación */}
                    {isCreating && (
                      <div className="px-8 py-6 border-b border-oro/10 bg-black/20">
                        <form onSubmit={handleCreateEquipo} className="bg-black/30 border border-oro/10 p-6 xl:p-8 space-y-6 ninja-clip-sm">
                          <div className="flex justify-between items-center border-b border-oro/5 pb-4 mb-2">
                            <h3 className="text-lg font-black text-oro uppercase tracking-wider">Nuevo Equipo Ninja</h3>
                            <button
                              type="button"
                              onClick={() => setIsCreating(false)}
                              className="text-oro/40 hover:text-oro transition-colors p-1"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="bg-red-500/10 border border-red-500/30 p-4 ninja-clip-xs text-xs flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 animate-pulse shrink-0" />
                            <div>
                              <p className="font-black uppercase tracking-wider mb-1 text-red-500 text-[11px]">Aviso de Registro</p>
                              <p className="text-white/60 leading-relaxed">
                                El equipo no aparecerá registrado en la lista hasta que como mínimo una persona más acepte la invitación de unión.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">Nombre del Equipo</label>
                              <input
                                type="text"
                                required
                                value={nombreEquipo}
                                onChange={(e) => setNombreEquipo(e.target.value)}
                                placeholder="Ej. Equipo Kakashi"
                                className="w-full bg-black/50 border border-oro/20 px-4 py-3 text-white focus:border-oro/50 focus:outline-none transition-colors text-sm"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <MemberSelector
                                label="Líder (Chunin o superior, opcional)"
                                value={lider}
                                onSelect={(n) => setLider(n)}
                                onClear={() => setLider(null)}
                                getOptions={getAvailableNinjas}
                                excludeIds={[int1?.id, int2?.id, int3?.id]}
                                requireNoGenin={true}
                              />
                              <MemberSelector
                                label="Integrante 1"
                                value={int1}
                                onSelect={(n) => setInt1(n)}
                                onClear={() => setInt1(null)}
                                getOptions={getAvailableNinjas}
                                excludeIds={[lider?.id, int2?.id, int3?.id]}
                              />
                              <MemberSelector
                                label="Integrante 2 (Opcional)"
                                value={int2}
                                onSelect={(n) => setInt2(n)}
                                onClear={() => setInt2(null)}
                                getOptions={getAvailableNinjas}
                                excludeIds={[lider?.id, int1?.id, int3?.id]}
                              />
                              <MemberSelector
                                label="Integrante 3 (Opcional)"
                                value={int3}
                                onSelect={(n) => setInt3(n)}
                                onClear={() => setInt3(null)}
                                getOptions={getAvailableNinjas}
                                excludeIds={[lider?.id, int1?.id, int2?.id]}
                              />
                            </div>
                          </div>

                          <div className="flex gap-4 justify-end pt-4 border-t border-oro/5">
                            <button
                              type="button"
                              onClick={() => setIsCreating(false)}
                              className="px-6 py-3 border border-oro/20 text-oro text-xs font-black uppercase tracking-widest hover:bg-oro/5 transition-all ninja-clip-xs"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={saving}
                              className="px-6 py-3 ninja-btn-oro text-xs disabled:opacity-50"
                            >
                              {saving ? 'Registrando...' : 'Registrar Equipo'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Tabla de equipos */}
                    <div className="ninja-card-oro overflow-hidden border border-oro/20 bg-black/40 backdrop-blur-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="border-b border-oro/10 text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.3em] bg-black/40">
                              <th className="py-5 px-8 whitespace-nowrap">Nombre de Equipo</th>
                              <th className="py-5 px-8 whitespace-nowrap">Líder</th>
                              <th className="py-5 px-8 whitespace-nowrap">Integrantes</th>
                              <th className="py-5 px-8 whitespace-nowrap">Creado</th>
                              {userRole && <th className="py-5 px-8 text-right whitespace-nowrap">Acciones</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-oro/5">
                            {equipos.map((equipo) => {
                              const members = [equipo.integrante_1, equipo.integrante_2, equipo.integrante_3].filter(Boolean);
                              const isLider = userRole?.character?.id === equipo.lider_id;
                              const isMember = members.some(m => m.id === userRole?.character?.id);
                              const canDisolve = userRole?.isAdmin || isLider || isMember;

                              return (
                                <tr key={equipo.id} className="hover:bg-oro/5 transition-all duration-200">
                                  <td className="py-5 px-8">
                                    <p className="ninja-title text-xl xl:text-2xl leading-tight">{equipo.nombre_equipo}</p>
                                  </td>
                                  <td className="py-5 px-8">
                                    <div>
                                      <p className="ninja-title text-lg xl:text-xl leading-tight text-white">{equipo.lider?.nombre_ninja || 'Sin Líder'}</p>
                                      {equipo.lider && (
                                        <p className="text-[10px] text-oro/40 uppercase font-black tracking-wider mt-0.5">
                                          @{(Array.isArray(equipo.lider?.profiles) ? equipo.lider?.profiles[0]?.username : equipo.lider?.profiles?.username) || ''}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-5 px-8">
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                      {members.map((m) => (
                                        <div key={m.id} className="flex items-center gap-1 bg-black/20 border border-oro/5 px-3 py-1.5 ninja-clip-xs">
                                          <div>
                                            <p className="ninja-title text-sm leading-tight text-white">{m.nombre_ninja}</p>
                                            <p className="text-[9px] text-oro/30 font-black uppercase tracking-wider">
                                              @{(Array.isArray(m.profiles) ? m.profiles[0]?.username : m.profiles?.username) || ''}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-5 px-8 whitespace-nowrap">
                                    <span className="text-caption font-black text-oro/60 uppercase tracking-widest whitespace-nowrap">
                                      {equipo.fecha_creacion ? new Date(equipo.fecha_creacion).toLocaleDateString('es-ES') : ''}
                                    </span>
                                  </td>
                                  {userRole && (
                                    <td className="py-5 px-8 text-right">
                                      {canDisolve && (
                                        <button
                                          onClick={() => handleDisolverEquipo(equipo.id)}
                                          className="p-2 border border-naranja-naruto/20 text-naranja-naruto hover:bg-naranja-naruto/10 transition-colors ninja-clip-xs"
                                          title="Disolver Equipo"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                            {equipos.length === 0 && (
                              <tr>
                                <td colSpan={userRole ? 5 : 4} className="py-16 text-center bg-black/20">
                                  <p className="text-xs font-black text-oro/30 uppercase tracking-[0.25em]">No hay equipos ninja registrados en esta aldea.</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Topic: NPC ────────────────────────────── */}
                {activeTopic === 'npc' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300 p-8 xl:p-12 space-y-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-oro/10 pb-6">
                      <div>
                        <h3 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.25em]">
                          Personajes NPC {isRenegado ? '(Renegados / Sin Aldea)' : `· ${aldea?.nombre_completo}`}
                        </h3>
                        <p className="text-caption font-black text-oro/40 uppercase tracking-widest mt-1">
                          Fichas informativas de autoridades, mentores y personajes clave
                        </p>
                      </div>

                      {canManageNPC && (
                        <button
                          onClick={() => {
                            setEditingNPC(null);
                            setShowNPCForm(true);
                          }}
                          className="flex items-center gap-2 px-6 py-3 ninja-btn-oro text-xs uppercase tracking-widest shrink-0 font-black"
                        >
                          <Plus className="w-4 h-4" /> AÑADIR NPC
                        </button>
                      )}
                    </div>

                    {loadingNPCs ? (
                      <div className="py-24 text-center">
                        <div className="w-12 h-12 border-4 border-oro/20 border-t-oro rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-oro/40 text-xs font-black uppercase tracking-[0.3em] italic">Cargando personajes NPC...</p>
                      </div>
                    ) : npcs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {npcs.map((npc) => (
                          <div
                            key={npc.id}
                            onClick={() => setSelectedNPC(npc)}
                            className="group relative bg-black/40 border border-oro/20 hover:border-oro/60 transition-all duration-300 ninja-clip-md overflow-hidden flex flex-col justify-between cursor-pointer hover:scale-[1.02] shadow-lg"
                          >
                            {/* Imagen del NPC */}
                            <div className="w-full h-64 bg-black/60 relative overflow-hidden flex items-center justify-center">
                              {npc.img_url ? (
                                <img
                                  src={npc.img_url}
                                  alt={npc.name}
                                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <User className="w-16 h-16 text-oro/15 group-hover:text-oro/30 transition-colors" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />

                              {/* Botones rápidos si canManageNPC */}
                              {canManageNPC && (
                                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingNPC(npc);
                                      setShowNPCForm(true);
                                    }}
                                    className="p-2 bg-black/80 text-oro border border-oro/30 hover:bg-oro hover:text-black transition-colors ninja-clip-xs"
                                    title="Editar NPC"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNPC(npc);
                                    }}
                                    className="p-2 bg-black/80 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white transition-colors ninja-clip-xs"
                                    title="Eliminar NPC"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Info de la tarjeta */}
                            <div className="p-5 space-y-2 relative z-10 bg-gradient-to-b from-black/60 to-black/90 flex-1 flex flex-col justify-between">
                              <div>
                                {npc.title && (
                                  <span className="text-[10px] font-black text-oro/50 uppercase tracking-[0.25em] block truncate mb-1">
                                    {npc.title}
                                  </span>
                                )}
                                <h4 className="ninja-title text-xl text-white group-hover:text-oro transition-colors leading-snug">
                                  {npc.name}
                                </h4>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-oro/10 text-[10px] font-black text-oro/60 uppercase tracking-widest">
                                <span>{npc.clan || 'Sin Clan'}</span>
                                <span>{npc.age || '—'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-24 text-center bg-black/20 border border-dashed border-oro/10 ninja-clip-xs space-y-3">
                        <Users className="w-12 h-12 text-oro/10 mx-auto" />
                        <p className="text-xs font-black text-oro/40 uppercase tracking-[0.3em] italic">
                          Aún no se han registrado personajes NPC para esta aldea.
                        </p>
                        {canManageNPC && (
                          <button
                            onClick={() => {
                              setEditingNPC(null);
                              setShowNPCForm(true);
                            }}
                            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 border border-oro/30 hover:bg-oro/20 text-oro text-xs font-black uppercase tracking-widest ninja-clip-xs"
                          >
                            <Plus className="w-4 h-4" /> Crear Primer NPC
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modales de NPC */}
      {selectedNPC && (
        <NPCModal
          npc={selectedNPC}
          onClose={() => setSelectedNPC(null)}
          canManage={canManageNPC}
          onEdit={(npc) => {
            setSelectedNPC(null);
            setEditingNPC(npc);
            setShowNPCForm(true);
          }}
          onDelete={(npc) => {
            handleDeleteNPC(npc);
          }}
        />
      )}

      {(showNPCForm || editingNPC) && (
        <NPCFormModal
          initialData={editingNPC}
          aldeaId={isRenegado ? null : Number(id)}
          onClose={() => {
            setShowNPCForm(false);
            setEditingNPC(null);
          }}
          onSaved={() => {
            fetchNPCs();
          }}
        />
      )}
    </div>
  );
}
