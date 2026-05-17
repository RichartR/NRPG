'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X, MessageSquare, AlertCircle } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { CharacterService } from '@/services/supabase/character.service';
import { useToastStore } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { RewardLogic } from '@/domain/character/logic';
import RegistroCard from '../registros/RegistroCard';
import { Eye } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useRef } from 'react';

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
    <div className="relative">
      <button 
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-rojo-sangre/10 border border-oro/20 hover:bg-rojo-sangre/20 transition-all group flex items-center justify-center"
        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
      >
        <Bell className={`w-5 h-5 transition-all ${notifications.length > 0 ? 'text-oro animate-bounce' : 'text-oro/40 group-hover:text-oro'}`} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rojo-sangre text-oro text-[10px] font-black flex items-center justify-center border border-oro/40 animate-in zoom-in">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${coords.top + 6}px`,
            left: `${coords.left}px`,
          }}
          className="w-80 md:w-96 bg-black/95 ninja-box ninja-border shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="p-6 bg-rojo-sangre/20 border-b border-oro/10 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-oro flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" /> Notificaciones
            </h3>
            <span className="text-[9px] font-black text-oro/40 uppercase tracking-widest">{notifications.length} Pendientes</span>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-12 h-12 text-oro/10 mx-auto mb-4" />
                <p className="text-oro/40 text-[10px] font-black uppercase tracking-[0.2em] italic">Todo en orden, ninja</p>
              </div>
            ) : (
              <div className="divide-y divide-oro/5">
                {notifications.map((n) => {
                  const rewards = RewardLogic.calculateReward(n.registro, activeCharacter.id);
                  return (
                    <div key={n.registro_id} className="p-5 hover:bg-rojo-sangre/5 transition-colors group">
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-rojo-sangre text-oro/80 mb-1 inline-block tracking-widest">
                              {n.registro.tipo}
                            </span>
                            <h4 className="text-xs font-bold text-oro line-clamp-1">
                              {n.registro.autor?.nombre_ninja} puso un registro
                            </h4>
                            {n.registro.tipo !== 'combate' && (
                              <span className="text-[10px] text-oro/40 font-medium line-clamp-1 italic">
                                "{n.registro.data?.titulo || 'Sin título'}"
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            {rewards.xp > 0 && <span className="text-[10px] font-black text-oro block">+{rewards.xp} EXP</span>}
                            {rewards.ryous > 0 && <span className="text-[10px] font-black text-oro/60 block">+{rewards.ryous} Ryos</span>}
                          </div>
                        </div>

                        {rejectingId === n.registro_id ? (
                          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <textarea 
                              placeholder="¿Por qué rechazas este registro?"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              className="w-full bg-black border border-oro/10 p-3 text-[10px] text-oro focus:border-rojo-sangre outline-none min-h-[60px] placeholder:text-oro/20"
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAction(n.registro_id, 'rechazar')}
                                disabled={!comment.trim() || loading}
                                className="flex-1 py-2 bg-rojo-sangre text-oro text-[10px] font-black uppercase tracking-widest hover:brightness-125 transition-all disabled:opacity-50"
                              >
                                Enviar Disputa
                              </button>
                              <button 
                                onClick={() => setRejectingId(null)}
                                className="p-2 bg-oro/10 text-oro/40 hover:text-oro"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleAction(n.registro_id, 'aceptar')}
                              disabled={loading}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-oro text-rojo-sangre text-[10px] font-black uppercase tracking-widest hover:brightness-125 transition-all active:scale-95 shadow-[0_0_10px_rgba(255,230,159,0.1)]"
                            >
                              <Check className="w-3 h-3" /> Aceptar
                            </button>
                            <button 
                              onClick={() => setRejectingId(n.registro_id)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rojo-sangre/20 text-rojo-sangre border border-rojo-sangre/20 text-[10px] font-black uppercase tracking-widest hover:bg-rojo-sangre hover:text-oro transition-all active:scale-95"
                            >
                              <X className="w-3 h-3" /> Rechazar
                            </button>
                            <button 
                              onClick={() => setSelectedRegistro(n.registro)}
                              className="p-2.5 bg-oro/5 text-oro/40 hover:text-oro transition-all border border-oro/10 hover:border-oro/30"
                              title="Ver Registro Completo"
                            >
                              <Eye className="w-4 h-4" />
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
          
          <div className="p-4 bg-black/60 border-t border-oro/10 text-center">
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[9px] font-black text-oro/40 hover:text-oro uppercase tracking-[0.3em]"
            >
              Cerrar Panel
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Registro */}
      {selectedRegistro && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-xl transition-all duration-500" 
            onClick={() => setSelectedRegistro(null)} 
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-black/90 ninja-box ninja-border shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden">
            <div className="flex-none p-6 border-b border-oro/10 flex justify-between items-center bg-rojo-sangre/10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-rojo-sangre rotate-45" />
                <h3 className="text-oro font-black uppercase tracking-[0.3em] text-[11px]">Inspección Ninja</h3>
              </div>
              <button 
                onClick={() => setSelectedRegistro(null)}
                className="p-3 bg-oro/5 text-oro/40 hover:text-oro hover:bg-oro/10 transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
              <div className="animate-in fade-in duration-700 delay-300">
                <RegistroCard registro={selectedRegistro} />
              </div>
            </div>

            {/* Acciones en el Modal */}
            <div className="flex-none p-6 bg-rojo-sangre/5 border-t border-oro/10 backdrop-blur-md">
              {rejectingId === selectedRegistro.id ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <textarea 
                    placeholder="Motivo del rechazo..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-black border border-oro/10 p-5 text-xs text-oro focus:border-rojo-sangre outline-none min-h-[120px] placeholder:text-oro/20 transition-all"
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={async () => {
                        await handleAction(selectedRegistro.id, 'rechazar');
                        setSelectedRegistro(null);
                      }}
                      disabled={!comment.trim() || loading}
                      className="flex-1 py-4 bg-rojo-sangre text-oro font-black uppercase tracking-widest hover:brightness-125 transition-all disabled:opacity-50"
                    >
                      Confirmar Rechazo
                    </button>
                    <button 
                      onClick={() => setRejectingId(null)}
                      className="px-8 py-4 bg-oro/5 text-oro/40 hover:text-oro transition-all font-black text-[10px] uppercase tracking-widest"
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
                    className="flex-1 flex items-center justify-center gap-4 py-5 bg-oro text-rojo-sangre text-xs font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all active:scale-95 shadow-xl shadow-oro/5"
                  >
                    <Check className="w-5 h-5" /> Aceptar Registro
                  </button>
                  <button 
                    onClick={() => setRejectingId(selectedRegistro.id)}
                    className="flex-1 flex items-center justify-center gap-4 py-5 bg-rojo-sangre/20 text-rojo-sangre border border-rojo-sangre/20 text-xs font-black uppercase tracking-[0.2em] hover:bg-rojo-sangre hover:text-oro transition-all active:scale-95"
                  >
                    <X className="w-5 h-5" /> Iniciar Disputa
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
