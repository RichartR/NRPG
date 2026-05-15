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
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<any>(null);
  const addToast = useToastStore(state => state.addToast);

  // Click outside listener for the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all group"
      >
        <Bell className={`w-5 h-5 transition-transform ${notifications.length > 0 ? 'text-orange-500 animate-bounce' : 'text-zinc-500 group-hover:text-white'}`} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-black animate-in zoom-in">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-80 md:w-96 bg-zinc-950 border border-zinc-800 rounded-[2rem] shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-6 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" /> Notificaciones
            </h3>
            <span className="text-[10px] font-bold text-zinc-500">{notifications.length} Pendientes</span>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-12 h-12 text-zinc-800 mx-auto mb-4 opacity-20" />
                <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest italic">Todo en orden, ninja</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {notifications.map((n) => {
                  const rewards = RewardLogic.calculateReward(n.registro, activeCharacter.id);
                  return (
                    <div key={n.registro_id} className="p-4 hover:bg-white/5 transition-colors group">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md mb-1 inline-block tracking-tighter">
                              {n.registro.tipo}
                            </span>
                            <h4 className="text-xs font-bold text-white line-clamp-1">
                              {n.registro.autor?.nombre_ninja} puso un registro
                            </h4>
                            {n.registro.tipo !== 'combate' && (
                              <span className="text-[10px] text-zinc-500 font-medium line-clamp-1 italic">
                                "{n.registro.data?.titulo || 'Sin título'}"
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            {rewards.xp > 0 && <span className="text-[10px] font-black text-emerald-500 block">+{rewards.xp} EXP</span>}
                            {rewards.ryous > 0 && <span className="text-[10px] font-black text-amber-500 block">+{rewards.ryous} Ryos</span>}
                          </div>
                        </div>

                        {rejectingId === n.registro_id ? (
                          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                            <textarea 
                              placeholder="¿Por qué rechazas este registro? (Obligatorio)"
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-[10px] text-white focus:border-red-500 outline-none min-h-[60px] placeholder:text-zinc-700"
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAction(n.registro_id, 'rechazar')}
                                disabled={!comment.trim() || loading}
                                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all disabled:opacity-50"
                              >
                                Enviar Disputa
                              </button>
                              <button 
                                onClick={() => setRejectingId(null)}
                                className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white"
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
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
                            >
                              <Check className="w-3 h-3" /> Aceptar
                            </button>
                            <button 
                              onClick={() => setRejectingId(n.registro_id)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                            >
                              <X className="w-3 h-3" /> Rechazar
                            </button>
                            <button 
                              onClick={() => setSelectedRegistro(n.registro)}
                              className="p-2.5 bg-zinc-800 text-zinc-400 rounded-xl hover:text-white transition-all border border-zinc-800 hover:border-zinc-700"
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
          
          <div className="p-4 bg-zinc-900/30 border-t border-zinc-800 text-center">
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.2em]"
            >
              Cerrar Panel
            </button>
          </div>
        </div>
      )}

      {/* Modal de Registro */}
      {selectedRegistro && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-xl transition-all duration-500" 
            onClick={() => setSelectedRegistro(null)} 
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-[3rem] shadow-[0_0_80px_-15px_rgba(0,0,0,0.8)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden">
            <div className="flex-none p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <h3 className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Detalle de Inspección</h3>
              </div>
              <button 
                onClick={() => setSelectedRegistro(null)}
                className="p-3 bg-zinc-900 text-zinc-500 rounded-2xl hover:text-white hover:bg-zinc-800 transition-all active:scale-90"
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
            <div className="flex-none p-6 bg-zinc-900/50 border-t border-zinc-800 backdrop-blur-md">
              {rejectingId === selectedRegistro.id ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <textarea 
                    placeholder="¿Por qué rechazas este registro? (Motivo obligatorio para administración)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-xs text-white focus:border-red-500 outline-none min-h-[100px] placeholder:text-zinc-700 transition-all shadow-inner"
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={async () => {
                        await handleAction(selectedRegistro.id, 'rechazar');
                        setSelectedRegistro(null);
                      }}
                      disabled={!comment.trim() || loading}
                      className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500 transition-all disabled:opacity-50 shadow-xl shadow-red-900/20"
                    >
                      Confirmar Rechazo y Enviar a Admin
                    </button>
                    <button 
                      onClick={() => setRejectingId(null)}
                      className="px-6 py-4 bg-zinc-800 text-zinc-400 rounded-2xl hover:text-white transition-all font-bold text-xs uppercase"
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
                    className="flex-1 flex items-center justify-center gap-3 py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-500 transition-all active:scale-95 shadow-xl shadow-emerald-900/20"
                  >
                    <Check className="w-5 h-5" /> Aceptar Registro y Recompensas
                  </button>
                  <button 
                    onClick={() => setRejectingId(selectedRegistro.id)}
                    className="flex-1 flex items-center justify-center gap-3 py-5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-xl shadow-red-900/10"
                  >
                    <X className="w-5 h-5" /> Rechazar / Disputa
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
