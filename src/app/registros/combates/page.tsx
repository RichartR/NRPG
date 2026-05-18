'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { RegistrosService } from '@/services/supabase/registros.service';
import { Registro } from '@/domain/types';
import CombatForm from '@/components/registros/CombatForm';
import RegistroCard from '@/components/registros/RegistroCard';
import { Swords, ChevronLeft, ChevronRight, Loader2, ArrowLeft, Plus, X } from 'lucide-react';
import { AuthService } from '@/services/supabase/auth.service';
import { createClient } from '@/utils/supabase/client';
import { useCharacterStore } from '@/store/useCharacterStore';

export default function CombatesPage() {
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const [data, setData] = useState<{ list: Registro[], count: number, page: number }>({
    list: [], count: 0, page: 1
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchActiveCharacter();
  }, []);

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
        tipo: 'combate',
        startDate,
        endDate
      });
      setData({ list: result.data, count: result.count, page });
    } catch (err) {
      console.error('Error fetching combats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-20 flex flex-col">
      <div className="max-w-[1750px] mx-auto w-full flex-1">
        <header className="w-full mb-6 sm:mb-8 ninja-card-rojo p-4 sm:p-8 xl:p-12 z-50">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-10">
            
            {/* Top Row: Breadcrumbs & Title (Mobile) / Left Side (Desktop) */}
            <div className="flex items-center justify-between w-full lg:w-auto gap-6">
              <Breadcrumbs 
                items={[
                  { label: 'Inicio', href: '/' },
                  { label: 'Registros', href: '/registros' },
                  { label: 'Combates' }
                ]} 
              />

              {/* Title (Mobile) */}
              <div className="lg:hidden text-center flex-1 min-w-0">
                <h1 className="ninja-title text-xl sm:text-3xl truncate uppercase tracking-widest">
                  <span className="text-rojo-sangre">COMBATES</span>
                </h1>
              </div>

              {/* Spacer for centering title on mobile */}
              <div className="lg:hidden w-10 sm:w-12" />
            </div>

            {/* Title & Icon (Desktop) */}
            <div className="hidden lg:flex items-center gap-10 flex-1 justify-center">
              <div className="h-10 w-px bg-oro/10" />
              <div className="flex items-center gap-6">
                {/* <img src="/assets/icons/shuriken.png" className="w-6 xl:w-8 h-auto" alt="icon" /> */}
                <h1 className="ninja-title text-4xl xl:text-7xl uppercase tracking-[0.3em] leading-none break-words">
                  <span className="text-rojo-sangre">COMBATES</span>
                </h1>
              </div>
              <div className="h-10 w-px bg-oro/10" />
            </div>
            
            <button 
              onClick={() => setShowForm(true)}
              disabled={!activeCharacter}
              title={!activeCharacter ? "Requiere tener un personaje activo en tu ficha shinobi" : undefined}
              className="flex items-center gap-4 sm:gap-6 px-8 sm:px-10 py-3 sm:py-5 ninja-btn-rojo w-full lg:w-auto justify-center text-xs sm:text-base disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" /> NUEVO COMBATE
            </button>
          </div>
        </header>

        {(showForm || editingRegistro) ? (
          <CombatForm 
            onCreated={() => { setShowForm(false); setEditingRegistro(null); fetchData(data.page); }} 
            initialData={editingRegistro}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-6 sm:gap-10 p-6 sm:p-10 ninja-card-rojo animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex items-center gap-6">
                <span className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.3em]">DESDE</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="ninja-input py-2"
                />
              </div>
              <div className="flex items-center gap-6">
                <span className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.3em]">HASTA</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="ninja-input py-2"
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-[10px] xl:text-xs font-black text-rojo-sangre uppercase tracking-[0.3em] hover:brightness-125 transition-all border-b border-rojo-sangre/30 pb-1 italic"
                >
                  LIMPIAR FILTROS
                </button>
              )}
            </div>

            <div className="bg-transparent space-y-6">
              {loading ? (
                <div className="py-60 flex flex-col items-center gap-10">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-rojo-sangre/20 border-t-rojo-sangre rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/assets/icons/shuriken.png" className="w-5 h-5 object-contain" alt="Logo" />
                    </div>
                  </div>
                  <p className="text-rojo-sangre font-black uppercase tracking-[0.6em] text-sm animate-pulse">Analizando Campo de Batalla...</p>
                </div>
              ) : data.list.length > 0 ? (
                <div className="space-y-10">
                  <div className="flex flex-col gap-6 xl:gap-8">
                    {data.list.map(reg => (
                      <RegistroCard 
                        key={reg.id} 
                        registro={reg} 
                        onRefresh={() => fetchData(data.page)} 
                        isAdmin={isAdmin} 
                        isGlobalView={true}
                        onEdit={(r) => { setEditingRegistro(r); setShowForm(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex justify-center items-center pt-20">
                    <div className="flex items-center gap-12 px-10 py-6 bg-black/60 border border-oro/20 ninja-clip-md backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
                      <button 
                        disabled={data.page === 1}
                        onClick={() => fetchData(data.page - 1)}
                        className="w-14 h-14 flex items-center justify-center bg-oro/20 border-2 border-oro/40 hover:border-oro hover:bg-oro/30 text-white transition-all ninja-clip-xs disabled:opacity-30 disabled:border-oro/10 disabled:bg-black/40 disabled:cursor-not-allowed shadow-xl"
                      >
                        <ChevronLeft className="w-8 h-8 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
                      </button>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-oro/40 uppercase tracking-[0.4em] mb-1">REGISTROS DE GUERRA</span>
                        <div className="text-sm xl:text-lg font-black text-oro uppercase tracking-[0.2em] italic">
                          PÁGINA <span className="text-white drop-shadow-md">{data.page}</span> / <span className="text-oro/40">{Math.ceil(data.count / 15)}</span>
                        </div>
                      </div>

                      <button 
                        disabled={data.list.length < 15 || data.page * 15 >= data.count}
                        onClick={() => fetchData(data.page + 1)}
                        className="w-14 h-14 flex items-center justify-center bg-oro/20 border-2 border-oro/40 hover:border-oro hover:bg-oro/30 text-white transition-all ninja-clip-xs disabled:opacity-30 disabled:border-oro/10 disabled:bg-black/40 disabled:cursor-not-allowed shadow-xl"
                      >
                        <ChevronRight className="w-8 h-8 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-60 text-center ninja-card-rojo opacity-50">
                  <Swords className="w-24 h-24 text-rojo-sangre/10 mx-auto mb-8" />
                  <p className="text-sm xl:text-lg font-black text-rojo-sangre/20 uppercase tracking-[0.6em] italic">NO HAY COMBATES REGISTRADOS TODAVÍA</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
