'use client';

import { useState, useEffect } from 'react';
import { Registro } from '@/domain/types';
import { Link as LinkIcon, Edit3, Trash2, Loader2, Sparkles, Coins, Eye, X, User } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { renderDiscordMarkdown } from '@/lib/discord/renderDiscordMarkdown';
import { Portal } from '@/components/ui/Portal';

interface NarrationTableProps {
  narraciones: Registro[];
  onRefresh?: () => void;
  onEdit?: (reg: Registro) => void;
  isAdmin?: boolean;
  initialViewingRegistro?: Registro | null;
}

export default function NarrationTable({ narraciones, onRefresh, onEdit, isAdmin, initialViewingRegistro = null }: NarrationTableProps) {
  const { activeCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [viewingRegistro, setViewingRegistro] = useState<Registro | null>(initialViewingRegistro);

  useEffect(() => {
    if (initialViewingRegistro) {
      setViewingRegistro(initialViewingRegistro);
    }
  }, [initialViewingRegistro]);

  const getParticipants = (n: Registro) => {
    if (n.data.participantes_historicos && Array.isArray(n.data.participantes_historicos)) {
      return n.data.participantes_historicos;
    }
    if (n.participantes && n.participantes.length > 0) {
      return n.participantes.map(p => ({
        id: p.personaje_id,
        nombre_ninja: p.personaje?.nombre_ninja || 'Ninja Desaparecido'
      }));
    }
    return [{ id: n.autor_id, nombre_ninja: n.autor?.nombre_ninja || 'Autor Desconocido' }];
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Registro de Narración',
      message: '¿Estás seguro de que quieres eliminar esta narración permanentemente?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;

    setLoadingId(id);
    try {
      await RegistrosService.deleteRegistro(id);
      addToast('Registro de narración eliminado correctamente', 'success');
      onRefresh?.();
    } catch (err: any) {
      addToast(err.message || 'Error al eliminar la narración', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
          <thead>
            <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em]">
              <th className="py-3 px-5 w-[16%]">Fecha</th>
              <th className="py-3 px-5 w-[15%]">Narrador</th>
              <th className="py-3 px-5 w-[22%]">Participantes</th>
              <th className="py-3 px-5 w-[22%]">Información y Recompensas</th>
              <th className="py-3 px-5 w-[15%]">Pruebas</th>
              <th className="py-3 px-5 text-right w-[10%]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-oro/5 bg-black/40">
            {narraciones.map((n) => {
              const participants = getParticipants(n);
              const isOwner = activeCharacter?.id === n.autor_id;
              const canManage = isOwner || isAdmin;

              return (
                <tr key={n.id} className="hover:bg-oro/5 transition-colors group">
                  {/* Fecha */}
                  <td className="py-3 px-5">
                    <div className="flex flex-col justify-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-oro/80 uppercase tracking-wider">
                          {new Date(n.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-caption font-bold text-oro/30 uppercase tracking-widest mt-0.5">
                          {new Date(n.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {n.data.fecha_modificacion && (
                        <div className="flex flex-col border-t border-error-text/30 pt-1.5">
                          <span className="text-[7px] font-black text-red-500/60 uppercase tracking-widest">
                            MODIFICADO
                          </span>
                          <span className="text-caption font-black text-red-400 uppercase tracking-wider mt-0.5">
                            {new Date(n.data.fecha_modificacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-caption font-bold text-red-500/60 uppercase tracking-widest mt-0.5">
                            {new Date(n.data.fecha_modificacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Narrador */}
                  <td className="py-3 px-5 font-black text-oro tracking-widest text-xs uppercase leading-relaxed">
                    {n.data.narrador || 'Sin narrador'}
                  </td>

                  {/* Participantes */}
                  <td className="py-3 px-5">
                    <div className="flex flex-wrap gap-2 max-w-[300px]">
                      {participants.map((p, idx) => (
                        <span
                          key={idx}
                          className="text-caption font-black text-oro/70 uppercase tracking-widest px-2.5 py-1 bg-oro/5 border border-oro/10 ninja-clip-xs"
                        >
                          {p.nombre_ninja}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Información y Recompensas */}
                  <td className="py-3 px-5">
                    <button
                      onClick={() => setViewingRegistro(n)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-oro/10 border border-oro/30 hover:border-oro hover:bg-oro/20 text-oro text-caption font-black uppercase tracking-wider transition-all ninja-clip-xs cursor-pointer shadow-sm active:scale-95"
                      title="Ver detalles de la narración y desglose de premios"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver detalles</span>
                    </button>
                  </td>

                  {/* Pruebas */}
                  <td className="py-3 px-5">
                    <div className="flex flex-wrap gap-2 max-w-[200px]">
                      {n.data.urls_imagenes && n.data.urls_imagenes.length > 0 ? (
                        n.data.urls_imagenes.map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-oro/5 border border-oro/10 hover:border-oro/40 hover:bg-oro/10 text-caption font-black text-oro/70 hover:text-oro uppercase tracking-widest transition-all ninja-clip-xs"
                            title={url}
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>PRUEBA {idx + 1}</span>
                          </a>
                        ))
                      ) : (
                        <span className="text-caption text-oro/20 uppercase tracking-widest italic">Sin pruebas</span>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="py-3 px-5 text-right">
                    {canManage ? (
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => onEdit?.(n)}
                          className="p-2 bg-oro/10 border border-oro/30 hover:border-oro hover:bg-oro/20 text-oro/80 hover:text-oro transition-all ninja-clip-xs cursor-pointer"
                          title="Editar Registro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          disabled={loadingId === n.id}
                          className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs cursor-pointer"
                          title="Eliminar Registro"
                        >
                          {loadingId === n.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-oro" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-caption text-oro/20 uppercase tracking-widest italic font-black">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Vista de Narración (Ojo) */}
      {viewingRegistro && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setViewingRegistro(null)} />

            <div
              className="relative bg-neutral-800 border border-oro/30 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 ninja-card-oro no-hover overflow-hidden"
              style={{
                clipPath: 'polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px)'
              }}
            >
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-oro/15 flex justify-between items-center bg-black/40">
                <div>
                  <span className="text-caption font-black text-oro/60 uppercase tracking-[0.3em] block mb-1">
                    Escena de narración
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                    {viewingRegistro.data?.titulo || `Narración de ${viewingRegistro.data?.narrador || 'Staff'}`}
                  </h3>
                </div>
                <button
                  onClick={() => setViewingRegistro(null)}
                  className="p-3 bg-oro/5 border border-oro/20 hover:bg-oro hover:text-black text-oro rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-8">
                {/* Embed Replica Card */}
                <div className="space-y-3">
                  <span className="text-caption font-black uppercase tracking-[0.25em] text-oro/60 block">
                    Publicación de Discord (Embed)
                  </span>

                  <div className="bg-[#2b2d31] p-5 border-l-4 border-[#D6852D] font-sans space-y-4 shadow-2xl text-left rounded-r-md">
                    {/* Bot Header */}
                    <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                      <img
                        src="/assets/ui/logo.png"
                        alt="NRPG"
                        className="w-6 h-6 rounded-full object-cover border border-oro/30 shrink-0"
                      />
                      <span className="text-xs font-bold text-white">NRPG</span>
                      <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">BOT</span>
                      <span className="text-[10px] text-[#949ba4] ml-auto">
                        {new Date(viewingRegistro.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Markdown Body */}
                    <div className="text-xs text-[#dbdee1] leading-relaxed prose prose-invert max-w-none break-words">
                      {viewingRegistro.data?.discord_message_text ? (
                        renderDiscordMarkdown(viewingRegistro.data.discord_message_text)
                      ) : (
                        <span className="text-[#949ba4] italic select-none">Sin contenido escrito.</span>
                      )}
                    </div>

                    {/* Banner Image */}
                    {(viewingRegistro.data?.discord_image_url || viewingRegistro.data?.urls_imagenes?.[0]) && (
                      <div className="rounded border border-white/10 overflow-hidden my-2 max-h-64 bg-black/40">
                        <img
                          src={viewingRegistro.data?.discord_image_url || viewingRegistro.data?.urls_imagenes?.[0] || ''}
                          alt="Embed Banner"
                          className="w-full h-64 object-cover"
                        />
                      </div>
                    )}

                    {/* Link Field */}
                    <div className="pt-3 border-t border-white/5 space-y-1">
                      <span className="text-sm sm:text-base font-extrabold text-[#f2f3f5] flex items-center gap-2.5">
                        <img src="/assets/icons/naruto_scroll.png" alt="Scroll" className="w-7 h-7 object-contain shrink-0" />
                        Ver Registro y Recompensas
                      </span>
                      <span className="text-xs font-semibold text-[#00a8fc] underline block truncate">
                        https://nrpg.app/registros/narracion?id={viewingRegistro.id}
                      </span>
                    </div>

                    {/* Footer */}
                    <div className="text-[10px] text-[#949ba4] font-medium pt-2 flex flex-wrap justify-between items-center gap-2 border-t border-white/5">
                      <span>Narrador: {viewingRegistro.data?.narrador || 'Sistema'} • NRPG</span>
                    </div>
                  </div>
                </div>

                {/* Desglose de Participantes & Recompensas */}
                <div className="space-y-4 pt-4 border-t border-oro/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-oro/10 pb-3">
                    <h4 className="text-xs font-black uppercase tracking-[0.25em] text-oro">
                      Desglose de Premios y Participantes
                    </h4>
                  </div>

                  {/* Recompensas Globales Base */}
                  <div className="p-4 bg-oro/10 border border-oro/30 ninja-clip-xs space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-oro flex items-center gap-1.5">
                      Recompensas Globales Base (Todos los participantes las reciben)
                    </span>
                    <div className="flex flex-wrap gap-3 text-xs font-black">
                      <span className="text-emerald-400 bg-black/60 px-3 py-1 border border-emerald-500/30 rounded">
                        +{viewingRegistro.data?.global_xp || 0} EXP Base
                      </span>
                      <span className="text-emerald-400 bg-black/60 px-3 py-1 border border-emerald-500/30 rounded">
                        +{viewingRegistro.data?.global_ryous || 0} Ryos Base
                      </span>
                      <span className="text-emerald-400 bg-black/60 px-3 py-1 border border-emerald-500/30 rounded">
                        +{viewingRegistro.data?.global_pa || 0} PA Base
                      </span>
                      {Number(viewingRegistro.data?.global_monedas_evento) > 0 && (
                        <span className="text-emerald-400 bg-black/60 px-3 py-1 border border-emerald-500/30 rounded">
                          +{viewingRegistro.data.global_monedas_evento} M. Evento Base
                        </span>
                      )}
                    </div>
                  </div>

                  {viewingRegistro.data?.participantes_premios && viewingRegistro.data.participantes_premios.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {viewingRegistro.data.participantes_premios.map((p: any, idx: number) => {
                        const totalXp = (Number(viewingRegistro.data?.global_xp) || 0) + (Number(p.xp_extra) || 0);
                        const totalRyous = (Number(viewingRegistro.data?.global_ryous) || 0) + (Number(p.ryous_extra) || 0);
                        const totalPa = (Number(viewingRegistro.data?.global_pa) || 0) + (Number(p.pa_extra) || 0);
                        const totalME = (Number(viewingRegistro.data?.global_monedas_evento) || 0) + (Number(p.monedas_evento) || 0);

                        return (
                          <div key={idx} className="p-4 bg-black/70 border border-oro/40 shadow-xl shadow-black/60 ninja-clip-xs space-y-3">
                            <div className="flex items-center justify-between border-b border-oro/30 pb-2.5">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-oro shrink-0" />
                                <span className="text-xs font-black text-white uppercase tracking-wider">{p.nombre_ninja}</span>
                              </div>
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded shadow">
                                Total: +{totalXp} EXP
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                              <span className="text-emerald-400">+{totalXp} EXP (Total)</span>
                              <span className="text-emerald-400">+{totalRyous} Ryous (Total)</span>
                              <span className="text-emerald-400">+{totalPa} PA (Total)</span>
                              {totalME > 0 && <span className="text-emerald-400">+{totalME} M. Evento</span>}
                            </div>

                            {(p.xp_extra > 0 || p.ryous_extra > 0 || p.pa_extra > 0 || p.monedas_evento > 0) && (
                              <div className="text-[10px] text-oro/60 font-semibold italic pt-1 border-t border-white/5">
                                Incluye extra individual: +{p.xp_extra || 0} EXP, +{p.ryous_extra || 0} Ryos, +{p.pa_extra || 0} PA
                              </div>
                            )}

                            {p.glosario_items && p.glosario_items.length > 0 && (
                              <div className="pt-2 border-t border-oro/5 space-y-1">
                                <span className="text-[9px] font-black uppercase text-oro/50 block">Objetos/Técnicas Concedidas:</span>
                                <div className="flex flex-wrap gap-1">
                                  {p.glosario_items.map((item: any, i: number) => (
                                    <span key={i} className="text-[10px] font-black px-2 py-0.5 bg-neutral-900 border border-oro/20 text-oro uppercase tracking-wider">
                                      {item.nombre_es}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {p.rasgos_items && p.rasgos_items.length > 0 && (
                              <div className="pt-2 border-t border-oro/5 space-y-1">
                                <span className="text-[9px] font-black uppercase text-amber-500/70 block">Rasgos Concedidos:</span>
                                <div className="flex flex-wrap gap-1">
                                  {p.rasgos_items.map((r: any, i: number) => (
                                    <span key={i} className="text-[10px] font-black px-2 py-0.5 bg-amber-950/40 border border-amber-500/40 text-amber-300 uppercase tracking-wider">
                                      {r.nombre}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-caption font-black text-oro/40 uppercase tracking-widest italic">Sin desglose individual registrado</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
