'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RegistrosService } from '@/services/supabase/registros.service';
import { Registro } from '@/domain/types';
import RegistroForm from '@/components/registros/RegistroForm';
import RegistroCard from '@/components/registros/RegistroCard';
import { ScrollText, ChevronLeft, ChevronRight, Loader2, ArrowLeft, Plus, X } from 'lucide-react';
import { AuthService } from '@/services/supabase/auth.service';
import { createClient } from '@/utils/supabase/client';

export default function MisionesPage() {
  const [data, setData] = useState<{ list: Registro[], count: number, page: number }>({
    list: [], count: 0, page: 1
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null);

  useEffect(() => {
    fetchData(1);
    checkAdmin();
  }, []);

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
      const result = await RegistrosService.getRegistros(page, 15, { tipo: 'mision' });
      setData({ list: result.data, count: result.count, page });
    } catch (err) {
      console.error('Error fetching missions:', err);
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
                <ScrollText className="w-10 h-10 text-orange-500" />
                Bitácora de <span className="text-orange-500">Misiones</span>
              </h1>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mt-1">Registros oficiales de la aldea</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-8 py-4 bg-orange-600 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> Nueva Misión
          </button>
        </header>

        {(showForm || editingRegistro) ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase italic text-white">{editingRegistro ? 'Editar Registro' : 'Registrar Misión'}</h2>
              <button onClick={() => { setShowForm(false); setEditingRegistro(null); }} className="p-2 text-zinc-500 hover:text-white transition-all"><X className="w-6 h-6" /></button>
            </div>
            <RegistroForm 
              onCreated={() => { setShowForm(false); setEditingRegistro(null); fetchData(data.page); }} 
              initialType="mision" 
              initialData={editingRegistro}
            />
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2.5rem] p-8 backdrop-blur-xl">
            {loading ? (
              <div className="py-32 flex justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500/20" />
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
                      onEdit={(r) => { setEditingRegistro(r); setShowForm(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
                <ScrollText className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest italic">No hay misiones registradas todavía</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
