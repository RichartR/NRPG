'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AdminService } from '@/services/supabase/admin.service';
import { ProfileService } from '@/services/supabase/profile.service';
import { NotificacionAdmin } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { ShieldAlert, Check, X, Eye } from 'lucide-react';
import { createPortal } from 'react-dom';
import RegistroCard from '@/components/registros/RegistroCard';
import Link from 'next/link';

interface AdminNotificationBadgeProps {
  isSidebar?: boolean;
  userRoles?: string[];
}

export default function AdminNotificationBadge({ isSidebar = false, userRoles = [] }: AdminNotificationBadgeProps) {
  const [effectiveRoles, setEffectiveRoles] = useState<string[]>(userRoles);
  const [count, setCount] = useState(0);
  const [disputes, setDisputes] = useState<NotificacionAdmin[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement | any>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  useEffect(() => {
    if (userRoles.length > 0) {
      setEffectiveRoles(userRoles);
    } else {
      async function loadRoles() {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const profile = await ProfileService.getProfile(user.id);
            if (profile?.roles) setEffectiveRoles(profile.roles);
          }
        } catch (e) {
          console.error('Error loading roles for notification badge:', e);
        }
      }
      loadRoles();
    }
  }, [userRoles]);

  const isAdminOrMod = effectiveRoles.some(r => ['admin', 'moderador'].includes(r));
  const isNarratorOnly = effectiveRoles.includes('narrador') && !isAdminOrMod;

  const fetchData = async () => {
    try {
      const disputesData = await AdminService.getDisputes();
      let filtered = (disputesData || []) as any[];

      if (isNarratorOnly) {
        filtered = filtered.filter(d =>
          d.registro?.subtipo === 'recuperacion_evento' || d.registro?.tipo === 'narracion'
        );
      }

      setDisputes(filtered);
      setCount(filtered.length);
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    }
  };

  // Re-fetch when open state or roles change
  useEffect(() => {
    fetchData();
  }, [isOpen, effectiveRoles]);

  // Set up real-time subscription
  useEffect(() => {
    fetchData();

    const supabase = createClient();
    const channel = supabase
      .channel('sys_notificaciones_admin_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sys_notificaciones_admin'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (selectedRegistro || target?.closest('.inspection-modal-container')) return;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      const dropdownWidth = isMobile ? 340 : 460;

      if (isSidebar) {
        // Position next to sidebar button
        setCoords({
          top: rect.top + window.scrollY,
          left: rect.right + window.scrollX + 12
        });
      } else {
        // Position below navbar button
        let left = rect.right + window.scrollX - dropdownWidth;
        const margin = 16;
        if (left < margin) {
          left = margin;
        }
        if (left + dropdownWidth > window.innerWidth - margin) {
          left = window.innerWidth - dropdownWidth - margin;
        }
        setCoords({
          top: rect.bottom + window.scrollY + 6,
          left: left
        });
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  const handleResolve = async (id: string, action: 'aceptada' | 'rechazada') => {
    const dispute = disputes.find(d => d.id === id);
    const isCloneAlert = dispute ? (dispute.registro_id === null && dispute.personaje_id === null) : false;
    const isAppeal = dispute ? (dispute.registro_id === null && dispute.personaje_id !== null) : false;

    const isRecuperacion = dispute?.registro?.subtipo === 'recuperacion_evento' || dispute?.registro?.subtipo === 'recuperacion_narracion';
    const isNarracionRecup = dispute?.registro?.subtipo === 'recuperacion_narracion';

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
      title = action === 'aceptada' 
        ? (isNarracionRecup ? 'Aceptar Recuperación de Narración' : 'Aceptar Recuperación de Evento')
        : (isNarracionRecup ? 'Rechazar Recuperación de Narración' : 'Rechazar Recuperación');
      message = action === 'aceptada'
        ? `¿Estás seguro de aceptar esta recuperación de ${isNarracionRecup ? 'narración' : 'evento'}? Se otorgarán las recompensas base correspondientes a los shinobis implicados.`
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
    setLoading(true);
    try {
      await AdminService.resolveDispute(id, action);
      let successMsg = '';
      if (isCloneAlert) {
        successMsg = action === 'aceptada' ? 'IP añadida a white list con éxito' : 'Alerta de clon resuelta y archivada';
      } else if (isAppeal) {
        successMsg = action === 'aceptada' ? 'Apelación aceptada y ficha restaurada' : 'Apelación rechazada';
      } else if (isRecuperacion) {
        successMsg = action === 'aceptada' 
          ? `Recuperación de ${isNarracionRecup ? 'narración' : 'evento'} aceptada con éxito` 
          : `Recuperación de ${isNarracionRecup ? 'narración' : 'evento'} rechazada`;
      } else {
        successMsg = action === 'aceptada' ? 'Disputa resuelta a favor del jugador' : 'Registro invalidado y recompensas revertidas';
      }
      addToast(successMsg, 'success');
      fetchData();
    } catch (err: any) {
      addToast(err.message || 'Error al resolver disputa', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      {isSidebar ? (
        <Link
          href="/admin/disputas"
          className="w-full flex items-center justify-between p-4 hover:bg-oro/[0.03] transition-all font-black text-xs xl:text-sm group relative overflow-hidden rounded-sm cursor-pointer border border-transparent"
        >
          <div className="flex items-center gap-4">
            <ShieldAlert className="w-4 h-4 text-oro/30 group-hover:text-oro transition-colors" />
            <span className="group-hover:translate-x-1 transition-transform uppercase tracking-widest text-left">Disputas</span>
          </div>
          {count > 0 && (
            <span className="px-2 py-0.5 bg-naranja-naruto text-oro text-caption font-black border border-oro/40 shadow-[0_0_8px_rgba(103,9,9,0.5)] ninja-clip-xs animate-pulse">
              {count}
            </span>
          )}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-oro transition-all opacity-0 group-hover:opacity-100" />
        </Link>
      ) : (
        <div className="relative inline-block">
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 px-6 py-3 bg-white text-naranja-naruto border border-white hover:bg-white/90 hover:brightness-110 transition-all group font-black text-xs uppercase tracking-[0.2em] cursor-pointer shadow-md"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            {isNarratorOnly ? 'DISPUTAS' : 'DISPUTAS ADMIN'}
          </button>
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-naranja-naruto text-white text-caption font-black flex items-center justify-center border border-white shadow-[0_0_10px_rgba(250,148,39,0.8)] animate-bounce pointer-events-none z-10">
              {count}
            </span>
          )}
        </div>
      )}

      {/* Real-time Admin Dropdown Menu */}
      {isOpen && !isSidebar && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          }}
          className="w-[340px] sm:w-[420px] md:w-[460px] bg-black border-2 border-white/70 shadow-[0_10px_45px_rgba(0,0,0,0.9)] z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="p-4 bg-neutral-900/80 border-b border-white/30 flex justify-between items-center relative">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-naranja-naruto flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 bg-naranja-naruto rotate-45" />
              {isNarratorOnly ? 'Disputas Narrador' : 'Centro Disputas'}
            </h3>
            <span className="text-caption font-black text-naranja-naruto bg-naranja-naruto/10 border border-naranja-naruto/30 px-2 py-0.5 tracking-wider">
              {count} ACTIVAS
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-3 space-y-3">
            {disputes.length === 0 ? (
              <div className="p-10 text-center">
                <ShieldAlert className="w-10 h-10 text-naranja-naruto/30 mx-auto mb-3 animate-pulse" />
                <p className="text-white/60 text-caption font-black uppercase tracking-[0.2em] italic">
                  {isNarratorOnly ? 'Sin solicitudes pendientes' : 'Sin disputas activas'}
                </p>
              </div>
            ) : (
              disputes.map((d) => (
                <div
                  key={d.id}
                  className="p-4 bg-neutral-900/80 border border-white/40 transition-all duration-300 group"
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                >
                  <div className="flex flex-col gap-3">
                    <div className="min-w-0">
                      {d.registro_id === null ? (
                        <span className="text-caption font-black uppercase px-2.5 py-1 bg-naranja-naruto text-white inline-block tracking-wider mb-2">
                          {d.personaje_id === null ? 'Alerta de IP' : 'Apelación de Shinobi'}
                        </span>
                      ) : (
                        <span className="text-caption font-black uppercase px-2.5 py-1 bg-naranja-naruto text-white inline-block tracking-wider mb-2">
                          {d.registro?.subtipo === 'recuperacion_evento'
                            ? 'Recuperación de Evento'
                            : d.registro?.subtipo === 'recuperacion_narracion'
                            ? 'Recuperación de Narración'
                            : d.registro?.subtipo === 'narracion'
                            ? 'Revisión de Narración'
                            : `Rechazo: ${d.registro?.tipo}`}
                        </span>
                      )}

                      {d.personaje?.nombre_ninja && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 border border-white/40 bg-black overflow-hidden flex items-center justify-center shrink-0">
                            {d.personaje?.url_img ? (
                              <img src={d.personaje.url_img} alt="Avatar" className="w-full h-full object-cover object-top" />
                            ) : (
                              <span className="text-white font-black text-caption">{d.personaje?.nombre_ninja?.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <span className="text-caption font-black text-white uppercase tracking-wide truncate">
                            {d.personaje?.nombre_ninja}
                          </span>
                        </div>
                      )}

                      <div className="p-3 bg-black border border-neutral-700 rounded-sm mb-2">
                        <p className="text-white text-caption leading-relaxed italic font-medium">
                          "{d.mensaje}"
                        </p>
                      </div>

                      {d.registro_id === null ? (
                        <span className="text-caption text-naranja-naruto font-semibold tracking-wide block mb-1">
                          {d.personaje_id === null ? 'Apelación de IP para añadir a white list.' : 'Apelación para reactivar cuenta archivada.'}
                        </span>
                      ) : (
                        <span className="text-caption text-white/70 font-semibold tracking-wide block mb-1">
                          Registro: "{d.registro?.data?.titulo || 'Sin título'}"
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(d.id, 'aceptada')}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white text-naranja-naruto text-caption font-black uppercase tracking-widest hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer border border-white/80 shadow-sm"
                          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Aceptar
                        </button>
                        <button
                          onClick={() => handleResolve(d.id, 'rechazada')}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-naranja-naruto text-white text-caption font-black uppercase tracking-widest hover:bg-naranja-naruto/90 active:scale-[0.98] transition-all cursor-pointer border border-naranja-naruto/50 shadow-sm"
                          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                        >
                          <X className="w-3.5 h-3.5 stroke-[3]" /> {d.registro_id === null || d.registro?.subtipo === 'recuperacion_evento' || d.registro?.subtipo === 'recuperacion_narracion' ? 'Rechazar' : 'Invalidar'}
                        </button>
                      </div>
                      {d.registro_id !== null && (
                        <button
                          onClick={() => setSelectedRegistro(d.registro)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-neutral-900 text-white hover:text-white border border-white/80 text-caption font-black uppercase tracking-widest hover:bg-neutral-800 active:scale-[0.98] cursor-pointer transition-all"
                          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver registro
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-neutral-900/80 border-t border-white/20 text-center flex items-center justify-between px-5">
            <Link
              href="/admin/disputas"
              onClick={() => setIsOpen(false)}
              className="text-caption font-black bg-white hover:bg-white/90 text-naranja-naruto border border-white/80 px-4 py-1.5 uppercase tracking-wider transition-all"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              Ver Todo
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="text-caption font-black text-naranja-naruto hover:text-white uppercase tracking-[0.35em] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Inspección (Portal) */}
      {selectedRegistro && typeof document !== 'undefined' && createPortal(
        <div className="inspection-modal-container fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-black border-2 border-white/70 shadow-[0_0_80px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-300 overflow-hidden" style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}>
            <div className="flex-none p-6 border-b border-white/30 flex justify-between items-center bg-neutral-900/80 relative">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 bg-naranja-naruto rotate-45" />
                <h3 className="text-white font-black uppercase tracking-[0.35em] text-xs pt-1">Protocolo de Inspección en Disputa</h3>
              </div>
              <button
                onClick={() => setSelectedRegistro(null)}
                className="p-2.5 bg-white text-naranja-naruto border border-white/80 hover:bg-white/90 transition-all active:scale-95 cursor-pointer"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <X className="w-4 h-4 stroke-[2.5]" />
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
    </div>
  );
}
