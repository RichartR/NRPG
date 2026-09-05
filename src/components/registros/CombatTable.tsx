'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Registro } from '@/domain/types';
import { Eye, Edit3, Trash2, Loader2, X, Swords, HeartPulse, Dices, User, Sparkles, Check, ShieldAlert, ScrollText } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { CharacterService } from '@/services/supabase/character.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { RewardLogic } from '@/domain/character/logic';

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
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [selectedCombat, setSelectedCombat] = useState<Registro | null>(null);

  const handleAccept = async (registroId: number) => {
    if (!activeCharacter?.id) return;
    setAcceptingId(registroId);
    try {
      await CharacterService.respondToRecord(activeCharacter.id, registroId, 'aceptar');
      addToast('Combate aceptado y recompensas sumadas a tu ficha', 'success');
      onRefresh?.();
      useCharacterStore.getState().fetchActiveCharacter().catch(console.error);
    } catch (err: any) {
      addToast(err.message || 'Error al aceptar el combate', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

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

  const calculateParticipantXP = (m: Registro, team: 'A' | 'B', huye?: boolean, huyeGanaExp?: boolean) => {
    if (m.subtipo === 'sanacion' || m.data?.subtipo === 'sanacion') return 1;
    const config = m.data.config_xp;
    if (!config) return 0;
    if (huye && !huyeGanaExp) return 0;
    if (m.data.ganador === 'Empate') return 0;

    // Fallback if config is old format
    if (!config.victoria) {
      if (m.data.ganador === 'A') return team === 'A' ? (Number(config.ganar) || 0) : (Number(config.perder) || 0);
      if (m.data.ganador === 'B') return team === 'B' ? (Number(config.ganar) || 0) : (Number(config.perder) || 0);
      return 0;
    }

    const RANK_SCALE: Record<string, number> = { 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };

    const teamA = m.data.equipo_a || [];
    const teamB = m.data.equipo_b || [];

    const maxRankA = teamA.reduce((max: number, p: any) => {
      const val = RANK_SCALE[(p.rango || 'D').toUpperCase()] || 1;
      return val > max ? val : max;
    }, 1);

    const maxRankB = teamB.reduce((max: number, p: any) => {
      const val = RANK_SCALE[(p.rango || 'D').toUpperCase()] || 1;
      return val > max ? val : max;
    }, 1);

    const isWinner = m.data.ganador === team;
    const ownMaxRankVal = team === 'A' ? maxRankA : maxRankB;
    const opponentMaxRankVal = team === 'A' ? maxRankB : maxRankA;

    const diff = opponentMaxRankVal - ownMaxRankVal;

    const section = isWinner ? config.victoria : config.derrota;
    if (!section) return 0;

    let baseXp = 0;
    if (diff >= 2) baseXp = Number(section.mas_2) || 0;
    else if (diff === 1) baseXp = Number(section.mas_1) || 0;
    else if (diff === 0) baseXp = Number(section.igual) || 0;
    else if (diff === -1) baseXp = Number(section.menos_1) || 0;
    else baseXp = Number(section.menos_2) || 0;

    if (baseXp === 0) return 0;

    const combatDate = m.fecha ? new Date(m.fecha).getTime() : Date.now();
    const isPostNumericalDiffRule = combatDate >= new Date('2026-09-04T20:37:00Z').getTime();

    if (isWinner && isPostNumericalDiffRule) {
      const ownTeamCount = team === 'A' ? teamA.length : teamB.length;
      const oppTeamCount = team === 'A' ? teamB.length : teamA.length;

      if (ownTeamCount < oppTeamCount) {
        const playerDiff = oppTeamCount - ownTeamCount;
        return Math.ceil(baseXp * (1 + 0.5 * playerDiff));
      } else if (ownTeamCount > oppTeamCount) {
        const playerDiff = ownTeamCount - oppTeamCount;
        return Math.ceil(baseXp / (1 + playerDiff));
      }
    }

    return baseXp;
  };

  return (
    <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
      {/* Desktop/Large Tablet View (Horizontal Table) */}
      <div className="hidden lg:block overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
          <thead>
            <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em]">
              <th className="py-6 px-8 w-[18%]">Fecha</th>
              <th className="py-6 px-8 w-[42%] font-black">Participantes / Detalle</th>
              <th className="py-6 px-8 w-[15%] w-36">Resultado / Efecto</th>
              <th className="py-6 px-8 w-[15%] w-36">Recompensa</th>
              <th className="py-6 px-8 text-right w-[10%] w-44">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-oro/5 bg-black/40">
            {combates.map((m) => {
              const isSanacion = m.subtipo === 'sanacion' || m.data?.subtipo === 'sanacion';
              const isIntervencion = m.subtipo === 'intervencion' || m.data?.subtipo === 'intervencion' || !!m.data?.es_intervencion;
              const sid = subjectId || activeCharacter?.id || m.autor_id;
              const teamA = m.data.equipo_a || [];
              const teamB = m.data.equipo_b || [];
              const isA = teamA.some((p: any) => p.id === sid);

              const allies = (isA ? teamA : teamB).filter((p: any) => p.id !== sid).map((p: any) => p.nombre_ninja);
              const enemies = (isA ? teamB : teamA).map((p: any) => p.nombre_ninja);

              const isEmpate = m.data.ganador === 'Empate';
              const won = (m.data.ganador === 'A' && isA) || (m.data.ganador === 'B' && !isA);
              const rewards = RewardLogic.calculateReward(m, sid);
              const participantObj = (isA ? teamA : teamB).find((p: any) => p.id === sid);
              const xpGained = (isSanacion || isIntervencion) ? rewards.xp : calculateParticipantXP(m, isA ? 'A' : 'B', participantObj?.huye, participantObj?.huye_gana_exp);
              const pcGained = isSanacion ? 0 : isIntervencion ? rewards.pa : RewardLogic.calculateCombatPA(m, sid);
              const ryousGained = rewards.ryous || 0;

              const isOwner = activeCharacter?.id === m.autor_id;
              const canEdit = isOwner || isAdmin;
              const canDelete = isAdmin;

              const participantSelf = (isA ? teamA : teamB).find((p: any) => p.id === sid);
              const selfName = participantSelf?.nombre_ninja || m.autor?.nombre_ninja || 'El ninja';

              const myPart = m.participantes?.find((p: any) => Number(p.personaje_id) === Number(sid));
              const isPending = myPart?.estado === 'pendiente';
              const isDispute = myPart?.estado === 'disputa_admin';
              const canAcceptDirectly = isPending && Number(activeCharacter?.id) === Number(sid);

              return (
                <tr key={m.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Fecha */}
                  <td className="py-6 px-8">
                    <div className="flex flex-col justify-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-oro/80 uppercase tracking-wider">
                          {new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-caption font-bold text-oro/30 uppercase tracking-widest mt-0.5">
                          {new Date(m.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {m.data.fecha_modificacion && (
                        <div className="flex flex-col border-t border-error-text/30 pt-1.5">
                          <span className="text-[7px] font-black text-red-500/60 uppercase tracking-widest">
                            MODIFICADO
                          </span>
                          <span className="text-caption font-black text-red-400 uppercase tracking-wider mt-0.5">
                            {new Date(m.data.fecha_modificacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-caption font-bold text-red-500/60 uppercase tracking-widest mt-0.5">
                            {new Date(m.data.fecha_modificacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Participantes / Detalle */}
                  <td className="py-6 px-8 text-xs whitespace-normal break-words leading-relaxed">
                    {isSanacion ? (
                      <div className="space-y-1.5">
                        <div className="font-black text-emerald-400 flex items-center gap-2">
                          <HeartPulse className="w-4 h-4 text-emerald-400" /> SANACIÓN: {m.data.sanado?.nombre_ninja}
                        </div>
                        <div className="text-caption text-oro/60 uppercase">
                          MÉDICOS: {m.data.medicos?.map((med: any) => med.nombre_ninja).join(', ')}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {isIntervencion && (
                          <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 bg-black/60 border border-oro/20 ninja-clip-xs text-[10px] font-black uppercase tracking-wider">
                            <span className="text-oro/40 tracking-[0.2em]">INTERVENCIÓN</span>
                            <span className="w-1 h-1 rounded-full bg-oro/30" />
                            <span className="text-oro">
                              {(() => {
                                const cod = m.data?.codigo_mision || '';
                                if (!cod) return 'MISIÓN';
                                return cod.toUpperCase().startsWith('MISIÓN') || cod.toUpperCase().startsWith('MISION') ? cod : `MISIÓN ${cod}`;
                              })()}
                            </span>
                            {m.data?.mision_rango && (
                              <span className="px-1.5 py-0.2 bg-oro/10 border border-oro/20 text-oro/80 text-[9px] ninja-clip-xs">
                                RANGO {m.data.mision_rango}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-oro">{selfName}</span>
                          {allies.length > 0 && allies.map((name: string, i: number) => (
                            <span key={i} className="text-oro/70 font-semibold before:content-['+'] before:mr-1">{name}</span>
                          ))}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-600/10 border border-error-text/30 ninja-clip-xs">
                            <Swords className="w-3.5 h-3.5 text-red-400" />
                            <span className="font-ninja text-caption text-red-400 italic font-black uppercase tracking-wider">VS</span>
                          </div>
                          {enemies.map((name: string, i: number) => (
                            <React.Fragment key={i}>
                              <span className="font-black text-oro/90">{name}</span>
                              {i < enemies.length - 1 && <span className="text-oro/30 font-light">&</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Resultado / Efecto */}
                  <td className="py-6 px-8">
                    <div className="flex flex-col gap-1.5">
                      {isSanacion ? (
                        <span className="font-black text-emerald-400 text-xs tracking-wider uppercase">
                          -{m.data.horas_restadas || 0}h HG
                        </span>
                      ) : isIntervencion ? (
                        <div className="flex flex-col gap-0.5">
                          {isEmpate ? (
                            <span className="font-black text-oro/70 text-xs tracking-wider uppercase">
                              Empate
                            </span>
                          ) : won ? (
                            <>
                              <span className="font-black text-emerald-400 text-xs tracking-wider uppercase">
                                Victoria
                              </span>
                              <span className="text-[9px] font-bold text-emerald-400/80 uppercase">
                                (Misión Completada)
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-black text-red-400 text-xs tracking-wider uppercase">
                                Derrota
                              </span>
                              <span className="text-[9px] font-bold text-red-400/80 uppercase">
                                (Misión Fallida)
                              </span>
                            </>
                          )}
                        </div>
                      ) : isEmpate ? (
                        <span className="font-black text-oro/70 text-xs tracking-wider uppercase">
                          Empate
                        </span>
                      ) : won ? (
                        <span className="font-black text-emerald-400 text-xs tracking-wider uppercase">
                          Victoria
                        </span>
                      ) : (
                        <span className="font-black text-red-400 text-xs tracking-wider uppercase">
                          Derrota
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-naranja-naruto text-black ninja-clip-xs">
                          PENDIENTE DE APROBACIÓN
                        </span>
                      )}
                      {isDispute && (
                        <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-red-600/20 border border-red-500/40 text-red-400 ninja-clip-xs">
                          EN DISPUTA
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Recompensa */}
                  <td className="py-6 px-8">
                    <div className="flex flex-col gap-1 justify-center font-bold text-[11px] tracking-wide">
                      {xpGained > 0 && <div className={(isPending || isDispute) ? "text-amber-400/90" : "text-emerald-400"}>+{xpGained} EXP</div>}
                      {pcGained > 0 && <div className={(isPending || isDispute) ? "text-amber-400/90" : "text-emerald-400"}>+{pcGained} PA</div>}
                      {ryousGained > 0 && <div className={(isPending || isDispute) ? "text-amber-400/90" : "text-amber-300"}>+{ryousGained} RYOUS</div>}
                      {xpGained === 0 && pcGained === 0 && ryousGained === 0 && (
                        <span className="text-caption text-oro/20 uppercase tracking-widest italic">-</span>
                      )}
                      {(isPending || isDispute) && (
                        <span className="text-[9px] text-amber-500/70 font-semibold tracking-wider uppercase">
                          (No sumado)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="py-6 px-8 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {canAcceptDirectly && (
                        <button
                          onClick={() => handleAccept(m.id)}
                          disabled={acceptingId === m.id}
                          className="px-2.5 py-1.5 bg-naranja-naruto hover:brightness-110 text-black font-black text-caption uppercase tracking-wider transition-all ninja-clip-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                          title="Aceptar combate y sumar EXP / recompensas a tu ficha"
                        >
                          {acceptingId === m.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                          )}
                          <span>Aceptar</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedCombat(m)}
                        className="p-2 bg-oro/5 border border-oro/10 hover:border-oro/30 text-oro/60 hover:text-oro transition-all ninja-clip-xs"
                        title="Ver Registro Completo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => onEdit?.(m)}
                          className="p-2 bg-oro/10 border border-oro/30 hover:border-oro hover:bg-oro/20 text-oro/80 hover:text-oro transition-all ninja-clip-xs"
                          title="Editar Registro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={loadingId === m.id}
                          className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                          title="Eliminar Registro"
                        >
                          {loadingId === m.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-oro" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet View */}
      <div className="block lg:hidden divide-y divide-oro/10 bg-black/40">
        {combates.map((m) => {
          const isSanacion = m.subtipo === 'sanacion' || m.data?.subtipo === 'sanacion';
          const isIntervencion = m.subtipo === 'intervencion' || m.data?.subtipo === 'intervencion' || !!m.data?.es_intervencion;
          const sid = subjectId || activeCharacter?.id || m.autor_id;
          const teamA = m.data.equipo_a || [];
          const teamB = m.data.equipo_b || [];
          const isA = teamA.some((p: any) => p.id === sid);

          const allies = (isA ? teamA : teamB).filter((p: any) => p.id !== sid).map((p: any) => p.nombre_ninja);
          const enemies = (isA ? teamB : teamA).map((p: any) => p.nombre_ninja);

          const isEmpate = m.data.ganador === 'Empate';
          const won = (m.data.ganador === 'A' && isA) || (m.data.ganador === 'B' && !isA);
          const rewards = RewardLogic.calculateReward(m, sid);
          const participantObjMobile = (isA ? teamA : teamB).find((p: any) => p.id === sid);
          const xpGained = (isSanacion || isIntervencion) ? rewards.xp : calculateParticipantXP(m, isA ? 'A' : 'B', participantObjMobile?.huye, participantObjMobile?.huye_gana_exp);
          const pcGained = isSanacion ? 0 : isIntervencion ? rewards.pa : RewardLogic.calculateCombatPA(m, sid);
          const ryousGained = rewards.ryous || 0;

          const isOwner = activeCharacter?.id === m.autor_id;
          const canEdit = isOwner || isAdmin;
          const canDelete = isAdmin;

          const participantSelf = (isA ? teamA : teamB).find((p: any) => p.id === sid);
          const selfName = participantSelf?.nombre_ninja || m.autor?.nombre_ninja || 'El ninja';

          const myPart = m.participantes?.find((p: any) => Number(p.personaje_id) === Number(sid));
          const isPending = myPart?.estado === 'pendiente';
          const isDispute = myPart?.estado === 'disputa_admin';
          const canAcceptDirectly = isPending && Number(activeCharacter?.id) === Number(sid);

          return (
            <div key={m.id} className="p-5 flex flex-col gap-4 hover:bg-oro/5 transition-all">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-oro/80 uppercase tracking-wider">
                    {new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-caption font-bold text-oro/30 uppercase tracking-widest mt-0.5">
                    {new Date(m.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isSanacion ? (
                    <span className="font-black text-emerald-400 text-xs tracking-wider uppercase">
                      -{m.data.horas_restadas || 0}h HG
                    </span>
                  ) : isIntervencion ? (
                    <div className="flex flex-col items-end gap-0.5">
                      {isEmpate ? (
                        <span className="font-black text-oro/70 text-xs tracking-wider uppercase">
                          Empate
                        </span>
                      ) : won ? (
                        <>
                          <span className="font-black text-emerald-400 text-xs tracking-wider uppercase">
                            Victoria
                          </span>
                          <span className="text-[9px] font-bold text-emerald-400/80 uppercase">
                            (Misión Completada)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-black text-red-400 text-xs tracking-wider uppercase">
                            Derrota
                          </span>
                          <span className="text-[9px] font-bold text-red-400/80 uppercase">
                            (Misión Fallida)
                          </span>
                        </>
                      )}
                    </div>
                  ) : isEmpate ? (
                    <span className="font-black text-oro/70 text-xs tracking-wider uppercase">
                      Empate
                    </span>
                  ) : won ? (
                    <span className="font-black text-emerald-400 text-xs tracking-wider uppercase">
                      Victoria
                    </span>
                  ) : (
                    <span className="font-black text-red-400 text-xs tracking-wider uppercase">
                      Derrota
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-naranja-naruto text-black ninja-clip-xs">
                      PENDIENTE DE APROBACIÓN
                    </span>
                  )}
                  {isDispute && (
                    <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-red-600/20 border border-red-500/40 text-red-400 ninja-clip-xs">
                      EN DISPUTA
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs whitespace-normal break-words leading-relaxed">
                {isSanacion ? (
                  <div className="space-y-1">
                    <div className="font-black text-emerald-400 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-emerald-400" /> SANACIÓN: {m.data.sanado?.nombre_ninja}
                    </div>
                    <div className="text-caption text-oro/60 uppercase">
                      MÉDICOS: {m.data.medicos?.map((med: any) => med.nombre_ninja).join(', ')}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {isIntervencion && (
                      <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 bg-black/60 border border-oro/20 ninja-clip-xs text-[10px] font-black uppercase tracking-wider">
                        <span className="text-oro/40 tracking-[0.2em]">INTERVENCIÓN</span>
                        <span className="w-1 h-1 rounded-full bg-oro/30" />
                        <span className="text-oro">
                          {(() => {
                            const cod = m.data?.codigo_mision || '';
                            if (!cod) return 'MISIÓN';
                            return cod.toUpperCase().startsWith('MISIÓN') || cod.toUpperCase().startsWith('MISION') ? cod : `MISIÓN ${cod}`;
                          })()}
                        </span>
                        {m.data?.mision_rango && (
                          <span className="px-1.5 py-0.2 bg-oro/10 border border-oro/20 text-oro/80 text-[9px] ninja-clip-xs">
                            RANGO {m.data.mision_rango}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-black text-oro">{selfName}</span>
                      {allies.length > 0 && allies.map((name: string, i: number) => (
                        <span key={i} className="text-oro/70 font-semibold before:content-['+'] before:mr-1">{name}</span>
                      ))}
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-600/10 border border-error-text/20 rounded-[3px] scale-90">
                        <Swords className="w-2.5 h-2.5 text-red-400" />
                        <span className="font-ninja text-caption text-red-400 italic font-black uppercase tracking-wider">VS</span>
                      </div>
                      {enemies.map((name: string, i: number) => (
                        <React.Fragment key={i}>
                          <span className="font-black text-oro/90">{name}</span>
                          {i < enemies.length - 1 && <span className="text-oro/30 font-light">&</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center gap-4 mt-1">
                <div className="flex flex-col gap-1 justify-center text-emerald-400 font-bold text-[11px] tracking-wide">
                  {xpGained > 0 && <div className={(isPending || isDispute) ? "text-amber-400/90" : "text-emerald-400"}>+{xpGained} EXP</div>}
                  {pcGained > 0 && <div className={(isPending || isDispute) ? "text-amber-400/90" : "text-emerald-400"}>+{pcGained} PA</div>}
                  {ryousGained > 0 && <div className={(isPending || isDispute) ? "text-amber-400/90" : "text-amber-300"}>+{ryousGained} RYOUS</div>}
                  {xpGained === 0 && pcGained === 0 && ryousGained === 0 && (
                    <span className="text-caption text-oro/20 uppercase tracking-widest italic">-</span>
                  )}
                  {(isPending || isDispute) && (
                    <span className="text-[9px] text-amber-500/70 font-semibold tracking-wider uppercase">
                      (No sumado)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canAcceptDirectly && (
                    <button
                      onClick={() => handleAccept(m.id)}
                      disabled={acceptingId === m.id}
                      className="px-2.5 py-1.5 bg-naranja-naruto hover:brightness-110 text-black font-black text-caption uppercase tracking-wider transition-all ninja-clip-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Aceptar este registro"
                    >
                      {acceptingId === m.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>Aceptar</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCombat(m)}
                    className="p-2 bg-oro/5 border border-oro/10 hover:border-oro/30 text-oro/60 hover:text-oro transition-all ninja-clip-xs"
                    title="Ver Registro Completo"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => onEdit?.(m)}
                      className="p-2 bg-oro/10 border border-oro/30 hover:border-oro hover:bg-oro/20 text-oro/80 hover:text-oro transition-all ninja-clip-xs"
                      title="Editar Registro"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={loadingId === m.id}
                      className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                      title="Eliminar Registro"
                    >
                      {loadingId === m.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-oro" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detallado */}
      {selectedCombat && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-all duration-500 animate-in fade-in"
            onClick={() => setSelectedCombat(null)}
          />
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-neutral-700 border border-oro/20 shadow-[0_0_80px_rgba(0,0,0,0.9)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden ninja-clip-md">

            {/* Modal Header */}
            <div className="flex-none p-6 border-b border-oro/15 flex justify-between items-center bg-neutral-700">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="ninja-title text-lg sm:text-xl tracking-[0.1em] sm:tracking-[0.2em]">
                    {(selectedCombat.subtipo === 'sanacion' || selectedCombat.data?.subtipo === 'sanacion') 
                      ? 'INFORME DE SANACIÓN' 
                      : (selectedCombat.subtipo === 'intervencion' || selectedCombat.data?.subtipo === 'intervencion' || !!selectedCombat.data?.es_intervencion)
                        ? 'INFORME DE INTERVENCIÓN'
                        : 'INFORME DE COMBATE'}
                  </h3>
                  <p className="text-caption text-oro/40 uppercase tracking-widest font-black">Archivo ninja oficial</p>
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
              {(selectedCombat.subtipo === 'sanacion' || selectedCombat.data?.subtipo === 'sanacion') ? (
                /* Contenido Modal Sanación */
                <div className="space-y-8">
                  <div className="p-6 bg-emerald-950/30 border border-emerald-500/30 ninja-clip-sm space-y-4">
                    <h4 className="text-lg font-black text-emerald-400 uppercase tracking-wider flex items-center gap-3">
                      JUGADOR SANADO
                    </h4>
                    <p className="text-xl font-black text-emerald-300 uppercase tracking-widest">
                      {selectedCombat.data?.sanado?.nombre_ninja || 'Jugador'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-neutral-600/70 border border-oro/15 ninja-clip-sm space-y-4">
                      <span className="text-xs font-black text-oro/60 uppercase tracking-[0.2em] block">MÉDICOS PARTICIPANTES:</span>
                      <div className="space-y-3">
                        {selectedCombat.data?.medicos?.map((m: any, idx: number) => (
                          <div key={idx} className="p-3 bg-black/40 border border-oro/10 ninja-clip-xs flex items-center justify-between">
                            <span className="text-sm font-black text-oro uppercase tracking-wider flex items-center gap-2">
                              <User className="w-4 h-4 text-oro/40" /> {m.nombre_ninja}
                            </span>
                            <span className="text-caption font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 ninja-clip-xs">
                              +1 EXP
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-neutral-600/70 border border-emerald-500/20 ninja-clip-sm space-y-4">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] block">DESGLOSE DEL EFECTO (HERIDO GRAVE):</span>
                      <div className="space-y-3 text-xs font-bold uppercase tracking-wider text-oro/80">
                        <div className="flex justify-between p-3 bg-black/40 border border-oro/10 ninja-clip-xs">
                          <span>Base técnica + médicos (2h + {selectedCombat.data?.medicos?.length || 0} med):</span>
                          <span>{selectedCombat.data?.horas_base || (2 + ((selectedCombat.data?.medicos?.length || 0) * 2))}h</span>
                        </div>
                        <div className="flex justify-between p-3 bg-black/40 border border-oro/10 ninja-clip-xs">
                          <span>Tirada d10:</span>
                          <span>+{selectedCombat.data?.tirada_d10 || 0}h</span>
                        </div>
                        <div className="flex justify-between p-4 bg-emerald-950/40 border border-emerald-500/30 ninja-clip-xs text-emerald-300 font-black text-sm">
                          <span>Total Horas Restadas:</span>
                          <span>{selectedCombat.data?.horas_restadas || 0} HORAS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Contenido Modal Combate / Intervención */
                <div className="space-y-8">
                  {(selectedCombat.subtipo === 'intervencion' || selectedCombat.data?.subtipo === 'intervencion' || !!selectedCombat.data?.es_intervencion) && (
                    <div className="p-5 bg-black/40 border border-oro/15 ninja-clip-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-oro/5 border border-oro/20 ninja-clip-xs text-oro shrink-0">
                            <ShieldAlert className="w-5 h-5 text-oro" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-oro/50 uppercase tracking-[0.25em]">
                                MISIÓN INTERVENIDA
                              </span>
                              <span className="text-[9px] font-black text-oro px-1.5 py-0.5 bg-oro/10 border border-oro/20 ninja-clip-xs">
                                RANGO {selectedCombat.data?.mision_rango || 'B'}
                              </span>
                            </div>
                            <h4 className="text-base sm:text-lg font-black text-oro uppercase tracking-wider block mt-0.5">
                              <span className="text-oro/60">{selectedCombat.data?.codigo_mision}:</span> {selectedCombat.data?.mision_titulo || selectedCombat.data?.mision_nombre || 'Misión'}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 border border-oro/15 ninja-clip-xs text-[10px] font-black uppercase tracking-wider">
                            <span className="text-oro/40">Bando A:</span>
                            <span className={selectedCombat.data?.bando_mision === 'A' ? 'text-oro' : 'text-oro/60'}>
                              {selectedCombat.data?.bando_mision === 'A' ? 'Realizador' : 'Interventor'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 border border-oro/15 ninja-clip-xs text-[10px] font-black uppercase tracking-wider">
                            <span className="text-oro/40">Bando B:</span>
                            <span className={selectedCombat.data?.bando_mision === 'B' ? 'text-oro' : 'text-oro/60'}>
                              {selectedCombat.data?.bando_mision === 'B' ? 'Realizador' : 'Interventor'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-oro/10 text-caption font-bold">
                        <div className="p-3 bg-black/40 border border-emerald-500/20 ninja-clip-xs">
                          <span className="text-emerald-400 uppercase font-black block mb-1">RECOMPENSA DE ÉXITO (GANADOR):</span>
                          <span className="text-oro">+{selectedCombat.data?.mision_exp || 0} EXP</span> •{' '}
                          <span className="text-amber-300">+{selectedCombat.data?.mision_ryous || 0} RYOUS</span> •{' '}
                          <span className="text-emerald-400">+{selectedCombat.data?.mision_pa || 0} PA</span>
                        </div>
                        <div className="p-3 bg-black/40 border border-red-500/20 ninja-clip-xs">
                          <span className="text-red-400 uppercase font-black block mb-1">RECOMPENSA DE FALLO (PERDEDOR):</span>
                          {selectedCombat.data?.mision_se_puede_fallar ? (
                            <>
                              <span className="text-oro">+{selectedCombat.data?.mision_exp_fallida || 0} EXP</span> •{' '}
                              <span className="text-amber-300">+{selectedCombat.data?.mision_ryous_fallida || 0} RYOUS</span> •{' '}
                              <span className="text-emerald-400">+{selectedCombat.data?.mision_pa_fallida || 0} PA</span>
                            </>
                          ) : (
                            <span className="text-red-400/80 italic">0 (Misión no recompensable al fallar)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-10 lg:gap-16 items-start">
                    {/* Bando A */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-oro/10 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">Bando A</span>
                          {(selectedCombat.subtipo === 'intervencion' || selectedCombat.data?.es_intervencion) && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-oro/10 border border-oro/20 text-oro ninja-clip-xs">
                              {selectedCombat.data?.bando_mision === 'A' ? 'REALIZADOR' : 'INTERVENTOR'}
                            </span>
                          )}
                        </div>
                        {selectedCombat.data.ganador === 'A' && (
                          <span className="text-caption font-black text-oro bg-oro/10 px-2 py-0.5 ninja-clip-xs border border-oro/20">
                            GANADOR
                          </span>
                        )}
                      </div>
                      <div className="space-y-4">
                        {selectedCombat.data.equipo_a?.map((p: any) => {
                          const pRewards = RewardLogic.calculateReward(selectedCombat, p.id);
                          return (
                            <div key={p.id} className="p-4 bg-neutral-600/70 border border-oro/15 hover:border-oro/30 hover:bg-neutral-600/95 transition-all ninja-clip-xs space-y-3 shadow-md shadow-black/10">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-black text-oro uppercase tracking-widest">{p.nombre_ninja}</span>
                                  <span className="text-caption font-black text-oro/60 bg-oro/5 px-2 py-0.5 border border-oro/10">
                                    +{pRewards.xp} EXP
                                  </span>
                                  {pRewards.pa > 0 && (
                                    <span className="text-caption font-black text-emerald-400/90 bg-emerald-500/5 px-2 py-0.5 border border-success-text/10">
                                      +{pRewards.pa} PA
                                    </span>
                                  )}
                                  {pRewards.ryous > 0 && (
                                    <span className="text-caption font-black text-amber-300/90 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                                      +{pRewards.ryous} R
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  {p.has_estado_alterado && (
                                    <span className="px-2 py-0.5 bg-oro/20 text-oro text-caption font-black uppercase ninja-clip-xs border border-oro/40">
                                      ESTADO ALTERADO
                                    </span>
                                  )}
                                  {p.has_cds && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-caption font-black uppercase ninja-clip-xs border border-blue-400/40">
                                      CDs
                                    </span>
                                  )}
                                  {p.huye && (
                                    <span className={`px-2 py-0.5 text-caption font-black uppercase ninja-clip-xs border ${
                                      p.huye_gana_exp 
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                                        : 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                                    }`}>
                                      {p.huye_gana_exp ? 'HUYE (GANA EXP)' : 'HUYE'}
                                    </span>
                                  )}
                                  <span className="text-caption font-black text-oro/70 uppercase">
                                    {p.estado_nombre || 'SIN ESTADO'}
                                  </span>
                                </div>
                              </div>
                              {p.has_estado_alterado && p.descripcion_estado && (
                                <div className="p-3 bg-oro/5 border-l-2 border-oro/20 italic text-[11px] text-oro/60">
                                  "{p.descripcion_estado}"
                                </div>
                              )}
                              {p.has_cds && p.descripcion_cds && (
                                <div className="p-3 bg-blue-500/5 border-l-2 border-blue-400/30 italic text-[11px] text-blue-300/70">
                                  "{p.descripcion_cds}"
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                      <div className="flex items-center justify-between lg:flex-row-reverse border-b border-oro/10 pb-4">
                        <div className="flex items-center gap-3 lg:flex-row-reverse">
                          <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">Bando B</span>
                          {(selectedCombat.subtipo === 'intervencion' || selectedCombat.data?.es_intervencion) && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-oro/10 border border-oro/20 text-oro ninja-clip-xs">
                              {selectedCombat.data?.bando_mision === 'B' ? 'REALIZADOR' : 'INTERVENTOR'}
                            </span>
                          )}
                        </div>
                        {selectedCombat.data.ganador === 'B' && (
                          <span className="text-caption font-black text-oro bg-oro/10 px-2 py-0.5 ninja-clip-xs border border-oro/20">
                            GANADOR
                          </span>
                        )}
                      </div>
                      <div className="space-y-4">
                        {selectedCombat.data.equipo_b?.map((p: any) => {
                          const pRewards = RewardLogic.calculateReward(selectedCombat, p.id);
                          return (
                            <div key={p.id} className="p-4 bg-neutral-600/70 border border-oro/15 hover:border-oro/30 hover:bg-neutral-600/95 transition-all ninja-clip-xs space-y-3 shadow-md shadow-black/10">
                              <div className="flex justify-between items-center lg:flex-row-reverse">
                                <div className="flex items-center gap-3 lg:flex-row-reverse">
                                  <span className="text-sm font-black text-oro uppercase tracking-widest">{p.nombre_ninja}</span>
                                  <span className="text-caption font-black text-oro/60 bg-oro/5 px-2 py-0.5 border border-oro/10">
                                    +{pRewards.xp} EXP
                                  </span>
                                  {pRewards.pa > 0 && (
                                    <span className="text-caption font-black text-emerald-400/90 bg-emerald-500/5 px-2 py-0.5 border border-success-text/10">
                                      +{pRewards.pa} PA
                                    </span>
                                  )}
                                  {pRewards.ryous > 0 && (
                                    <span className="text-caption font-black text-amber-300/90 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                                      +{pRewards.ryous} R
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 lg:flex-row-reverse">
                                  {p.has_estado_alterado && (
                                    <span className="px-2 py-0.5 bg-oro/20 text-oro text-caption font-black uppercase ninja-clip-xs border border-oro/40">
                                      ESTADO ALTERADO
                                    </span>
                                  )}
                                  {p.has_cds && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-caption font-black uppercase ninja-clip-xs border border-blue-400/40">
                                      CDs
                                    </span>
                                  )}
                                  {p.huye && (
                                    <span className={`px-2 py-0.5 text-caption font-black uppercase ninja-clip-xs border ${
                                      p.huye_gana_exp 
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                                        : 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                                    }`}>
                                      {p.huye_gana_exp ? 'HUYE (GANA EXP)' : 'HUYE'}
                                    </span>
                                  )}
                                  <span className="text-caption font-black text-oro/70 uppercase">
                                    {p.estado_nombre || 'SIN ESTADO'}
                                  </span>
                                </div>
                              </div>
                              {p.has_estado_alterado && p.descripcion_estado && (
                                <div className="p-3 bg-oro/5 border-r-2 border-oro/20 italic text-[11px] text-oro/60 lg:text-right">
                                  "{p.descripcion_estado}"
                                </div>
                              )}
                              {p.has_cds && p.descripcion_cds && (
                                <div className="p-3 bg-blue-500/5 border-r-2 border-blue-400/30 italic text-[11px] text-blue-300/70 lg:text-right">
                                  "{p.descripcion_cds}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Evidence / Images if exists */}
              {selectedCombat.data.urls_imagenes && selectedCombat.data.urls_imagenes.length > 0 && (
                <div className="mt-8 border-t border-oro/10 pt-6">
                  <span className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] mb-4 block">
                    PRUEBAS VISUALES:
                  </span>
                  <div className="flex flex-wrap gap-4">
                    {selectedCombat.data.urls_imagenes.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-oro/10 border border-oro/20 hover:border-oro/40 hover:bg-oro/20 text-caption font-black text-oro/60 hover:text-oro uppercase tracking-wider transition-all ninja-clip-xs shadow-sm"
                      >
                        <span>ENLACE DE PRUEBA {i + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex-none p-6 border-t border-oro/15 bg-neutral-700 text-center">
              <button
                onClick={() => setSelectedCombat(null)}
                className="px-8 py-3 ninja-btn-oro text-xs font-black tracking-widest uppercase"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
