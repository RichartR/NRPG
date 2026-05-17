'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Registro } from '@/domain/types';
import { Eye, Edit3, Trash2, Loader2, X, Swords } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';

interface CombatTableProps {
  combates: Registro[];
  onRefresh?: () => void;
  onEdit?: (reg: Registro) => void;
  isAdmin?: boolean;
  subjectId?: number;
}

export default function CombatTable({ combates, onRefresh, onEdit, isAdmin, subjectId }: CombatTableProps) {
  const { activeCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();
  
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [selectedCombat, setSelectedCombat] = useState<Registro | null>(null);

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Registro de Combate',
      message: '¿Estás seguro de que quieres eliminar este combate permanentemente?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;
    
    setLoadingId(id);
    try {
      await RegistrosService.deleteRegistro(id);
      addToast('Combate eliminado correctamente', 'success');
      onRefresh?.();
    } catch (err: any) {
      addToast(err.message || 'Error al eliminar el combate', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const calculateParticipantXP = (m: Registro, team: 'A' | 'B', huye?: boolean) => {
    const config = m.data.config_xp;
    if (!config) return 0;
    if (huye) return 0;
    if (m.data.ganador === 'Empate') return Number(config.retirarse) || 0;
    if (m.data.ganador === 'A') return team === 'A' ? (Number(config.ganar) || 0) : (Number(config.perder) || 0);
    if (m.data.ganador === 'B') return team === 'B' ? (Number(config.ganar) || 0) : (Number(config.perder) || 0);
    return 0;
  };

  const getRankBadgeStyle = (r: string) => {
    switch (r?.toUpperCase()) {
      case 'S': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'A': return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'B': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'C': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'D': return 'bg-green-500/10 border-green-500/30 text-green-400';
      default: return 'bg-oro/10 border-oro/20 text-oro';
    }
  };

  return (
    <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
          <thead>
            <tr className="border-b border-oro/10 text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.3em]">
              <th className="py-6 px-8 w-[18%]">Fecha</th>
              <th className="py-6 px-8 w-[42%]">Combate / Resumen</th>
              <th className="py-6 px-8 w-[15%] w-36">Resultado</th>
              <th className="py-6 px-8 w-[15%] w-36">Recompensa</th>
              <th className="py-6 px-8 text-right w-[10%] w-44">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-oro/5 bg-black/40">
            {combates.map((m) => {
              const sid = subjectId || activeCharacter?.id || m.autor_id;
              const teamA = m.data.equipo_a || [];
              const teamB = m.data.equipo_b || [];
              const isA = teamA.some((p: any) => p.id === sid);

              const allies = (isA ? teamA : teamB).filter((p: any) => p.id !== sid).map((p: any) => p.nombre_ninja);
              const enemies = (isA ? teamB : teamA).map((p: any) => p.nombre_ninja);

              const isEmpate = m.data.ganador === 'Empate';
              const won = (m.data.ganador === 'A' && isA) || (m.data.ganador === 'B' && !isA);
              const xpGained = calculateParticipantXP(m, isA ? 'A' : 'B', (isA ? teamA : teamB).find((p: any) => p.id === sid)?.huye);

              const isOwner = activeCharacter?.id === m.autor_id;
              const canManage = isOwner || isAdmin;

              const participantSelf = (isA ? teamA : teamB).find((p: any) => p.id === sid);
              const selfName = participantSelf?.nombre_ninja || m.autor?.nombre_ninja || 'El ninja';

              // Generate summary text
              let combatSummary = '';
              if (allies.length > 0) {
                combatSummary = `${selfName} combatió junto a ${allies.join(', ')} contra ${enemies.join(', ')}`;
              } else {
                combatSummary = `${selfName} combatió contra ${enemies.join(', ')}`;
              }

              return (
                <tr key={m.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Fecha */}
                  <td className="py-6 px-8">
                    <div className="flex flex-col justify-center gap-2">
                      {/* Fecha de Creación */}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-oro/80 uppercase tracking-wider">
                          {new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[9px] font-bold text-oro/30 uppercase tracking-widest mt-0.5">
                          {new Date(m.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {/* Fecha de Modificación */}
                      {m.data.fecha_modificacion && (
                        <div className="flex flex-col border-t border-red-500/30 pt-1.5">
                          <span className="text-[7px] font-black text-red-500/60 uppercase tracking-widest">
                            MODIFICADO
                          </span>
                          <span className="text-[10px] font-black text-red-400 uppercase tracking-wider mt-0.5">
                            {new Date(m.data.fecha_modificacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[8px] font-bold text-red-500/60 uppercase tracking-widest mt-0.5">
                            {new Date(m.data.fecha_modificacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Combate / Resumen */}
                  <td className="py-6 px-8 whitespace-normal break-words">
                    <div className="flex flex-col gap-1.5 justify-center">
                      <div className="flex items-center flex-wrap gap-2 text-xs xl:text-sm">
                        {/* Bando Propio (Aliados + Jugador) */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-oro drop-shadow-[0_0_8px_rgba(223,184,87,0.15)]">{selfName}</span>
                          {allies.length > 0 && allies.map((name: string, i: number) => (
                            <span key={i} className="text-oro/70 font-semibold before:content-['+'] before:mr-1">{name}</span>
                          ))}
                        </div>

                        {/* VS Tag */}
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-600/10 border border-red-500/20 rounded-[3px] shadow-[0_0_8px_rgba(239,68,68,0.1)]">
                          <Swords className="w-3 h-3 text-red-400" />
                          <span className="font-ninja text-[9px] text-red-400 italic font-black uppercase tracking-wider">VS</span>
                        </div>

                        {/* Bando Enemigo */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {enemies.map((name: string, i: number) => (
                            <React.Fragment key={i}>
                              <span className="font-black text-oro/90">{name}</span>
                              {i < enemies.length - 1 && <span className="text-oro/30 font-light">&</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      
                      {/* Optional metadata description below if exists */}
                      {m.data.descripcion_combate && (
                        <p className="text-[10px] text-oro/40 italic mt-0.5 line-clamp-1">
                          "{m.data.descripcion_combate}"
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Resultado */}
                  <td className="py-6 px-8">
                    {isEmpate ? (
                      <span className="inline-block text-[9px] font-black text-oro/70 border border-oro/30 px-2.5 py-0.5 ninja-clip-xs bg-oro/5 tracking-widest shadow-[0_0_8px_rgba(223,184,87,0.08)]">
                        EMPATE
                      </span>
                    ) : won ? (
                      <span className="inline-block text-[9px] font-black text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 ninja-clip-xs bg-emerald-500/5 tracking-widest shadow-[0_0_10px_rgba(52,211,153,0.12)]">
                        VICTORIA
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] font-black text-red-400 border border-red-500/30 px-2.5 py-0.5 ninja-clip-xs bg-red-500/5 tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.12)]">
                        DERROTA
                      </span>
                    )}
                  </td>

                  {/* Recompensa */}
                  <td className="py-6 px-8">
                    <span className="inline-block text-[10px] xl:text-xs font-black text-emerald-400 tracking-wider bg-emerald-500/5 border border-emerald-500/20 py-1 px-3 ninja-clip-xs shadow-[0_0_10px_rgba(52,211,153,0.05)]">
                      +{xpGained} XP
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-6 px-8 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <button 
                        onClick={() => setSelectedCombat(m)}
                        className="p-2 bg-oro/5 border border-oro/10 hover:border-oro/30 text-oro/60 hover:text-oro transition-all ninja-clip-xs"
                        title="Ver Registro Completo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canManage && (
                        <>
                          <button 
                            onClick={() => onEdit?.(m)}
                            className="p-2 bg-oro/10 border border-oro/30 hover:border-oro hover:bg-oro/20 text-oro/80 hover:text-oro transition-all ninja-clip-xs"
                            title="Editar Registro"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(m.id)}
                            disabled={loadingId === m.id}
                            className="p-2 bg-red-600/10 border border-red-600/40 hover:border-red-500 hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                            title="Eliminar Registro"
                          >
                            {loadingId === m.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-oro" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Detallado de Combate */}
      {selectedCombat && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/85 backdrop-blur-md transition-all duration-500 animate-in fade-in" 
              onClick={() => setSelectedCombat(null)} 
            />
            <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#1a1a1c] border border-oro/20 shadow-[0_0_80px_rgba(0,0,0,0.9)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
              
              {/* Modal Header */}
              <div className="flex-none p-6 border-b border-oro/15 flex justify-between items-center bg-[#222226]">
              <div className="flex items-center gap-4">
                <Swords className="w-6 h-6 text-oro animate-pulse" />
                <div>
                  <h3 className="ninja-title text-xl tracking-[0.2em]">INFORME DE COMBATE</h3>
                  <p className="text-[9px] text-oro/40 uppercase tracking-widest font-black">Archivo ninja oficial</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCombat(null)}
                className="p-2 bg-oro/10 hover:bg-oro/20 border border-oro/20 text-oro/60 hover:text-oro transition-all ninja-clip-xs shadow-md shadow-black/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-8 xl:p-12 overflow-y-auto space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-10 lg:gap-16 items-start">
                
                {/* Bando A */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-oro/10 pb-4">
                    <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">Bando A</span>
                    {selectedCombat.data.ganador === 'A' && (
                      <span className="text-[9px] font-black text-oro bg-oro/10 px-2 py-0.5 ninja-clip-xs border border-oro/20">
                        GANADOR
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {selectedCombat.data.equipo_a?.map((p: any) => (
                      <div key={p.id} className="p-4 bg-[#26262b]/70 border border-oro/15 hover:border-oro/30 hover:bg-[#26262b]/95 transition-all ninja-clip-xs space-y-3 shadow-md shadow-black/10">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-oro uppercase tracking-widest">{p.nombre_ninja}</span>
                            <span className="text-[10px] font-black text-oro/60 bg-oro/5 px-2 py-0.5 border border-oro/10">
                              +{calculateParticipantXP(selectedCombat, 'A', p.huye)} XP
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {p.has_estado_alterado && (
                              <span className="px-2 py-0.5 bg-oro/20 text-oro text-[9px] font-black uppercase ninja-clip-xs border border-oro/40">
                                ESTADO ALTERADO
                              </span>
                            )}
                            {p.huye && (
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-black uppercase ninja-clip-xs border border-orange-500/40">
                                HUYE
                              </span>
                            )}
                            <span className="text-[10px] font-black text-oro/70 uppercase">
                              {p.estado_nombre || 'SIN ESTADO'}
                            </span>
                          </div>
                        </div>
                        {p.has_estado_alterado && p.descripcion_estado && (
                          <div className="p-3 bg-oro/5 border-l-2 border-oro/20 italic text-[11px] text-oro/60">
                            "{p.descripcion_estado}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* VS Divider */}
                <div className="flex lg:flex-col items-center justify-center gap-6 lg:self-center">
                  <div className="h-px lg:w-px lg:h-12 bg-oro/40 w-full opacity-20" />
                  <div className="flex flex-col items-center gap-2">
                    {selectedCombat.data.ganador === 'Empate' ? (
                      <span className="font-black text-oro text-2xl xl:text-4xl uppercase tracking-[0.2em]">RETIRADO</span>
                    ) : (
                      <span className="font-ninja text-3xl xl:text-5xl text-oro italic opacity-20">VS</span>
                    )}
                  </div>
                  <div className="h-px lg:w-px lg:h-12 bg-oro/40 w-full opacity-20" />
                </div>

                {/* Bando B */}
                <div className="space-y-6 lg:text-right">
                  <div className="flex items-center lg:flex-row-reverse gap-3 border-b border-oro/10 pb-4">
                    <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">Bando B</span>
                    {selectedCombat.data.ganador === 'B' && (
                      <span className="text-[9px] font-black text-oro bg-oro/10 px-2 py-0.5 ninja-clip-xs border border-oro/20">
                        GANADOR
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {selectedCombat.data.equipo_b?.map((p: any) => (
                      <div key={p.id} className="p-4 bg-[#26262b]/70 border border-oro/15 hover:border-oro/30 hover:bg-[#26262b]/95 transition-all ninja-clip-xs space-y-3 shadow-md shadow-black/10">
                        <div className="flex justify-between items-center lg:flex-row-reverse">
                          <div className="flex items-center gap-3 lg:flex-row-reverse">
                            <span className="text-sm font-black text-oro uppercase tracking-widest">{p.nombre_ninja}</span>
                            <span className="text-[10px] font-black text-oro/60 bg-oro/5 px-2 py-0.5 border border-oro/10">
                              +{calculateParticipantXP(selectedCombat, 'B', p.huye)} XP
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 lg:flex-row-reverse">
                            {p.has_estado_alterado && (
                              <span className="px-2 py-0.5 bg-oro/20 text-oro text-[9px] font-black uppercase ninja-clip-xs border border-oro/40">
                                ESTADO ALTERADO
                              </span>
                            )}
                            {p.huye && (
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-black uppercase ninja-clip-xs border border-orange-500/40">
                                HUYE
                              </span>
                            )}
                            <span className="text-[10px] font-black text-oro/70 uppercase">
                              {p.estado_nombre || 'SIN ESTADO'}
                            </span>
                          </div>
                        </div>
                        {p.has_estado_alterado && p.descripcion_estado && (
                          <div className="p-3 bg-oro/5 border-r-2 border-oro/20 italic text-[11px] text-oro/60 lg:text-right">
                            "{p.descripcion_estado}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Visual Evidence / Images if exists */}
              {selectedCombat.data.urls_imagenes && selectedCombat.data.urls_imagenes.length > 0 && (
                <div className="mt-8 border-t border-oro/10 pt-6">
                  <span className="text-[10px] font-black text-oro/40 uppercase tracking-[0.2em] mb-4 block">
                    PRUEBAS VISUALES DEL ENCUENTRO:
                  </span>
                  <div className="flex flex-wrap gap-4">
                    {selectedCombat.data.urls_imagenes.map((url: string, i: number) => (
                      <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/20 hover:border-oro/40 hover:bg-oro/20 text-[10px] font-black text-oro/60 hover:text-oro uppercase tracking-wider transition-all ninja-clip-xs shadow-sm"
                      >
                        <span>ENLACE DE PRUEBA {i + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex-none p-6 border-t border-oro/15 bg-[#1d1d21] text-center">
              <button 
                onClick={() => setSelectedCombat(null)}
                className="px-8 py-3 ninja-btn-oro text-xs font-black tracking-widest uppercase"
              >
                Cerrar Informe
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
