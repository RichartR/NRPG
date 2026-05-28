'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { CharacterService } from '@/services/supabase/character.service';
import { useToastStore } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { RewardLogic } from '@/domain/character/logic';
import RegistroCard from '../registros/RegistroCard';
import { Eye } from 'lucide-react';

import { createPortal } from 'react-dom';
import { useRef } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';

export default function NotificationBell() {
  const { activeCharacter } = useCharacterStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<any>(null);
  const addToast = useToastStore(state => state.addToast);

  // Prevent background scrolling when inspection modal is open
  useScrollLock(!!selectedRegistro);

  // Click outside listener for the dropdown
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

      let left = rect.right + window.scrollX - dropdownWidth;
      const margin = 16;
      if (left < margin) {
        left = margin;
      }
      if (left + dropdownWidth > window.innerWidth - margin) {
        left = window.innerWidth - dropdownWidth - margin;
      }

      setCoords({
        top: rect.bottom + window.scrollY,
        left: left
      });
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

  const fetchNotifications = async () => {
    if (!activeCharacter?.id) return;
    try {
      const data = await CharacterService.getNotifications(activeCharacter.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!activeCharacter?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel('reg_registros_participantes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reg_registros_participantes',
          filter: `personaje_id=eq.${activeCharacter.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCharacter?.id]);

  const handleAction = async (registroId: number, action: 'aceptar' | 'rechazar') => {
    if (!activeCharacter?.id) return;
    setLoading(true);
    try {
      await CharacterService.respondToRecord(
        activeCharacter.id,
        registroId,
        action,
        action === 'rechazar' ? comment : undefined
      );
      addToast(action === 'aceptar' ? 'Registro aceptado y recompensas sumadas' : 'Rechazo enviado a administración', 'success');
      setRejectingId(null);
      setComment('');
      fetchNotifications();
    } catch (err: any) {
      addToast(err.message || 'Error al procesar la acción', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!activeCharacter) return null;

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 hover:bg-white/5 transition-all group flex items-center justify-center cursor-pointer rounded-lg"
      >
        <Bell className={`w-5 h-5 transition-all ${notifications.length > 0 ? 'text-oro animate-pulse' : 'text-oro/40 group-hover:text-oro'}`} />
      </button>
      {notifications.length > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rojo-sangre text-oro text-[10px] font-black flex items-center justify-center border border-oro/40 shadow-[0_0_10px_rgba(103,9,9,0.8)] animate-in zoom-in pointer-events-none z-10">
          {notifications.length}
        </span>
      )}

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${coords.top + 6}px`,
            left: `${coords.left}px`,
            backgroundImage: "url('/assets/ui/bg-list.jpg')",
          }}
          className="w-80 md:w-96 border border-black/10 shadow-[0_10px_45px_rgba(0,0,0,0.15),0_0_30px_rgba(103,9,9,0.05)] z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 bg-cover bg-center"
        >
          <div className="p-5 bg-gradient-to-r from-rojo-sangre/15 via-rojo-sangre/5 to-transparent border-b border-black/10 flex justify-between items-center relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-rojo-sangre via-oro to-transparent" />
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-rojo-sangre flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45 shadow-[0_0_6px_rgba(103,9,9,0.3)]" />
              Notificaciones
            </h3>
            <span className="text-[9px] font-black text-rojo-sangre/80 bg-rojo-sangre/5 border border-rojo-sangre/20 px-2 py-0.5 ninja-clip-xs tracking-wider">
              {notifications.length} PENDIENTES
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-12 h-12 text-rojo-sangre/15 mx-auto mb-4 animate-pulse" />
                <p className="text-rojo-sangre/40 text-[10px] font-black uppercase tracking-[0.2em] italic">Todo en orden, ninja</p>
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {notifications.map((n) => {
                  const rewards = RewardLogic.calculateReward(n.registro, activeCharacter.id);
                  return (
                    <div key={n.registro_id} className="p-5 hover:bg-rojo-sangre/5 border-b border-black/5 transition-all duration-300 group">
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-rojo-sangre text-oro border border-oro/20 mb-2 inline-block tracking-wider ninja-clip-xs">
                              {n.registro.tipo}
                            </span>
                            <h4 className="text-xs font-black text-black/85 uppercase tracking-wider group-hover:text-rojo-sangre group-hover:translate-x-0.5 transition-all duration-300">
                              {n.registro.autor?.nombre_ninja} puso un registro
                            </h4>
                            {n.registro.tipo !== 'combate' && (
                              <span className="text-[10px] text-black/50 font-semibold line-clamp-1 italic mt-1 block">
                                "{n.registro.data?.titulo || 'Sin título'}"
                              </span>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end gap-1 shrink-0">
                            {rewards.xp > 0 && (
                              <span className="text-[9px] font-black text-rojo-sangre bg-rojo-sangre/5 border border-rojo-sangre/15 px-1.5 py-0.5 tracking-wider ninja-clip-xs block">
                                +{rewards.xp} EXP
                              </span>
                            )}
                            {rewards.ryous > 0 && (
                              <span className="text-[9px] font-black text-black/75 bg-black/5 border border-black/10 px-1.5 py-0.5 tracking-wider ninja-clip-xs block">
                                +{rewards.ryous} R
                              </span>
                            )}
                          </div>
                        </div>

                        {rejectingId === n.registro_id ? (
                          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <textarea
                              placeholder="¿Por qué rechazas este registro?"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              className="w-full bg-white/50 border border-black/10 p-3 text-[10px] text-black focus:border-rojo-sangre/40 outline-none min-h-[65px] placeholder:text-black/30 ninja-clip-xs font-medium"
                              style={{ textTransform: 'none' }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAction(n.registro_id, 'rechazar')}
                                disabled={!comment.trim() || loading}
                                className="flex-1 py-2 bg-rojo-sangre text-oro text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer ninja-clip-xs"
                              >
                                Enviar Disputa
                              </button>
                              <button
                                onClick={() => setRejectingId(null)}
                                className="p-2 bg-black/5 text-black/60 hover:text-black hover:bg-black/10 active:scale-[0.98] transition-all cursor-pointer ninja-clip-xs border border-black/10"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(n.registro_id, 'aceptar')}
                              disabled={loading}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-oro text-rojo-sangre text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-[0_3px_10px_rgba(165,87,11,0.15)] ninja-clip-xs border border-oro-soft"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Aceptar
                            </button>
                            <button
                              onClick={() => setRejectingId(n.registro_id)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rojo-sangre/10 text-rojo-sangre border border-rojo-sangre/20 text-[9px] font-black uppercase tracking-widest hover:bg-rojo-sangre hover:text-oro active:scale-[0.98] transition-all cursor-pointer ninja-clip-xs"
                            >
                              <X className="w-3.5 h-3.5 stroke-[3]" /> Rechazar
                            </button>
                            <button
                              onClick={() => setSelectedRegistro(n.registro)}
                              className="p-2 bg-black/5 text-black/50 hover:text-rojo-sangre hover:border-rojo-sangre/30 transition-all border border-black/10 active:scale-[0.98] cursor-pointer ninja-clip-xs"
                              title="Ver Registro Completo"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 bg-transparent border-t border-black/10 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-[9px] font-black text-rojo-sangre/70 hover:text-rojo-sangre uppercase tracking-[0.35em] transition-all hover:letter-spacing duration-300 flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <div className="w-1.5 h-1.5 bg-rojo-sangre/40 rotate-45" />
              Cerrar Panel
              <div className="w-1.5 h-1.5 bg-rojo-sangre/40 rotate-45" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Registro */}
      {selectedRegistro && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-all duration-500"
            onClick={() => setSelectedRegistro(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col ninja-card-oro shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden">
            <div className="flex-none p-6 border-b border-oro/15 flex justify-between items-center bg-gradient-to-r from-rojo-sangre/20 to-transparent backdrop-blur-md relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-oro via-rojo-sangre to-transparent" />
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 bg-rojo-sangre rotate-45 shadow-[0_0_10px_#b82020]" />
                <h3 className="text-oro font-black uppercase tracking-[0.35em] text-xs pt-1 ninja-title">Inspección de Registro</h3>
              </div>
              <button
                onClick={() => setSelectedRegistro(null)}
                className="p-2.5 bg-rojo-sangre/10 text-rojo-sangre border border-rojo-sangre/30 hover:bg-rojo-sangre hover:text-oro transition-all active:scale-95 cursor-pointer ninja-clip-xs"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="animate-in fade-in duration-700 delay-300">
                <RegistroCard registro={selectedRegistro} />
              </div>
            </div>

            {/* Acciones en el Modal */}
            <div className="flex-none p-6 bg-gradient-to-r from-rojo-sangre/10 via-black/40 to-transparent border-t border-oro/15 backdrop-blur-md relative">
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-rojo-sangre via-oro to-transparent" />
              {rejectingId === selectedRegistro.id ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                  <textarea
                    placeholder="Motivo del rechazo..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-black/60 border border-oro/15 p-5 text-xs text-oro focus:border-rojo-sangre focus:bg-black/80 focus:shadow-[0_0_20px_rgba(103,9,9,0.15)] outline-none min-h-[120px] placeholder:text-oro/20 transition-all ninja-clip-xs font-semibold"
                    style={{ textTransform: 'none' }}
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={async () => {
                        await handleAction(selectedRegistro.id, 'rechazar');
                        setSelectedRegistro(null);
                      }}
                      disabled={!comment.trim() || loading}
                      className="flex-1 py-4 bg-rojo-sangre text-oro font-black uppercase tracking-[0.2em] text-xs hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(103,9,9,0.3)] transition-all cursor-pointer ninja-clip-md"
                    >
                      Confirmar Rechazo
                    </button>
                    <button
                      onClick={() => setRejectingId(null)}
                      className="px-8 py-4 bg-black/40 text-oro/60 border border-oro/15 hover:text-oro hover:border-oro/40 transition-all font-black text-xs uppercase tracking-[0.2em] active:scale-95 cursor-pointer ninja-clip-md"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    onClick={async () => {
                      await handleAction(selectedRegistro.id, 'aceptar');
                      setSelectedRegistro(null);
                    }}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-3 py-4 bg-oro text-rojo-sangre text-xs font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,230,159,0.15)] cursor-pointer ninja-clip-md"
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" /> Aceptar Registro
                  </button>
                  <button
                    onClick={() => setRejectingId(selectedRegistro.id)}
                    className="flex-1 flex items-center justify-center gap-3 py-4 bg-rojo-sangre/20 text-rojo-sangre border border-rojo-sangre/30 text-xs font-black uppercase tracking-[0.2em] hover:bg-rojo-sangre hover:text-oro transition-all active:scale-95 cursor-pointer ninja-clip-md"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" /> Iniciar Disputa
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
