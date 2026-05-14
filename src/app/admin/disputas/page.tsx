'use client';

import { useState, useEffect } from 'react';
import { AdminService } from '@/services/supabase/admin.service';
import { NotificacionAdmin } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
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
    if (!confirm(`¿Estás seguro de que quieres ${action === 'aceptada' ? 'aceptar la disputa (dar recompensa al jugador)' : 'rechazar la disputa (quitar recompensas a todos los implicados)'}?`)) return;
    
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
    <div className="min-h-screen bg-black pt-24 pb-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <Link href="/admin" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-orange-500" />
            CENTRO DE <span className="text-orange-500">DISPUTAS</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium mt-2 uppercase tracking-widest">Revisa los rechazos de registros y toma una decisión final.</p>
        </header>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em]">Cargando casos...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-24 text-center bg-zinc-950/50 rounded-[3rem] border-2 border-dashed border-zinc-900">
            <Check className="w-16 h-16 text-zinc-800 mx-auto mb-4 opacity-20" />
            <p className="text-zinc-700 font-black uppercase italic tracking-[0.3em] text-sm">Sin disputas pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {disputes.map((d) => (
              <div key={d.id} className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 hover:border-orange-500/30 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
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

                  <div className="flex flex-col gap-3 justify-center min-w-[200px]">
                    <button 
                      onClick={() => handleResolve(d.id, 'aceptada')}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/10 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Aceptar Disputa
                    </button>
                    <button 
                      onClick={() => handleResolve(d.id, 'rechazada')}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl shadow-red-600/10 flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Invalidar Registro
                    </button>
                    <button 
                      onClick={() => setSelectedRegistro(d.registro)}
                      className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" /> Inspeccionar Registro
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
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-[3rem] shadow-[0_0_80px_-15px_rgba(0,0,0,0.8)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden">
            <div className="flex-none p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <h3 className="text-white font-black uppercase tracking-[0.3em] text-[10px]">Inspección de Registro en Disputa</h3>
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
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
