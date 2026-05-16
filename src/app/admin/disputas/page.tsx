'use client';

import { useState, useEffect } from 'react';
import { AdminService } from '@/services/supabase/admin.service';
import { NotificacionAdmin } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { Check, X, ShieldAlert, ChevronLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import RegistroCard from '@/components/registros/RegistroCard';
import { Eye } from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

export default function AdminDisputePage() {
  const [disputes, setDisputes] = useState<NotificacionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistro, setSelectedRegistro] = useState<any>(null);
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();
  const router = useRouter();

  const fetchDisputes = async () => {
    try {
      const data = await AdminService.getDisputes();
      setDisputes(data as any);
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
    const ok = await confirmAction({
      title: action === 'aceptada' ? 'Aceptar Disputa' : 'Invalidar Registro',
      message: action === 'aceptada' 
        ? '¿Estás seguro de que quieres aceptar la disputa? Se darán las recompensas correspondientes al jugador.'
        : '¿Estás seguro de que quieres invalidar el registro? Se retirarán las recompensas de todos los implicados.',
      variant: action === 'aceptada' ? 'primary' : 'danger'
    });

    if (!ok) return;
    
    try {
      await AdminService.resolveDispute(id, action);
      addToast(action === 'aceptada' ? 'Disputa resuelta a favor del jugador' : 'Registro invalidado y recompensas revertidas', 'success');
      fetchDisputes();
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="max-w-[1750px]">
      <header className="mb-16 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-[10px] font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>
        
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-oro" />
          </div>
          <div>
            <h1 className="ninja-title text-4xl xl:text-5xl italic">CENTRO DE DISPUTAS</h1>
            <p className="text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] mt-2">REVISIÓN DE RECHAZOS Y RESOLUCIÓN DE CONFLICTOS</p>
          </div>
        </div>
      </header>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em]">Cargando casos...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-24 text-center ninja-card-oro">
            <Check className="w-16 h-16 text-oro/20 mx-auto mb-4 opacity-20" />
            <p className="text-oro/40 font-black uppercase italic tracking-[0.3em] text-sm">SIN DISPUTAS PENDIENTES</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10">
            {disputes.map((d) => (
              <div key={d.id} className="ninja-card-oro p-10 xl:p-12 hover:scale-[1.01] transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between gap-8">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-orange-500 font-black text-xl">
                        {d.personaje?.nombre_ninja?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-white font-black text-xl uppercase tracking-tighter italic">{d.personaje?.nombre_ninja}</h3>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Rechazó: {d.registro?.data?.titulo}</span>
                      </div>
                    </div>

                    <div className="p-6 bg-black rounded-2xl border border-zinc-800 relative">
                      <MessageSquare className="absolute -top-3 -left-3 w-8 h-8 text-zinc-800" />
                      <p className="text-zinc-300 text-sm leading-relaxed italic">"{d.mensaje}"</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Tipo Registro</span>
                        <span className="text-xs font-bold text-white uppercase">{d.registro?.tipo}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Fecha</span>
                        <span className="text-xs font-bold text-white uppercase">{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 justify-center min-w-[240px]">
                    <button 
                      onClick={() => handleResolve(d.id, 'aceptada')}
                      className="w-full py-4 bg-emerald-600/10 border border-emerald-600/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-xl shadow-emerald-600/10 flex items-center justify-center gap-3"
                      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                    >
                      <Check className="w-4 h-4" /> ACEPTAR DISPUTA
                    </button>
                    <button 
                      onClick={() => handleResolve(d.id, 'rechazada')}
                      className="w-full py-4 bg-rojo-sangre/10 border border-rojo-sangre/20 text-rojo-sangre text-[10px] font-black uppercase tracking-widest hover:bg-rojo-sangre hover:text-oro transition-all shadow-xl shadow-rojo-sangre/10 flex items-center justify-center gap-3"
                      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                    >
                      <X className="w-4 h-4" /> INVALIDAR REGISTRO
                    </button>
                    <button 
                      onClick={() => setSelectedRegistro(d.registro)}
                      className="w-full py-4 bg-oro text-rojo-sangre text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3"
                      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                    >
                      <Eye className="w-4 h-4" /> INSPECCIONAR
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Inspección (Portal) */}
      {selectedRegistro && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/95 backdrop-blur-xl transition-all duration-500" 
            onClick={() => setSelectedRegistro(null)} 
          />
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#080705] border border-oro/20 shadow-[0_0_80px_-15px_rgba(0,0,0,0.8)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden" style={{ clipPath: 'polygon(40px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 40px)' }}>
            <div className="flex-none p-10 border-b border-oro/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-oro animate-pulse" />
                <h3 className="text-oro font-black uppercase tracking-[0.4em] text-[10px]">PROTOCOLO DE INSPECCIÓN DE REGISTRO EN DISPUTA</h3>
              </div>
              <button 
                onClick={() => setSelectedRegistro(null)}
                className="p-4 bg-rojo-sangre/10 text-rojo-sangre border border-rojo-sangre/20 hover:bg-rojo-sangre hover:text-oro transition-all active:scale-90"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-12 scrollbar-hide">
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
