'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AdminService } from '@/services/supabase/admin.service';
import { NotificacionAdmin } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { ShieldAlert, Check, X, Eye } from 'lucide-react';
import { createPortal } from 'react-dom';
import RegistroCard from '@/components/registros/RegistroCard';
import Link from 'next/link';

interface AdminNotificationBadgeProps {
  isSidebar?: boolean;
}

export default function AdminNotificationBadge({ isSidebar = false }: AdminNotificationBadgeProps) {
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

  const fetchData = async () => {
    try {
      const supabase = createClient();

      // Get the count of pending disputes
      const { count: pendingCount, error: countError } = await supabase
        .from('sys_notificaciones_admin')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      if (!countError) {
        setCount(pendingCount || 0);
      }

      // If dropdown is open, fetch active dispute details
      if (isOpen) {
        const disputesData = await AdminService.getDisputes();
        setDisputes(disputesData as any);
      }
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    }
  };

  // Re-fetch when open state changes
  useEffect(() => {
    fetchData();
  }, [isOpen]);

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
      const dropdownWidth = isMobile ? 320 : 384;

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
    const isAppeal = dispute ? dispute.registro_id === null : false;

    const ok = await confirmAction({
      title: isAppeal
        ? (action === 'aceptada' ? 'Aceptar Apelación' : 'Rechazar Apelación')
        : (action === 'aceptada' ? 'Aceptar Disputa' : 'Invalidar Registro'),
      message: isAppeal
        ? (action === 'aceptada'
          ? '¿Estás seguro de que quieres aceptar la apelación? Se restaurará la ficha de este shinobi.'
          : '¿Estás seguro de que quieres rechazar la apelación? La ficha seguirá archivada.')
        : (action === 'aceptada'
          ? '¿Estás seguro de que quieres aceptar la disputa? Se darán las recompensas correspondientes al jugador.'
          : '¿Estás seguro de que quieres invalidar el registro? Se retirarán las recompensas de todos los implicados.'),
      variant: action === 'aceptada' ? 'primary' : 'danger'
    });

    if (!ok) return;
    setLoading(true);
    try {
      await AdminService.resolveDispute(id, action);
      addToast(
        isAppeal
          ? (action === 'aceptada' ? 'Apelación aceptada y ficha restaurada' : 'Apelación rechazada')
          : (action === 'aceptada' ? 'Disputa resuelta a favor del jugador' : 'Registro invalidado y recompensas revertidas'),
        'success'
      );
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
            <span className="px-2 py-0.5 bg-rojo-sangre text-oro text-caption font-black border border-oro/40 shadow-[0_0_8px_rgba(103,9,9,0.5)] ninja-clip-xs animate-pulse">
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
            className={`flex items-center gap-3 px-6 py-2.5 bg-rojo-sangre/20 text-oro border border-oro/20 hover:bg-rojo-sangre hover:border-oro/40 transition-all group font-black text-caption uppercase tracking-widest cursor-pointer ${isOpen ? 'bg-rojo-sangre border-oro/40' : ''}`}
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            <ShieldAlert className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            DISPUTAS ADMIN
          </button>
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rojo-sangre text-oro text-caption font-black flex items-center justify-center border border-oro/40 shadow-[0_0_10px_rgba(103,9,9,0.8)] animate-bounce pointer-events-none z-10">
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
            backgroundImage: "url('/assets/ui/bg-list.jpg')",
          }}
          className="w-80 md:w-96 border border-black/10 shadow-[0_10px_45px_rgba(0,0,0,0.15),0_0_30px_rgba(103,9,9,0.05)] z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 bg-cover bg-center"
        >
          <div className="p-5 bg-gradient-to-r from-rojo-sangre/15 via-rojo-sangre/5 to-transparent border-b border-black/10 flex justify-between items-center relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-rojo-sangre via-oro to-transparent" />
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-rojo-sangre flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45 shadow-[0_0_6px_rgba(103,9,9,0.3)]" />
              Centro Disputas
            </h3>
            <span className="text-caption font-black text-rojo-sangre/80 bg-rojo-sangre/5 border border-rojo-sangre/20 px-2 py-0.5 ninja-clip-xs tracking-wider">
              {count} ACTIVAS
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {disputes.length === 0 ? (
              <div className="p-12 text-center">
                <ShieldAlert className="w-12 h-12 text-rojo-sangre/15 mx-auto mb-4 animate-pulse" />
                <p className="text-rojo-sangre/40 text-caption font-black uppercase tracking-[0.2em] italic">Sin disputas activas</p>
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {disputes.map((d) => (
                  <div key={d.id} className="p-5 hover:bg-rojo-sangre/5 border-b border-black/5 transition-all duration-300 group">
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <div className="w-6 h-6 border border-oro/20 bg-black/40 overflow-hidden flex items-center justify-center shrink-0 shadow-[0_0_5px_rgba(255,230,159,0.05)]" style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}>
                              {d.personaje?.url_img ? (
                                <img src={d.personaje.url_img} alt="Avatar" className="w-full h-full object-cover object-top" />
                              ) : (
                                <span className="text-oro font-black text-caption">{d.personaje?.nombre_ninja?.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span className="text-caption font-black text-black/85 uppercase tracking-wide truncate">
                              {d.personaje?.nombre_ninja}
                            </span>
                          </div>

                          {d.registro_id === null ? (
                            <span className="text-caption font-black uppercase px-2 py-0.5 bg-oro text-rojo-sangre border border-oro/20 inline-block tracking-wider ninja-clip-xs mb-2">
                              Apelación de Shinobi
                            </span>
                          ) : (
                            <span className="text-caption font-black uppercase px-2 py-0.5 bg-rojo-sangre text-oro border border-oro/20 inline-block tracking-wider ninja-clip-xs mb-2">
                              Rechazo: {d.registro?.tipo}
                            </span>
                          )}

                          <div className="p-2.5 bg-black/5 border border-black/5 relative shadow-inner mb-1 rounded-sm">
                            <p className="text-black/75 text-caption leading-relaxed italic font-medium">
                              "{d.mensaje}"
                            </p>
                          </div>

                          {d.registro_id === null ? (
                            <span className="text-caption text-black/45 font-semibold tracking-wide">
                              Apelación para reactivar cuenta archivada.
                            </span>
                          ) : (
                            <span className="text-caption text-black/45 font-semibold tracking-wide">
                              Registro: "{d.registro?.data?.titulo || 'Sin título'}"
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(d.id, 'aceptada')}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-oro text-rojo-sangre text-caption font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-[0_3px_10px_rgba(165,87,11,0.15)] ninja-clip-xs border border-oro-soft"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Aceptar
                        </button>
                        <button
                          onClick={() => handleResolve(d.id, 'rechazada')}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rojo-sangre/10 text-rojo-sangre border border-rojo-sangre/20 text-caption font-black uppercase tracking-widest hover:bg-rojo-sangre hover:text-oro active:scale-[0.98] transition-all cursor-pointer ninja-clip-xs"
                        >
                          <X className="w-3.5 h-3.5 stroke-[3]" /> {d.registro_id === null ? 'Rechazar' : 'Invalidar'}
                        </button>
                        {d.registro_id !== null && (
                          <button
                            onClick={() => setSelectedRegistro(d.registro)}
                            className="p-2 bg-black/5 text-black/50 hover:text-rojo-sangre hover:border-rojo-sangre/30 transition-all border border-black/10 active:scale-[0.98] cursor-pointer ninja-clip-xs"
                            title="Inspeccionar Registro Completo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-transparent border-t border-black/10 text-center flex items-center justify-between px-5">
            <Link
              href="/admin/disputas"
              onClick={() => setIsOpen(false)}
              className="text-caption font-black text-oro hover:text-oro-soft bg-rojo-sangre/90 px-3 py-1.5 border border-oro/20 ninja-clip-xs uppercase tracking-wider transition-all"
            >
              Ver Todo
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="text-caption font-black text-rojo-sangre/70 hover:text-rojo-sangre uppercase tracking-[0.35em] transition-all hover:letter-spacing duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Inspección (Portal) */}
      {selectedRegistro && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-all duration-500"
            onClick={() => setSelectedRegistro(null)}
          />
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col ninja-card-oro shadow-[0_0_80px_rgba(0,0,0,0.9)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden">
            <div className="flex-none p-8 border-b border-oro/15 flex justify-between items-center bg-gradient-to-r from-rojo-sangre/20 to-transparent backdrop-blur-md relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-oro via-rojo-sangre to-transparent" />
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 bg-rojo-sangre rotate-45 shadow-[0_0_10px_#b82020] animate-pulse" />
                <h3 className="text-oro font-black uppercase tracking-[0.35em] text-xs pt-1 ninja-title">Protocolo de Inspección en Disputa</h3>
              </div>
              <button
                onClick={() => setSelectedRegistro(null)}
                className="p-3 bg-rojo-sangre/15 text-rojo-sangre border border-rojo-sangre/30 hover:bg-rojo-sangre hover:text-oro transition-all active:scale-95 cursor-pointer ninja-clip-xs"
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
    </div>
  );
}
