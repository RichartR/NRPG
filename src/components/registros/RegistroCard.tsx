'use client';

import { Registro } from '@/domain/types';
import { Zap, ScrollText, Swords, User, Link as LinkIcon, Trash2, Edit3, Loader2, ShoppingBag, Sparkles, Swords as VS, Users, Coins } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { useState } from 'react';

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

  const isOwner = activeCharacter?.id === registro.autor_id;
  const canManage = registro.tipo === 'accion' ? isAdmin : (isOwner || isAdmin);

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
    switch (registro.tipo) {
      case 'mision': return ScrollText;
      case 'combate': return Swords;
      case 'compra': return ShoppingBag;
      default: return Zap;
    }
  };

  const calculateParticipantXP = (team: 'A' | 'B', huye?: boolean) => {
    const config = registro.data.config_xp;
    if (!config) return 0;
    if (huye) return 0;
    if (registro.data.ganador === 'Empate') return Number(config.retirarse) || 0;
    if (registro.data.ganador === 'A') return team === 'A' ? (Number(config.ganar) || 0) : (Number(config.perder) || 0);
    if (registro.data.ganador === 'B') return team === 'B' ? (Number(config.ganar) || 0) : (Number(config.perder) || 0);
    return 0;
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
      return registro.participantes.map(p => ({
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

  return (
    <div className={`ninja-card-oro group hover-ninja transition-all relative overflow-hidden ${isCombate ? (isGlobalView ? 'p-6 sm:p-8 xl:p-8' : 'p-8 xl:p-12') : 'p-6 sm:p-8 xl:p-10'}`}>
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
        <Icon className={`${isCombate ? 'w-32 h-32' : 'w-24 h-24'} rotate-12`} />
      </div>

      <div className={`flex justify-between items-center ${isGlobalView ? 'mb-6' : 'mb-8'} relative z-10`}>
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-oro/10 border border-oro/20 ninja-clip-xs shrink-0">
            <User className="w-6 h-6 text-oro/60" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm xl:text-lg font-black uppercase tracking-[0.2em] text-oro leading-none mb-1">
              {authorName}
            </span>
            <span className="text-[10px] font-bold text-oro/40 uppercase tracking-[0.2em] flex items-center gap-2">
              {new Date(registro.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="w-1 h-1 bg-oro/20 rotate-45" />
              {new Date(registro.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {registro.data.fecha_modificacion && (
              <span className="text-[9px] font-black text-rojo-sangre uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
                MODIFICADO: {new Date(registro.data.fecha_modificacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(registro.data.fecha_modificacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {canManage && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onEdit?.(registro)}
                className="w-11 h-11 flex items-center justify-center bg-oro/10 border border-oro/30 hover:border-oro hover:bg-oro/20 text-oro/80 hover:text-oro transition-all ninja-clip-xs shadow-lg shadow-black/20"
                title="Editar Registro"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="w-11 h-11 flex items-center justify-center bg-red-600/10 border border-red-600/40 hover:border-red-500 hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs shadow-lg shadow-black/20"
                title="Eliminar Registro"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-oro" /> : <Trash2 className="w-5 h-5" />}
              </button>
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
                <div className="flex items-center gap-2 text-oro/30 text-[10px] font-black uppercase tracking-widest mr-2">
                  <Users className="w-4 h-4" /> PARTICIPANTES:
                </div>
                {participants.map((p, i) => (
                  <span key={i} className="text-[11px] font-black text-oro/60 uppercase tracking-widest px-4 py-1.5 bg-oro/5 border border-oro/10 ninja-clip-xs">
                    {p.nombre_ninja}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-8 sm:gap-12 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest mb-2">RECOMPENSA</span>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-oro font-black text-base sm:text-xl tracking-widest">
                    <Sparkles className="w-4 h-4" /> +{registro.data.recompensa_xp || 0}
                  </div>
                  <div className="w-px h-6 bg-oro/10" />
                  <div className="flex items-center gap-2 text-oro font-black text-base sm:text-xl tracking-widest">
                    <Coins className="w-4 h-4" /> +{registro.data.recompensa_ryous || 0}
                  </div>
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
              <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest mb-2">INVERSIÓN</span>
              <div className="flex items-center gap-2 text-oro font-black text-base sm:text-xl tracking-widest">
                <Coins className="w-4 h-4" /> {registro.data.coste_ryous || 0} R
              </div>
            </div>
          </div>
        ) : registro.subtipo === 'evento_premios' ? (
          <div className="p-6 bg-black/40 border border-oro/10 ninja-clip-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-oro/5 pb-4 gap-4">
              <div>
                <h4 className="text-lg sm:text-xl font-black text-oro uppercase tracking-wider mb-1">
                  {registro.data.titulo || 'Reparto de Premios'}
                </h4>
                <p className="text-[10px] font-bold text-oro/40 uppercase tracking-widest">REGISTRO DE PREMIOS DE EVENTO</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-3 bg-oro/5 border border-oro/10 ninja-clip-xs shrink-0 text-[10px] sm:text-xs font-black text-oro">
                <div className="flex items-center gap-1.5">EXP: +{registro.data.global_xp || 0}</div>
                <div className="w-px h-4 bg-oro/10" />
                <div className="flex items-center gap-1.5">RYOUS: +{registro.data.global_ryous || 0}</div>
                {registro.data.global_monedas_evento > 0 && (
                  <>
                    <div className="w-px h-4 bg-oro/10" />
                    <div className="flex items-center gap-1.5">M. EVENTO: +{registro.data.global_monedas_evento}</div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-[9px] font-black text-oro/30 uppercase tracking-[0.25em] block">PREMIOS INDIVIDUALES POR SHINOBI:</span>
              <div className="overflow-x-auto custom-scrollbar border border-oro/10 ninja-clip-sm bg-black/45">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-oro/10 bg-black/40 text-[9px] font-black uppercase tracking-[0.2em] text-oro/50">
                      <th className="py-4 px-6">Shinobi</th>
                      <th className="py-4 px-6 text-center">EXP Extra</th>
                      <th className="py-4 px-6 text-center">Ryous Extra</th>
                      <th className="py-4 px-6 text-center">Monedas Evento</th>
                      <th className="py-4 px-6">Otros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-oro/5 font-bold text-oro/70 uppercase">
                    {registro.data.participantes_premios?.map((p: any) => (
                      <tr key={p.personaje_id} className="hover:bg-oro/[0.02] transition-colors">
                        <td className="py-4 px-6 text-xs font-black text-oro uppercase tracking-wider">{p.nombre_ninja}</td>
                        <td className="py-4 px-6 text-center text-[11px]">
                          {p.xp_extra > 0 ? (
                            <span className="text-oro font-black">+{p.xp_extra} EXP</span>
                          ) : (
                            <span className="text-oro/20">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-[11px]">
                          {p.ryous_extra > 0 ? (
                            <span className="text-oro font-black">+{p.ryous_extra} RYOUS</span>
                          ) : (
                            <span className="text-oro/20">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-[11px]">
                          {p.monedas_evento > 0 ? (
                            <span className="text-oro font-black">+{p.monedas_evento} M. EVENTO</span>
                          ) : (
                            <span className="text-oro/20">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {p.glosario_items && p.glosario_items.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {p.glosario_items.map((i: any) => (
                                <span key={i.id} className="text-[9px] font-black bg-oro/10 border border-oro/20 text-oro px-2.5 py-0.5 ninja-clip-xs">
                                  {i.nombre_es}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-oro/20">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
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
              </div>
              {participants.filter((p: any) => p.id !== registro.autor_id).length > 0 && (
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="text-[9px] font-black text-oro/20 uppercase tracking-widest mr-2">Participantes:</span>
                  {participants.filter((p: any) => p.id !== registro.autor_id).map((p: any, i: number) => (
                    <span key={i} className="text-[10px] font-black text-oro/40 uppercase tracking-widest px-3 py-1 bg-oro/5 border border-oro/10 ninja-clip-xs">
                      {p.nombre_ninja}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {(registro.data.gasto_xp !== undefined || registro.data.gasto_ryous !== undefined) && (
              <div className="flex flex-col items-center shrink-0 p-4 border-l border-oro/10 min-w-[120px]">
                <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest mb-2">Coste</span>
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
            {!showFullDetails && !isGlobalView ? (
              <div className="p-6 sm:p-8 bg-black/40 border border-oro/5 ninja-clip-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <VS className="w-5 h-5 text-oro/40" />
                    <span className="text-xs font-black text-oro/40 uppercase tracking-[0.3em]">Resumen de Combate</span>
                    {registro.data.ganador === 'Empate' ? (
                      <span className="text-[10px] font-black text-oro border border-oro/20 px-2 py-0.5">EMPATE</span>
                    ) : (
                      <span className={`text-[10px] font-black px-2 py-0.5 border ${(registro.data.ganador === 'A' && registro.data.equipo_a?.some((p: any) => p.id === (subjectId || registro.autor_id))) ||
                        (registro.data.ganador === 'B' && registro.data.equipo_b?.some((p: any) => p.id === (subjectId || registro.autor_id)))
                        ? 'text-[#a7f3d0] border-emerald-500/30 bg-[#064e3b]/80'
                        : 'text-[#fecaca] border-red-500/30 bg-[#7f1d1d]/80'
                        }`}>
                        {(registro.data.ganador === 'A' && registro.data.equipo_a?.some((p: any) => p.id === (subjectId || registro.autor_id))) ||
                          (registro.data.ganador === 'B' && registro.data.equipo_b?.some((p: any) => p.id === (subjectId || registro.autor_id)))
                          ? 'VICTORIA' : 'DERROTA'}
                      </span>
                    )}
                  </div>

                  <p className="text-lg xl:text-xl font-medium text-oro/80 leading-relaxed italic">
                    {(() => {
                      const sid = subjectId || registro.autor_id;
                      const sName = authorName;
                      const teamA = registro.data.equipo_a || [];
                      const teamB = registro.data.equipo_b || [];
                      const isA = teamA.some((p: any) => p.id === sid);

                      const allies = (isA ? teamA : teamB).filter((p: any) => p.id !== sid).map((p: any) => p.nombre_ninja);
                      const enemies = (isA ? teamB : teamA).map((p: any) => p.nombre_ninja);
                      const xpGained = calculateParticipantXP(isA ? 'A' : 'B', (isA ? teamA : teamB).find((p: any) => p.id === sid)?.huye);

                      return (
                        <>
                          <span className="font-black text-oro not-italic">{sName}</span> combati{allies.length > 0 ? 'ó junto a ' : 'ó '}
                          {allies.length > 0 && <span className="text-oro">{formatNinjaList(allies)}</span>}
                          {allies.length > 0 ? ' contra ' : ' contra '}
                          <span className="text-oro">{formatNinjaList(enemies)}</span>.
                          Obtiene <span className="font-black text-oro not-italic">{xpGained} EXP</span>.
                        </>
                      );
                    })()}
                  </p>
                </div>

                <button
                  onClick={() => setShowFullDetails(true)}
                  className="ninja-btn-ghost px-6 py-3 text-[10px] focus:outline-none focus:ring-0"
                >
                  Ver registro completo
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-2 duration-500 outline-none ring-0 border-none">
                {!isGlobalView && (
                  <div className="flex justify-between items-center mb-8 border-b border-oro/10 pb-4">
                    <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">Informe Detallado</span>
                    <button
                      onClick={() => setShowFullDetails(false)}
                      className="text-[10px] font-black text-oro/40 hover:text-oro uppercase tracking-widest border-b border-oro/20 focus:outline-none focus:ring-0"
                    >
                      Contraer resumen
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-10 lg:gap-16 items-start">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-oro/10 pb-4">
                      <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">Bando A</span>
                      {registro.data.ganador === 'A' && <span className="text-[9px] font-black text-oro bg-oro/10 px-2 py-0.5 ninja-clip-xs border border-oro/20">GANADOR</span>}
                    </div>
                    <div className="space-y-4">
                      {registro.data.equipo_a?.map((p: any) => (
                        <div key={p.id} className="p-4 bg-black/40 border border-oro/5 ninja-clip-xs space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-oro uppercase tracking-widest">{p.nombre_ninja}</span>
                              <span className="text-[10px] font-black text-oro/60 bg-oro/5 px-2 py-0.5 border border-oro/10">+{calculateParticipantXP('A', p.huye)} EXP</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {p.has_estado_alterado && <span className="px-2 py-0.5 bg-oro/20 text-oro text-[9px] font-black uppercase ninja-clip-xs border border-oro/40">ESTADO ALTERADO</span>}
                              {p.huye && <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-black uppercase ninja-clip-xs border border-orange-500/40">HUYE</span>}
                              <span className="text-[10px] font-black text-oro/70 uppercase">{p.estado_nombre || 'SIN ESTADO'}</span>
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

                  <div className="flex lg:flex-col items-center justify-center gap-6 lg:self-center">
                    <div className="h-px lg:w-px lg:h-12 bg-oro/40 w-full opacity-20" />
                    <div className="flex flex-col items-center gap-2">
                      {registro.data.ganador === 'Empate' ? (
                        <span className="font-black text-oro text-2xl xl:text-4xl uppercase tracking-[0.2em]">RETIRADO</span>
                      ) : (
                        <span className="font-ninja text-3xl xl:text-5xl text-oro italic opacity-20">VS</span>
                      )}
                    </div>
                    <div className="h-px lg:w-px lg:h-12 bg-oro/40 w-full opacity-20" />
                  </div>

                  <div className="space-y-6 lg:text-right">
                    <div className="flex items-center lg:flex-row-reverse gap-3 border-b border-oro/10 pb-4">
                      <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">Bando B</span>
                      {registro.data.ganador === 'B' && <span className="text-[9px] font-black text-oro bg-oro/10 px-2 py-0.5 ninja-clip-xs border border-oro/20">GANADOR</span>}
                    </div>
                    <div className="space-y-4">
                      {registro.data.equipo_b?.map((p: any) => (
                        <div key={p.id} className="p-4 bg-black/40 border border-oro/5 ninja-clip-xs space-y-3">
                          <div className="flex justify-between items-center lg:flex-row-reverse">
                            <div className="flex items-center gap-3 lg:flex-row-reverse">
                              <span className="text-sm font-black text-oro uppercase tracking-widest">{p.nombre_ninja}</span>
                              <span className="text-[10px] font-black text-oro/60 bg-oro/5 px-2 py-0.5 border border-oro/10">+{calculateParticipantXP('B', p.huye)} EXP</span>
                            </div>
                            <div className="flex items-center gap-3 lg:flex-row-reverse">
                              {p.has_estado_alterado && <span className="px-2 py-0.5 bg-oro/20 text-oro text-[9px] font-black uppercase ninja-clip-xs border border-oro/40">ESTADO ALTERADO</span>}
                              {p.huye && <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-black uppercase ninja-clip-xs border border-orange-500/40">HUYE</span>}
                              <span className="text-[10px] font-black text-oro/70 uppercase">{p.estado_nombre || 'SIN ESTADO'}</span>
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
              </div>
            )}
          </div>
        )}

        {registro.data.urls_imagenes && registro.data.urls_imagenes.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-4 relative z-10">
            <span className="text-[9px] font-black text-oro/20 uppercase tracking-widest mr-2">PRUEBAS VISUALES:</span>
            <div className="flex flex-wrap gap-3">
              {registro.data.urls_imagenes.map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-oro/5 border border-oro/10 hover:border-oro/40 hover:bg-oro/10 text-[9px] font-black text-oro/40 hover:text-oro uppercase tracking-widest transition-all ninja-clip-xs"
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
