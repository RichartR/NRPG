'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RegistrosService } from '@/services/supabase/registros.service';
import { Registro } from '@/domain/types';
import RegistroCard from '@/components/registros/RegistroCard';
import { ShoppingBag, ChevronLeft, ChevronRight, Loader2, ArrowLeft, X } from 'lucide-react';
import { AuthService } from '@/services/supabase/auth.service';
import { createClient } from '@/utils/supabase/client';

export default function ComprasPage() {
  const [data, setData] = useState<{ list: Registro[], count: number, page: number }>({
    list: [], count: 0, page: 1
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData(1);
    checkAdmin();
  }, [startDate, endDate]);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await AuthService.getUser();
      if (user) {
        const { data: profile } = await createClient().from('profiles').select('role').eq('id', user.id).single();
        setIsAdmin(profile?.role === 'admin');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async (page: number) => {
    setLoading(true);
    try {
      const result = await RegistrosService.getRegistros(page, 15, { 
        tipo: 'compra',
        startDate,
        endDate
      });
      setData({ list: result.data, count: result.count, page });
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/registros" 
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                <ShoppingBag className="w-10 h-10 text-amber-500" />
                Bitácora de <span className="text-amber-500">Compras</span>
              </h1>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">Registros de equipamiento y tesorería</p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-6 p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Desde</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:border-amber-500/50 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Hasta</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:border-amber-500/50 outline-none transition-all"
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-all active:scale-95"
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-8 backdrop-blur-xl">
            {loading ? (
              <div className="py-32 flex justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500/20" />
              </div>
            ) : data.list.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {data.list.map(reg => (
                    <RegistroCard 
                      key={reg.id} 
                      registro={reg} 
                      onRefresh={() => fetchData(data.page)} 
                      isAdmin={isAdmin} 
                      onEdit={(r) => { setEditingRegistro(r); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    />
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-8 border-t border-zinc-800/50">
                  <button 
                    disabled={data.page === 1}
                    onClick={() => fetchData(data.page - 1)}
                    className="flex items-center gap-2 px-6 py-3 text-zinc-500 hover:text-white disabled:opacity-20 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <span className="text-[10px] font-black text-zinc-400 bg-zinc-950 px-6 py-3 rounded-xl border border-zinc-800/50 uppercase tracking-widest">PÁGINA {data.page} de {Math.ceil(data.count / 15)}</span>
                  <button 
                    disabled={data.list.length < 15 || data.page * 15 >= data.count}
                    onClick={() => fetchData(data.page + 1)}
                    className="flex items-center gap-2 px-6 py-3 text-zinc-500 hover:text-white disabled:opacity-20 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-40 text-center border-2 border-dashed border-zinc-800/50 rounded-[3rem]">
                <ShoppingBag className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest italic">No hay compras registradas todavía</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
