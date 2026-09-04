'use client';

import { useState, useEffect } from 'react';
import { AdminService } from '@/services/supabase/admin.service';
import { NotificacionAdmin } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { Check, X, ShieldAlert, MessageSquare, Eye, Image as ImageIcon, Sparkles, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import RegistroCard from '@/components/registros/RegistroCard';
import { createClient } from '@/utils/supabase/client';
import { ProfileService } from '@/services/supabase/profile.service';

export default function AdminDisputePage() {
  const [disputes, setDisputes] = useState<NotificacionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistro, setSelectedRegistro] = useState<any>(null);
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();
  const router = useRouter();

  const fetchDisputes = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }
      const profile = await ProfileService.getProfile(user.id);
      const userRoles = profile?.roles || [];
      const hasAccess = userRoles.includes('admin') || userRoles.includes('moderador') || userRoles.includes('narrador');
      if (!hasAccess) {
        window.location.href = '/admin';
        return;
      }

      const isNarradorOnly = userRoles.includes('narrador') && !userRoles.includes('admin') && !userRoles.includes('moderador');

      const data = await AdminService.getDisputes();
      let filteredData = data as any[];

      if (isNarradorOnly) {
        filteredData = filteredData.filter(d =>
          d.registro?.subtipo === 'recuperacion_evento' || d.registro?.tipo === 'narracion'
        );
      }

      setDisputes(filteredData);
    } catch (err) {
      console.error(err);
      addToast('Error al cargar disputas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();

    const supabase = createClient();
    const channel = supabase
      .channel('admin_disputes_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sys_notificaciones_admin'
        },
        () => {
          fetchDisputes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleResolve = async (id: string, action: 'aceptada' | 'rechazada') => {
    const dispute = disputes.find(d => d.id === id);
    const isCloneAlert = dispute ? (dispute.registro_id === null && dispute.personaje_id === null) : false;
    const isAppeal = dispute ? (dispute.registro_id === null && dispute.personaje_id !== null) : false;
    const isRecuperacion = dispute?.registro?.subtipo === 'recuperacion_evento';

    let title = '';
    let message = '';

    if (isCloneAlert) {
      title = action === 'aceptada' ? 'Aceptar Apelación de IP' : 'Desestimar Alerta de Clon';
      message = action === 'aceptada'
        ? '¿Estás seguro de que quieres aceptar la apelación de esta IP? Se añadirá la dirección IP de conexión a la white list para evitar futuros avisos de duplicados de estos usuarios.'
        : '¿Estás seguro de desestimar esta alerta? Se marcará el aviso como resuelto sin añadir la IP a la white list.';
    } else if (isAppeal) {
      title = action === 'aceptada' ? 'Aceptar Apelación' : 'Rechazar Apelación';
      message = action === 'aceptada'
        ? '¿Estás seguro de que quieres aceptar la apelación? Se restaurará la ficha de este shinobi.'
        : '¿Estás seguro de que quieres rechazar la apelación? La ficha seguirá archivada.';
    } else if (isRecuperacion) {
      title = action === 'aceptada' ? 'Aceptar Recuperación de Evento' : 'Rechazar Recuperación';
      message = action === 'aceptada'
        ? '¿Estás seguro de aceptar la recuperación de este evento? Se otorgarán las recompensas base correspondientes a los shinobis implicados.'
        : '¿Estás seguro de rechazar esta solicitud de recuperación? No se otorgarán recompensas.';
    } else {
      title = action === 'aceptada' ? 'Aceptar Disputa' : 'Invalidar Registro';
      message = action === 'aceptada'
        ? '¿Estás seguro de que quieres aceptar la disputa? Se darán las recompensas correspondientes al jugador.'
        : '¿Estás seguro de que quieres invalidar el registro? Se retirarán las recompensas de todos los implicados.';
    }

    const ok = await confirmAction({
      title,
      message,
      variant: action === 'aceptada' ? 'primary' : 'danger'
    });

    if (!ok) return;

    try {
      await AdminService.resolveDispute(id, action);
      let successMsg = '';
      if (isCloneAlert) {
        successMsg = action === 'aceptada' ? 'IP añadida a white list con éxito' : 'Alerta de clon resuelta y archivada';
      } else if (isAppeal) {
        successMsg = action === 'aceptada' ? 'Apelación aceptada y ficha restaurada' : 'Apelación de ficha rechazada';
      } else if (isRecuperacion) {
        successMsg = action === 'aceptada' ? 'Recuperación de evento aceptada con éxito' : 'Recuperación de evento rechazada';
      } else {
        successMsg = action === 'aceptada' ? 'Disputa resuelta a favor del jugador' : 'Registro invalidado y recompensas revertidas';
      }
      addToast(successMsg, 'success');
      fetchDisputes();
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleParticipantStatus = async (registroId: number, personajeId: number, estado: 'aceptada' | 'rechazada') => {
    const nuevoEstado = estado === 'aceptada' ? 'aceptado' : 'rechazado';

    // Actualización optimista de estado local
    setDisputes(prevDisputes => {
      return prevDisputes.map(d => {
        if (Number(d.registro_id) === Number(registroId)) {
          const updatedParticipantes = (d.registro?.participantes || []).map((p: any) => {
            if (Number(p.personaje_id) === Number(personajeId)) {
              return { ...p, estado: nuevoEstado };
            }
            return p;
          });

          const hasPendings = updatedParticipantes.some((p: any) => p.estado === 'pendiente' || p.estado === 'disputa_admin');
          if (!hasPendings) {
            return null; // Si ya no quedan participantes pendientes, eliminar la disputa de la lista local
          }

          return {
            ...d,
            registro: {
              ...d.registro,
              participantes: updatedParticipantes
            }
          };
        }
        return d;
      }).filter(Boolean) as NotificacionAdmin[];
    });

    try {
      const res = await fetch('/api/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_participant_status',
          id: registroId,
          payload: { personaje_id: personajeId, estado: nuevoEstado }
        })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Error al actualizar estado');
      }

      addToast(`Personaje ${nuevoEstado === 'aceptado' ? 'aceptado' : 'rechazado'} correctamente`, 'success');
      await fetchDisputes();
    } catch (err: any) {
      addToast(err.message, 'error');
      fetchDisputes(); // Revertir en caso de error
    }
  };

  return (
    <>
      <div className="max-w-[1750px]">
        <header className="mb-6 ninja-card-oro p-8 xl:p-10">
          <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-caption font-black uppercase tracking-[0.3em] group">
            <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
            VOLVER AL PANEL CENTRAL
          </Link>

          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-naranja-naruto/10 border border-oro/25 flex items-center justify-center shadow-[0_0_15px_rgba(103,9,9,0.4)]">
              <ShieldAlert className="w-6 h-6 text-oro animate-pulse" />
            </div>
            <div>
              <h1 className="ninja-title text-4xl xl:text-5xl italic">CENTRO DE DISPUTAS Y REVISIÓN</h1>
              <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">RESOLUCIÓN DE CONFLICTOS Y REVISIÓN DE RECUPERACIONES DE EVENTOS</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-naranja-naruto/20 border-t-oro rounded-full animate-spin mx-auto mb-4" />
            <p className="text-oro/40 text-xs font-black uppercase tracking-[0.3em] italic">Cargando casos...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-24 text-center ninja-card-oro">
            <Check className="w-16 h-16 text-oro/20 mx-auto mb-4 opacity-20" />
            <p className="text-oro/40 font-black uppercase italic tracking-[0.3em] text-sm">SIN DISPUTAS O REVISIONES PENDIENTES</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10">
            {disputes.map((d) => {
              const isRecuperacion = d.registro?.subtipo === 'recuperacion_evento';
              const imageUrls: string[] = d.registro?.data?.urls_imagenes || [];
              const participantes: any[] = d.registro?.participantes || [];

              return (
                <div key={d.id} className="ninja-card-oro p-8 xl:p-10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-none border border-oro/30 bg-black/60 overflow-hidden flex items-center justify-center shrink-0 shadow-md ninja-clip-xs">
                          {d.personaje?.url_img ? (
                            <img src={d.personaje.url_img} alt="Avatar" className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="text-oro font-black text-lg">{d.personaje?.nombre_ninja?.charAt(0).toUpperCase() || 'P'}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-oro font-black text-xl uppercase tracking-wider italic flex items-center gap-2">
                            {d.personaje?.nombre_ninja || 'Solicitante'}
                          </h3>
                          {d.registro_id === null ? (
                            <span className="text-caption text-oro/40 font-bold uppercase tracking-[0.2em] mt-0.5 block">
                              Apelación de Shinobi
                            </span>
                          ) : isRecuperacion ? (
                            <span className="text-caption text-oro/40 font-bold uppercase tracking-[0.2em] mt-0.5 block">
                              Solicitud de Recuperación de Evento
                            </span>
                          ) : (
                            <span className="text-caption text-oro/40 font-bold uppercase tracking-[0.2em] mt-0.5 block">
                              Rechazó: <span className="text-oro/70">"{d.registro?.data?.titulo || 'Registro sin título'}"</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-6 bg-black/40 border border-oro/15 ninja-clip-md space-y-4">
                        <MessageSquare className="absolute -top-3.5 -left-3.5 w-8 h-8 text-oro/10 rotate-6 pointer-events-none" />
                        <p className="text-oro/90 text-xs sm:text-sm leading-relaxed italic font-medium">"{d.mensaje}"</p>

                        {/* Imágenes de roleo adjuntas */}
                        {imageUrls.length > 0 && (
                          <div className="pt-3 border-t border-oro/10">
                            <span className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] block mb-2 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-oro/60" />
                              Escenas de Roleo Adjuntas ({imageUrls.length}):
                            </span>
                            <div className="flex flex-wrap gap-3">
                              {imageUrls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-1.5 bg-black/60 border border-oro/20 hover:border-oro hover:bg-oro/10 text-oro/80 hover:text-oro text-caption font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ninja-clip-xs"
                                >
                                  <Eye className="w-3.5 h-3.5 text-oro" />
                                  <span>Ver Imagen #{idx + 1}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lista limpia de personajes participantes en la solicitud */}
                      {participantes.length > 0 && (
                        <div className="p-4 bg-black/40 border border-oro/15 ninja-clip-sm space-y-2">
                          <span className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] block">
                            Personajes en la Solicitud ({participantes.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {participantes.map((part, idx) => (
                              <span
                                key={part.id || part.personaje_id || idx}
                                className="text-xs font-black text-oro bg-oro/5 border border-oro/15 px-3.5 py-1.5 ninja-clip-xs flex items-center gap-2 uppercase tracking-wider"
                              >
                                {part.personaje?.nombre_ninja || `Personaje #${part.personaje_id}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-8 pt-2">
                        <div className="flex flex-col">
                          <span className="text-caption font-black text-oro/30 uppercase tracking-[0.2em]">
                            {d.registro_id === null ? 'Tipo de Caso' : 'Tipo de Registro'}
                          </span>
                          <span className="text-xs font-black text-oro uppercase mt-0.5 tracking-wider bg-oro/10 border border-oro/20 px-2.5 py-0.5 ninja-clip-xs">
                            {d.registro_id === null ? 'Apelación de Recuperación' : isRecuperacion ? 'RECUPERACIÓN EVENTO' : d.registro?.tipo}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-caption font-black text-oro/30 uppercase tracking-[0.2em]">Fecha de Envío</span>
                          <span className="text-xs font-black text-oro/70 uppercase mt-0.5 tracking-wider">{new Date(d.created_at).toLocaleDateString()} {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 justify-center min-w-[240px] shrink-0 self-stretch lg:self-center">
                      <button
                        onClick={() => handleResolve(d.id, 'aceptada')}
                        className="w-full py-3 px-6 bg-white text-naranja-naruto hover:bg-white/90 font-black text-caption xl:text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ninja-clip-xs"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        {d.registro_id === null && d.personaje_id === null
                          ? 'Añadir a Whitelist'
                          : d.registro_id === null
                          ? 'ACEPTAR APELACIÓN'
                          : isRecuperacion
                          ? 'ACEPTAR RECUPERACIÓN'
                          : 'ACEPTAR DISPUTA'}
                      </button>
                      <button
                        onClick={() => handleResolve(d.id, 'rechazada')}
                        className="w-full py-3 px-6 bg-naranja-naruto hover:brightness-125 text-oro font-black text-caption xl:text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ninja-clip-xs"
                      >
                        <X className="w-4 h-4 stroke-[2.5]" />
                        {d.registro_id === null && d.personaje_id === null
                          ? 'Archivar'
                          : d.registro_id === null
                          ? 'RECHAZAR APELACIÓN'
                          : isRecuperacion
                          ? 'RECHAZAR RECUPERACIÓN'
                          : 'INVALIDAR REGISTRO'}
                      </button>
                      {d.registro_id !== null && (d.registro as any)?.tipo !== 'narracion' && (d.registro as any)?.subtipo !== 'recuperacion_evento' && (
                        <button
                          onClick={() => setSelectedRegistro(d.registro)}
                          className="w-full py-3 px-6 bg-black/80 text-oro border border-oro/30 hover:border-oro hover:bg-oro/10 font-black text-caption xl:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ninja-clip-xs"
                        >
                          <Eye className="w-4 h-4 stroke-[2.5]" /> INSPECCIONAR REGISTRO
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Inspección (Portal) */}
      {selectedRegistro && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-all duration-500"
            onClick={() => setSelectedRegistro(null)}
          />
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col ninja-card-oro shadow-[0_0_80px_rgba(0,0,0,0.9)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden">
            <div className="flex-none p-8 border-b border-oro/15 flex justify-between items-center bg-gradient-to-r from-naranja-naruto/20 to-transparent backdrop-blur-md relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-oro via-naranja-naruto to-transparent" />
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 bg-naranja-naruto rotate-45 shadow-[0_0_10px_#b82020] animate-pulse" />
                <h3 className="text-oro font-black uppercase tracking-[0.35em] text-xs pt-1 ninja-title">Protocolo de Inspección en Disputa</h3>
              </div>
              <button
                onClick={() => setSelectedRegistro(null)}
                className="p-3 bg-naranja-naruto/15 text-naranja-naruto border border-naranja-naruto/30 hover:bg-naranja-naruto hover:text-oro transition-all active:scale-95 cursor-pointer ninja-clip-xs"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
              <div className="animate-in fade-in duration-700 delay-300">
                <RegistroCard registro={selectedRegistro} />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
