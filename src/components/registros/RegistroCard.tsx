'use client';

import { Registro } from '@/domain/types';
import { Zap, ScrollText, Swords, User, Link as LinkIcon, Trash2, Edit3, Loader2, ShoppingBag, Sparkles, Swords as VS, Users, Coins, HeartPulse, Dices, ShieldAlert } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { useState, useEffect } from 'react';
import { RewardLogic } from '@/domain/character/logic';
import { renderDiscordMarkdown } from '@/lib/discord/renderDiscordMarkdown';

interface RegistroCardProps {
  registro: Registro;
  onRefresh?: () => void;
  onEdit?: (reg: Registro) => void;
  isAdmin?: boolean;
  subjectId?: number;
  isGlobalView?: boolean;
}

export default function RegistroCard({ registro, onRefresh, onEdit, isAdmin, subjectId, isGlobalView }: RegistroCardProps) {
  const { activeCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();
  const [loading, setLoading] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [discordContent, setDiscordContent] = useState<string | null>(registro.data?.texto_entrega || null);

  useEffect(() => {
    if (!discordContent && registro.data?.discord_message_id) {
      fetch(`/api/discord/messages?messageId=${registro.data.discord_message_id}&categoria=evento`)
        .then(res => res.json())
        .then(data => {
          if (data && data.content) {
            setDiscordContent(data.content);
          }
        })
        .catch(err => console.error('Error fetching rewards text from Discord:', err));
    }
  }, [registro.data?.discord_message_id]);

  const isOwner = activeCharacter?.id === registro.autor_id;
  const canEdit = registro.tipo === 'accion' ? isAdmin : (isOwner || isAdmin);
  const canDelete = (registro.tipo === 'combate' || registro.tipo === 'accion') ? isAdmin : (isOwner || isAdmin);

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: 'Eliminar Registro',
      message: '¿Estás seguro de que quieres eliminar este registro permanentemente?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;

    setLoading(true);
    try {
      await RegistrosService.deleteRegistro(registro.id);
      addToast('Registro eliminado', 'success');
      onRefresh?.();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (registro.subtipo === 'sanacion' || registro.data?.subtipo === 'sanacion') return HeartPulse;
    if (registro.subtipo === 'intervencion' || registro.data?.subtipo === 'intervencion' || !!registro.data?.es_intervencion) return ShieldAlert;
    if (registro.subtipo === 'narracion' || registro.subtipo === 'recuperacion_evento' || registro.subtipo === 'recuperacion_narracion') return Sparkles;
    switch (registro.tipo) {
      case 'mision': return ScrollText;
      case 'combate': return Swords;
      case 'compra': return ShoppingBag;
      default: return Zap;
    }
  };

  const calculateParticipantXP = (team: 'A' | 'B', huye?: boolean, huyeGanaExp?: boolean) => {
    const config = registro.data.config_xp;
    if (!config) return 0;
    if (huye && !huyeGanaExp) return 0;
    if (registro.data.ganador === 'Empate') return 0;

    // Fallback if config is old format
    if (!config.victoria) {
      if (registro.data.ganador === 'A') return team === 'A' ? (Number(config.ganar) || 0) : (Number(config.perder) || 0);
      if (registro.data.ganador === 'B') return team === 'B' ? (Number(config.ganar) || 0) : (Number(config.perder) || 0);
      return 0;
    }

    const RANK_SCALE: Record<string, number> = { 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };

    const teamA = registro.data.equipo_a || [];
    const teamB = registro.data.equipo_b || [];

    const maxRankA = teamA.reduce((max: number, p: any) => {
      const val = RANK_SCALE[(p.rango || 'D').toUpperCase()] || 1;
      return val > max ? val : max;
    }, 1);

    const maxRankB = teamB.reduce((max: number, p: any) => {
      const val = RANK_SCALE[(p.rango || 'D').toUpperCase()] || 1;
      return val > max ? val : max;
    }, 1);

    const isWinner = registro.data.ganador === team;
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

    if (isWinner) {
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

  const formatNinjaList = (names: string[]) => {
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    const last = names[names.length - 1];
    const rest = names.slice(0, -1);
    return `${rest.join(', ')} y ${last}`;
  };

  const Icon = getIcon();

  const getParticipants = () => {
    if (registro.data.participantes_historicos && Array.isArray(registro.data.participantes_historicos)) {
      return registro.data.participantes_historicos;
    }
    if (registro.participantes && registro.participantes.length > 0) {
      return registro.participantes.map((p: any) => ({
        id: p.personaje_id,
        nombre_ninja: p.personaje?.nombre_ninja || 'Ninja Desaparecido'
      }));
    }
    return [{ id: registro.autor_id, nombre_ninja: registro.autor?.nombre_ninja || 'Autor Desconocido' }];
  };

  const participants = getParticipants();
  const authorName = registro.autor?.nombre_ninja ||
    registro.data.autor_admin?.username ||
    registro.data.participantes_historicos?.find((p: any) => p.id === registro.autor_id)?.nombre_ninja ||
    'Ninja Desaparecido';

  const isCombate = registro.tipo === 'combate';
  const totalParticipants = (registro.data.equipo_a?.length || 0) + (registro.data.equipo_b?.length || 0);
  const isCompact = isCombate && totalParticipants <= 2;

  return (
    <div className={`ninja-card-oro group hover-ninja transition-all relative overflow-hidden ${isCombate ? (isCompact ? 'p-5 sm:p-6' : isGlobalView ? 'p-6 sm:p-8 xl:p-8' : 'p-8 xl:p-12') : 'p-6 sm:p-8 xl:p-10'}`}>
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
        <Icon className={`${isCombate ? 'w-32 h-32' : 'w-24 h-24'} rotate-12`} />
      </div>

      <div className={`flex justify-between items-center ${isGlobalView ? 'mb-6' : 'mb-8'} relative z-10`}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-black/40 border border-oro/20 ninja-clip-xs shrink-0 overflow-hidden flex items-center justify-center">
            {registro.subtipo === 'narracion' ? (
              <img
                src="/assets/images/narracion.webp"
                alt="Narración"
                className="w-full h-full object-cover"
              />
            ) : registro.autor?.url_img ? (
              <img
                src={registro.autor.url_img}
                alt={authorName}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <User className="w-6 h-6 text-oro/60" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm xl:text-lg font-black uppercase tracking-[0.2em] text-oro leading-none mb-1">
              {authorName}
            </span>
            <span className="text-caption font-bold text-oro/40 uppercase tracking-[0.2em] flex items-center gap-2">
              {new Date(registro.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="w-1 h-1 bg-oro/20 rotate-45" />
              {new Date(registro.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {registro.data.fecha_modificacion && (
              <span className="text-caption font-black text-naranja-naruto uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
                MODIFICADO: {new Date(registro.data.fecha_modificacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(registro.data.fecha_modificacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {(canEdit || canDelete) && (
            <div className="flex items-center gap-3">
              {canEdit && (
                <button
                  onClick={() => onEdit?.(registro)}
                  className="w-11 h-11 flex items-center justify-center bg-oro/10 border border-oro/30 hover:border-oro hover:bg-oro/20 text-oro/80 hover:text-oro transition-all ninja-clip-xs shadow-lg shadow-black/20"
                  title="Editar Registro"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-11 h-11 flex items-center justify-center bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs shadow-lg shadow-black/20"
                  title="Eliminar Registro"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin text-oro" /> : <Trash2 className="w-5 h-5" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10">
        {registro.tipo === 'mision' ? (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 sm:p-8 bg-black/40 border border-oro/5 ninja-clip-sm">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <ScrollText className="w-5 h-5 text-oro/40" />
                <span className="text-xs font-black text-oro/40 uppercase tracking-[0.3em]">Misión</span>
                <span className="text-lg sm:text-2xl font-black text-oro uppercase tracking-widest">{registro.data.codigo_mision}</span>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-oro/30 text-caption font-black uppercase tracking-widest mr-2">
                  <Users className="w-4 h-4" /> PARTICIPANTES:
                </div>
                {participants.map((p: any, i: number) => (
                  <span key={i} className="text-[11px] font-black text-oro/60 uppercase tracking-widest px-4 py-1.5 bg-oro/5 border border-oro/10 ninja-clip-xs">
                    {p.nombre_ninja}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-8 sm:gap-12 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-caption font-black text-oro/30 uppercase tracking-widest mb-2">RECOMPENSA</span>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-oro font-black text-base sm:text-xl tracking-widest">
                    <Sparkles className="w-4 h-4" /> +{registro.data.recompensa_xp || 0}
                  </div>
                  <div className="w-px h-6 bg-oro/10" />
                  <div className="flex items-center gap-2 text-oro font-black text-base sm:text-xl tracking-widest">
                    <Coins className="w-4 h-4" /> +{registro.data.recompensa_ryous || 0}
                  </div>
                  {(registro.data.recompensa_pa || 0) > 0 && (
                    <>
                      <div className="w-px h-6 bg-oro/10" />
                      <div className="flex items-center gap-2 text-emerald-400 font-black text-base sm:text-xl tracking-widest">
                        <Swords className="w-4 h-4" /> +{registro.data.recompensa_pa} PA
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : registro.tipo === 'compra' ? (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 sm:p-8 bg-black/40 border border-oro/5 ninja-clip-sm">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-oro/40" />
                <span className="text-xs font-black text-oro/40 uppercase tracking-[0.3em]">ADQUISICIÓN</span>
              </div>
              <h4 className="text-lg sm:text-2xl font-black text-oro uppercase tracking-widest">
                {registro.data.objeto || 'STATS'}
              </h4>
            </div>
            <div className="flex flex-col items-center shrink-0">
              <span className="text-caption font-black text-oro/30 uppercase tracking-widest mb-2">INVERSIÓN</span>
              <div className="flex items-center gap-2 text-oro font-black text-base sm:text-xl tracking-widest">
                <Coins className="w-4 h-4" /> {registro.data.coste_ryous || 0} R
              </div>
            </div>
          </div>
        ) : (registro.subtipo === 'sanacion' || registro.data?.subtipo === 'sanacion') ? (
          <div className="p-4 sm:p-5 bg-black/40 ninja-clip-sm space-y-3">
            <div className="border-b border-oro/20 pb-2.5">
              <p className="text-caption font-bold text-oro/40 uppercase tracking-widest mt-0.5">
                NINJA SANADO: <span className="text-emerald-300 font-black">{registro.data.sanado?.nombre_ninja || 'Sin especificar'}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Médicos */}
              <div className="p-3 bg-black/40 border border-oro/10 ninja-clip-xs space-y-2">
                <span className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] block">MÉDICOS PARTICIPANTES:</span>
                <div className="flex flex-wrap gap-1.5">
                  {registro.data.medicos && registro.data.medicos.length > 0 ? (
                    registro.data.medicos.map((m: any, idx: number) => (
                      <span key={idx} className="text-caption font-black text-oro bg-oro/10 border border-oro/20 px-2.5 py-0.5 ninja-clip-xs flex items-center gap-1.5">
                        <User className="w-3 h-3 text-oro/60" /> {m.nombre_ninja} <span className="text-emerald-400">+1 EXP</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-caption font-bold text-oro/30 italic">Sin médicos adicionales</span>
                  )}
                </div>
              </div>

              {/* Desglose Tirada */}
              <div className="p-3 bg-black/40 border border-emerald-500/10 ninja-clip-xs space-y-1 text-xs font-bold uppercase tracking-wider">
                <span className="text-caption font-black text-emerald-400/60 block tracking-[0.2em]">DESGLOSE DEL EFECTO:</span>
                <div className="flex justify-between text-oro/70 text-caption">
                  <span>Base técnica + médicos:</span>
                  <span>{registro.data.horas_base || (2 + ((registro.data.medicos?.length || 0) * 2))}h ({2}h + {registro.data.medicos?.length || 0} med)</span>
                </div>
                <div className="flex justify-between text-oro/70 text-caption">
                  <span>Tirada d10:</span>
                  <span>+{registro.data.tirada_d10 || 0}h</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-black border-t border-emerald-500/10 pt-1 text-caption sm:text-xs">
                  <span>Total horas restadas:</span>
                  <span>{registro.data.horas_restadas || 0} horas</span>
                </div>
              </div>
            </div>
          </div>
        ) : registro.subtipo === 'evento_premios' ? (
          <div className="p-6 bg-black/40 border border-oro/10 ninja-clip-sm space-y-6">
            <div className="border-b border-oro/5 pb-4">
              <h4 className="text-lg sm:text-xl font-black text-oro uppercase tracking-wider mb-1">
                {registro.data.titulo || 'Reparto de Premios'}
              </h4>
              <p className="text-caption font-bold text-oro/40 uppercase tracking-widest">REGISTRO DE PREMIOS DE EVENTO</p>
            </div>

            {registro.data.url_imagen && (
              <div className="overflow-hidden border border-oro/20 ninja-clip-sm max-h-[300px] bg-black/60">
                <img
                  src={registro.data.url_imagen}
                  alt="Banner del Reparto de Premios"
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {discordContent && (
              <div className="p-4 bg-black/40 border-l-2 border-oro/40 text-lg text-oro/90 font-medium italic">
                {renderDiscordMarkdown(discordContent)}
              </div>
            )}

            {/* Premios Globales */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <span className="text-sm sm:text-base font-black text-white uppercase tracking-[0.25em]">PREMIOS GLOBALES (PARA TODOS):</span>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm sm:text-base font-black text-oro">
                <div className="flex items-center gap-1.5">EXP: +{registro.data.global_xp || 0}</div>
                <div className="w-px h-5 bg-oro/20" />
                <div className="flex items-center gap-1.5">RYOUS: +{registro.data.global_ryous || 0}</div>
                {Number(registro.data.global_pa) > 0 && (
                  <>
                    <div className="w-px h-5 bg-oro/20" />
                    <div className="flex items-center gap-1.5">PA: +{registro.data.global_pa}</div>
                  </>
                )}
                {registro.data.global_monedas_evento > 0 && (
                  <>
                    <div className="w-px h-5 bg-oro/20" />
                    <div className="flex items-center gap-1.5">M. EVENTO: +{registro.data.global_monedas_evento}</div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-sm sm:text-base font-black text-white uppercase tracking-[0.25em] block">PREMIOS INDIVIDUALES POR SHINOBI:</span>
              <div className="overflow-x-auto custom-scrollbar border-2 border-oro/30 ninja-clip-sm bg-black/60 shadow-xl shadow-black/80">
                <table className="w-full text-left border-collapse text-sm sm:text-base">
                  <thead>
                    <tr className="border-b-2 border-oro/30 bg-black/70 text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-white">
                      <th className="py-4 px-6 border-r border-oro/15 last:border-r-0">Shinobi</th>
                      <th className="py-4 px-6 text-center border-r border-oro/15 last:border-r-0">EXP Extra</th>
                      <th className="py-4 px-6 text-center border-r border-oro/15 last:border-r-0">Ryous Extra</th>
                      <th className="py-4 px-6 text-center border-r border-oro/15 last:border-r-0">PA Extra</th>
                      <th className="py-4 px-6 text-center border-r border-oro/15 last:border-r-0">Monedas Evento</th>
                      <th className="py-4 px-6 border-r border-oro/15 last:border-r-0">Otros / Rasgos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-oro/15 font-bold text-oro/70 uppercase">
                    {registro.data.participantes_premios?.map((p: any) => (
                      <tr key={p.personaje_id} className="hover:bg-oro/[0.04] transition-colors">
                        <td className="py-4 px-6 text-sm sm:text-base font-black uppercase tracking-wider text-white border-r border-oro/15 last:border-r-0 flex items-center justify-between gap-2">
                          <span>{p.nombre_ninja}</span>
                          {p.recuperado && (
                            <span className="text-[10px] bg-naranja-naruto/20 border border-naranja-naruto/40 text-naranja-naruto px-2 py-0.5 ninja-clip-xs font-black tracking-widest">
                              Recuperado
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-sm sm:text-base border-r border-oro/15 last:border-r-0">
                          {p.xp_extra > 0 ? (
                            <span className="text-white font-black">+{p.xp_extra} EXP</span>
                          ) : (
                            <span className="text-white/40">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-sm sm:text-base border-r border-oro/15 last:border-r-0">
                          {p.ryous_extra > 0 ? (
                            <span className="text-white font-black">+{p.ryous_extra} RYOUS</span>
                          ) : (
                            <span className="text-white/40">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-sm sm:text-base border-r border-oro/15 last:border-r-0">
                          {p.pa_extra > 0 ? (
                            <span className="text-emerald-400 font-black">+{p.pa_extra} PA</span>
                          ) : (
                            <span className="text-white/40">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-sm sm:text-base border-r border-oro/15 last:border-r-0">
                          {p.monedas_evento > 0 ? (
                            <span className="text-white font-black">+{p.monedas_evento} M. EVENTO</span>
                          ) : (
                            <span className="text-white/40">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 border-r border-oro/15 last:border-r-0">
                          <div className="flex flex-wrap gap-2">
                            {p.glosario_items?.map((i: any) => (
                              <span key={i.id} className="text-xs sm:text-sm font-black bg-oro/10 border border-oro/20 text-white px-3.5 py-1.5 ninja-clip-xs">
                                {i.nombre_es}
                              </span>
                            ))}
                            {p.rasgos_items?.map((r: any) => (
                              <span key={r.id} className={`text-caption font-black border px-2.5 py-0.5 ninja-clip-xs ${r.especial ? 'bg-purple-950/60 border-purple-500/40 text-purple-300' : 'bg-amber-950/60 border-amber-500/40 text-amber-300'}`}>
                                {r.especial && '[E] '}{r.nombre}
                              </span>
                            ))}
                            {(!p.glosario_items || p.glosario_items.length === 0) && (!p.rasgos_items || p.rasgos_items.length === 0) && (
                              <span className="text-oro/20">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (registro.subtipo === 'recuperacion_evento' || registro.subtipo === 'recuperacion_narracion') ? (
          <div className="p-6 bg-black/40 border border-oro/10 ninja-clip-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-oro/5 pb-4 gap-4">
              <div>
                <h4 className="text-lg sm:text-xl font-black text-oro uppercase tracking-wider mb-1">
                  {registro.data?.titulo || (registro.subtipo === 'recuperacion_narracion' ? 'Recuperación de Narración' : 'Recuperación de Evento')}
                </h4>
                <p className="text-caption font-bold text-oro/40 uppercase tracking-widest">
                  SOLICITUD DE RECUPERACIÓN DE RECOMPENSAS BASE
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-3 bg-oro/5 border border-oro/10 ninja-clip-xs shrink-0 text-caption sm:text-xs font-black text-oro">
                <div className="flex items-center gap-1.5">EXP: +{registro.data?.recuperado_xp ?? registro.data?.global_xp ?? 0}</div>
                <div className="w-px h-4 bg-oro/10" />
                <div className="flex items-center gap-1.5">RYOUS: +{registro.data?.recuperado_ryous ?? registro.data?.global_ryous ?? 0}</div>
                {(Number(registro.data?.recuperado_pa ?? registro.data?.global_pa) > 0) && (
                  <>
                    <div className="w-px h-4 bg-oro/10" />
                    <div className="flex items-center gap-1.5">PA: +{registro.data?.recuperado_pa ?? registro.data?.global_pa}</div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-caption font-black text-oro/30 uppercase tracking-[0.25em] block">
                PARTICIPANTES EN LA ESCENA DE ROLEO:
              </span>
              <div className="flex flex-wrap gap-2">
                {participants.map((p: any, i: number) => (
                  <span key={i} className="text-xs font-black text-oro uppercase tracking-wider px-3.5 py-1.5 bg-oro/5 border border-oro/10 ninja-clip-xs">
                    {p.nombre_ninja}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : registro.subtipo === 'narracion' ? (
          <div className="p-6 bg-black/40 border border-oro/10 ninja-clip-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-oro/5 pb-4 gap-4">
              <div>
                <h4 className="text-lg sm:text-xl font-black text-oro uppercase tracking-wider mb-1">
                  {registro.data.titulo || 'Registro de Narración'}
                </h4>
                <p className="text-caption font-bold text-oro/40 uppercase tracking-widest flex items-center gap-2">
                  <span>NARRADOR: {registro.data.narrador || 'Sin especificar'}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-3 bg-oro/5 border border-oro/10 ninja-clip-xs shrink-0 text-caption sm:text-xs font-black text-oro">
                <div className="flex items-center gap-1.5">EXP GLOBAL: +{registro.data.global_xp || 0}</div>
                <div className="w-px h-4 bg-oro/10" />
                <div className="flex items-center gap-1.5">RYOUS GLOBAL: +{registro.data.global_ryous || 0}</div>
                {Number(registro.data.global_pa) > 0 && (
                  <>
                    <div className="w-px h-4 bg-oro/10" />
                    <div className="flex items-center gap-1.5 text-emerald-400">PA GLOBAL: +{registro.data.global_pa}</div>
                  </>
                )}
                {Number(registro.data.global_monedas_evento) > 0 && (
                  <>
                    <div className="w-px h-4 bg-oro/10" />
                    <div className="flex items-center gap-1.5">M. EVENTO: +{registro.data.global_monedas_evento}</div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-caption font-black text-oro/30 uppercase tracking-[0.25em] block">RECOMPENSAS Y PARTICIPANTES:</span>
              <div className="overflow-x-auto custom-scrollbar border border-oro/10 ninja-clip-sm bg-black/45">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-oro/10 bg-black/40 text-caption font-black uppercase tracking-[0.2em] text-oro/50">
                      <th className="py-4 px-6">Shinobi</th>
                      <th className="py-4 px-6 text-center">EXP Total</th>
                      <th className="py-4 px-6 text-center">Ryous Total</th>
                      <th className="py-4 px-6 text-center">PA Total</th>
                      <th className="py-4 px-6 text-center">Monedas Evento</th>
                      <th className="py-4 px-6">Glosario / Rasgos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-oro/5 font-bold text-oro/70 uppercase">
                    {registro.data.participantes_premios?.map((p: any) => {
                      const totalXp = (Number(registro.data.global_xp) || 0) + (Number(p.xp_extra) || 0);
                      const totalRyous = (Number(registro.data.global_ryous) || 0) + (Number(p.ryous_extra) || 0);
                      const totalPa = (Number(registro.data.global_pa) || 0) + (Number(p.pa_extra) || 0);
                      const totalMonedas = (Number(registro.data.global_monedas_evento) || 0) + (Number(p.monedas_evento) || 0);

                      return (
                        <tr key={p.personaje_id} className="hover:bg-oro/[0.02] transition-colors">
                          <td className="py-4 px-6 text-xs font-black text-oro uppercase tracking-wider">{p.nombre_ninja}</td>
                          <td className="py-4 px-6 text-center text-[11px] font-black text-green-700">+{totalXp} EXP</td>
                          <td className="py-4 px-6 text-center text-[11px] font-black text-green-700">+{totalRyous} RYOUS</td>
                          <td className="py-4 px-6 text-center text-[11px]">
                            {totalPa > 0 ? (
                              <span className="text-emerald-400 font-black">+{totalPa} PA</span>
                            ) : (
                              <span className="text-oro/20">-</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center text-[11px]">
                            {totalMonedas > 0 ? (
                              <span className="text-oro font-black">+{totalMonedas} M. EVENTO</span>
                            ) : (
                              <span className="text-oro/20">-</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-1.5">
                              {p.glosario_items?.map((i: any) => (
                                <span key={i.id} className="text-caption font-black bg-oro/10 border border-oro/20 text-oro px-2.5 py-0.5 ninja-clip-xs">
                                  {i.nombre_es}
                                </span>
                              ))}
                              {p.rasgos_items?.map((r: any) => (
                                <span key={r.id} className={`text-caption font-black border px-2.5 py-0.5 ninja-clip-xs ${r.especial ? 'bg-purple-950/60 border-purple-500/40 text-purple-300' : 'bg-amber-950/60 border-amber-500/40 text-amber-300'}`}>
                                  {r.especial && '[E] '}{r.nombre}
                                </span>
                              ))}
                              {(!p.glosario_items || p.glosario_items.length === 0) && (!p.rasgos_items || p.rasgos_items.length === 0) && (
                                <span className="text-oro/20">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : registro.tipo === 'accion' ? (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 sm:p-2 bg-black/40 border border-oro/5 ninja-clip-sm">
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-lg sm:text-2xl font-black text-oro uppercase tracking-widest mb-1">
                  {registro.data.titulo || 'Acción General'}
                </h4>
                {registro.data.subtitulo && (
                  <p className="text-xs text-oro/50 uppercase tracking-wider mt-1">
                    {registro.data.subtitulo}
                  </p>
                )}
              </div>
              {participants.filter((p: any) => p.id !== registro.autor_id).length > 0 && (
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-caption font-black text-oro/20 uppercase tracking-widest mr-2">Participantes:</span>
                  {participants.filter((p: any) => p.id !== registro.autor_id).map((p: any, i: number) => (
                    <span key={i} className="text-caption font-black text-oro/40 uppercase tracking-widest px-3 py-1 bg-oro/5 border border-oro/10 ninja-clip-xs">
                      {p.nombre_ninja}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {(registro.data.gasto_xp !== undefined || registro.data.gasto_ryous !== undefined) && (
              <div className="flex flex-col items-center shrink-0 p-4 border-l border-oro/10 min-w-[120px]">
                <span className="text-caption font-black text-oro/30 uppercase tracking-widest mb-2">Coste</span>
                <div className="flex flex-col gap-2 items-end w-full">
                  {registro.data.gasto_xp !== undefined && (
                    <div className="flex items-center gap-2 text-oro font-black text-sm tracking-widest">
                      {registro.data.gasto_xp} EXP
                    </div>
                  )}
                  {registro.data.gasto_ryous !== undefined && (
                    <div className="flex items-center gap-2 text-oro font-black text-sm tracking-widest">
                      {registro.data.gasto_ryous} RYOUS
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {(() => {
              const isIntervencion = registro.subtipo === 'intervencion' || registro.data?.subtipo === 'intervencion' || !!registro.data?.es_intervencion;
              const sid = subjectId || registro.autor_id;
              const teamA = registro.data.equipo_a || [];
              const teamB = registro.data.equipo_b || [];
              const isA = teamA.some((p: any) => p.id === sid);
              const isEmpate = registro.data.ganador === 'Empate';
              const won = (registro.data.ganador === 'A' && isA) || (registro.data.ganador === 'B' && !isA);

              if (!showFullDetails && !isGlobalView) {
                return (
                  <div className="p-6 sm:p-8 bg-black/40 border border-oro/5 ninja-clip-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <VS className="w-5 h-5 text-oro/40" />
                        <span className="text-xs font-black text-oro/40 uppercase tracking-[0.3em]">
                          {isIntervencion 
                            ? `Intervención: Misión ${registro.data.codigo_mision || ''} (Rango ${registro.data.mision_rango || 'B'})` 
                            : 'Resumen de Combate'}
                        </span>
                        {isEmpate ? (
                          <span className="text-caption font-black text-oro border border-oro/20 px-2 py-0.5">EMPATE</span>
                        ) : (
                          <span className={`text-caption font-black px-2 py-0.5 border ${
                            won
                              ? 'text-success-text border-success-text/30 bg-success-bg/80'
                              : 'text-error-text border-error-text/30 bg-error-bg/80'
                          }`}>
                            {won 
                              ? (isIntervencion ? 'VICTORIA (MISIÓN COMPLETADA)' : 'VICTORIA') 
                              : (isIntervencion ? 'DERROTA (MISIÓN FALLIDA)' : 'DERROTA')}
                          </span>
                        )}
                      </div>

                      <p className="text-lg xl:text-xl font-medium text-oro/80 leading-relaxed italic">
                        {(() => {
                          const sName = authorName;
                          const allies = (isA ? teamA : teamB).filter((p: any) => p.id !== sid).map((p: any) => p.nombre_ninja);
                          const enemies = (isA ? teamB : teamA).map((p: any) => p.nombre_ninja);
                          const participantObj = (isA ? teamA : teamB).find((p: any) => p.id === sid);
                          const rewards = RewardLogic.calculateReward(registro, sid);
                          const xpGained = isIntervencion ? rewards.xp : calculateParticipantXP(isA ? 'A' : 'B', participantObj?.huye, participantObj?.huye_gana_exp);
                          const paGained = isIntervencion ? rewards.pa : RewardLogic.calculateCombatPA(registro, sid);
                          const ryousGained = rewards.ryous || 0;

                          return (
                            <>
                              <span className="font-black text-oro not-italic">{sName}</span> combati{allies.length > 0 ? 'ó junto a ' : 'ó '}
                              {allies.length > 0 && <span className="text-oro">{formatNinjaList(allies)}</span>}
                              {allies.length > 0 ? ' contra ' : ' contra '}
                              <span className="text-oro">{formatNinjaList(enemies)}</span>.
                              Obtiene <span className="font-black text-oro not-italic">+{xpGained} EXP</span>
                              {paGained > 0 && <> y <span className="font-black text-emerald-400 not-italic">+{paGained} PA</span></>}
                              {ryousGained > 0 && <> y <span className="font-black text-amber-300 not-italic">+{ryousGained} Ryous</span></>}.
                            </>
                          );
                        })()}
                      </p>
                    </div>

                    <button
                      onClick={() => setShowFullDetails(true)}
                      className="ninja-btn-ghost px-6 py-3 text-caption focus:outline-none focus:ring-0"
                    >
                      Ver registro completo
                    </button>
                  </div>
                );
              }

              return (
                <div className="animate-in fade-in slide-from-top-2 duration-500 outline-none ring-0 border-none space-y-6">
                  {!isGlobalView && (
                    <div className={`flex justify-between items-center ${isCompact ? 'mb-4' : 'mb-8'} border-b border-oro/10 ${isCompact ? 'pb-2' : 'pb-4'}`}>
                      <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">
                        {isIntervencion ? 'Informe de Intervención' : 'Informe Detallado'}
                      </span>
                      <button
                        onClick={() => setShowFullDetails(false)}
                        className="text-caption font-black text-oro/40 hover:text-oro uppercase tracking-widest border-b border-oro/20 focus:outline-none focus:ring-0"
                      >
                        Contraer resumen
                      </button>
                    </div>
                  )}

                  {/* Banner de Misión Intervenida */}
                  {isIntervencion && (
                    <div className="p-4 bg-black/40 border border-oro/15 ninja-clip-xs space-y-2 relative overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-oro/50 uppercase tracking-[0.25em]">
                                MISIÓN INTERVENIDA
                              </span>
                              <span className="text-[9px] font-black text-oro px-1.5 py-0.5 bg-oro/10 border border-oro/20 ninja-clip-xs">
                                RANGO {registro.data.mision_rango || 'B'}
                              </span>
                            </div>
                            <span className="text-sm font-black text-oro uppercase tracking-wider block mt-0.5">
                              <span className="text-oro/60">{registro.data.codigo_mision}:</span> {registro.data.mision_titulo || registro.data.mision_nombre || 'Misión'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 border border-oro/15 ninja-clip-xs text-[10px] font-black uppercase tracking-wider">
                            <span className="text-oro/40">Bando A:</span>
                            <span className={registro.data.bando_mision === 'A' ? 'text-oro' : 'text-oro/60'}>
                              {registro.data.bando_mision === 'A' ? 'Realizador' : 'Interventor'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 border border-oro/15 ninja-clip-xs text-[10px] font-black uppercase tracking-wider">
                            <span className="text-oro/40">Bando B:</span>
                            <span className={registro.data.bando_mision === 'B' ? 'text-oro' : 'text-oro/60'}>
                              {registro.data.bando_mision === 'B' ? 'Realizador' : 'Interventor'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Cabeceras de Bandos */}
                    <div className={`grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr] items-center border-b border-oro/10 ${isCompact ? 'pb-2' : 'pb-4'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">Bando A</span>
                        {isIntervencion && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-oro/10 border border-oro/20 text-oro ninja-clip-xs">
                            {registro.data.bando_mision === 'A' ? 'REALIZADOR' : 'INTERVENTOR'}
                          </span>
                        )}
                        {registro.data.ganador === 'A' && <span className="text-caption font-black text-oro bg-oro/10 px-2 py-0.5 ninja-clip-xs border border-oro/20">GANADOR</span>}
                      </div>
                      {/* Espaciador central invisible en desktop para mantener la rejilla perfectamente alineada */}
                      <div className="hidden lg:block w-[72px]" />
                      <div className="flex items-center lg:flex-row-reverse gap-3 text-right justify-end">
                        <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">Bando B</span>
                        {isIntervencion && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-oro/10 border border-oro/20 text-oro ninja-clip-xs">
                            {registro.data.bando_mision === 'B' ? 'REALIZADOR' : 'INTERVENTOR'}
                          </span>
                        )}
                        {registro.data.ganador === 'B' && <span className="text-caption font-black text-oro bg-oro/10 px-2 py-0.5 ninja-clip-xs border border-oro/20">GANADOR</span>}
                      </div>
                    </div>

                    {/* Cuerpo de Participantes y VS */}
                    <div className={`grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] ${isCompact ? 'gap-4 lg:gap-8' : 'gap-10 lg:gap-16'} items-center`}>
                      <div className={isCompact ? 'space-y-2' : 'space-y-4'}>
                        {registro.data.equipo_a?.map((p: any) => {
                          const pRewards = RewardLogic.calculateReward(registro, p.id);
                          const pXp = isIntervencion ? pRewards.xp : calculateParticipantXP('A', p.huye, p.huye_gana_exp);
                          const pPa = isIntervencion ? pRewards.pa : RewardLogic.calculateCombatPA(registro, p.id);
                          const pRyous = pRewards.ryous || 0;

                          return (
                            <div key={p.id} className={`${isCompact ? 'py-2 px-3' : 'p-4'} bg-black/40 border border-oro/5 ninja-clip-xs space-y-2`}>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-black text-oro uppercase tracking-widest">{p.nombre_ninja}</span>
                                  <span className="text-caption font-black text-oro/60 bg-oro/5 px-2 py-0.5 border border-oro/10">+{pXp} EXP</span>
                                  {pPa > 0 && (
                                    <span className="text-caption font-black text-emerald-400/90 bg-emerald-500/5 px-2 py-0.5 border border-success-text/10">+{pPa} PA</span>
                                  )}
                                  {pRyous > 0 && (
                                    <span className="text-caption font-black text-amber-300/90 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">+{pRyous} R</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  {p.has_estado_alterado && <span className="px-2 py-0.5 bg-oro/20 text-oro text-caption font-black uppercase ninja-clip-xs border border-oro/40">ESTADO ALTERADO</span>}
                                  {p.has_cds && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-caption font-black uppercase ninja-clip-xs border border-blue-400/40">CDs</span>}
                                  {p.huye && (
                                    <span className={`px-2 py-0.5 text-caption font-black uppercase ninja-clip-xs border ${
                                      p.huye_gana_exp 
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                                        : 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                                    }`}>
                                      {p.huye_gana_exp ? 'HUYE (GANA EXP)' : 'HUYE'}
                                    </span>
                                  )}
                                  <span className="text-caption font-black text-oro/70 uppercase">{p.estado_nombre || 'SIN ESTADO'}</span>
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

                      <div className="flex lg:flex-col items-center justify-center gap-4 self-center py-2 shrink-0">
                        <div className="h-px lg:w-px lg:h-8 bg-oro/40 w-full opacity-20" />
                        <div className="flex flex-col items-center gap-2">
                          {registro.data.ganador === 'Empate' ? (
                            <span className="font-black text-oro text-xl xl:text-2xl uppercase tracking-[0.25em]">RETIRADO</span>
                          ) : (
                            <span className="font-ninja text-3xl xl:text-4xl text-oro italic opacity-20">VS</span>
                          )}
                        </div>
                        <div className="h-px lg:w-px lg:h-8 bg-oro/40 w-full opacity-20" />
                      </div>

                      <div className={isCompact ? 'space-y-2' : 'space-y-4'}>
                        {registro.data.equipo_b?.map((p: any) => {
                          const pRewards = RewardLogic.calculateReward(registro, p.id);
                          const pXp = isIntervencion ? pRewards.xp : calculateParticipantXP('B', p.huye, p.huye_gana_exp);
                          const pPa = isIntervencion ? pRewards.pa : RewardLogic.calculateCombatPA(registro, p.id);
                          const pRyous = pRewards.ryous || 0;

                          return (
                            <div key={p.id} className={`${isCompact ? 'py-2 px-3' : 'p-4'} bg-black/40 border border-oro/5 ninja-clip-xs space-y-2`}>
                              <div className="flex justify-between items-center lg:flex-row-reverse">
                                <div className="flex items-center gap-3 lg:flex-row-reverse">
                                  <span className="text-sm font-black text-oro uppercase tracking-widest">{p.nombre_ninja}</span>
                                  <span className="text-caption font-black text-oro/60 bg-oro/5 px-2 py-0.5 border border-oro/10">+{pXp} EXP</span>
                                  {pPa > 0 && (
                                    <span className="text-caption font-black text-emerald-400/90 bg-emerald-500/5 px-2 py-0.5 border border-success-text/10">+{pPa} PA</span>
                                  )}
                                  {pRyous > 0 && (
                                    <span className="text-caption font-black text-amber-300/90 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">+{pRyous} R</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 lg:flex-row-reverse">
                                  {p.has_estado_alterado && <span className="px-2 py-0.5 bg-oro/20 text-oro text-caption font-black uppercase ninja-clip-xs border border-oro/40">ESTADO ALTERADO</span>}
                                  {p.has_cds && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-caption font-black uppercase ninja-clip-xs border border-blue-400/40">CDs</span>}
                                  {p.huye && (
                                    <span className={`px-2 py-0.5 text-caption font-black uppercase ninja-clip-xs border ${
                                      p.huye_gana_exp 
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                                        : 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                                    }`}>
                                      {p.huye_gana_exp ? 'HUYE (GANA EXP)' : 'HUYE'}
                                    </span>
                                  )}
                                  <span className="text-caption font-black text-oro/70 uppercase">{p.estado_nombre || 'SIN ESTADO'}</span>
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
              );
            })()}
          </div>
        )}

        {registro.data.urls_imagenes && registro.data.urls_imagenes.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-4 relative z-10">
            <span className="text-caption font-black text-oro/20 uppercase tracking-widest mr-2">PRUEBAS:</span>
            <div className="flex flex-wrap gap-3">
              {registro.data.urls_imagenes.map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-oro/5 border border-oro/10 hover:border-oro/40 hover:bg-oro/10 text-caption font-black text-oro/40 hover:text-oro uppercase tracking-widest transition-all ninja-clip-xs"
                >
                  <LinkIcon className="w-3 h-3" /> PRUEBA {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
