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
    <div className="min-h-screen p-4 sm:p-8 xl:p-20 flex flex-col">
      <div className="max-w-[1750px] mx-auto w-full flex-1">
        <header className="w-full mb-10 sm:mb-16 ninja-card-oro p-4 sm:p-8 xl:p-12 z-50">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-10">
            
            {/* Top Row: Back Button & Title (Mobile) / Left Side (Desktop) */}
            <div className="flex items-center justify-between w-full lg:w-auto gap-6">
              <Link 
                href="/registros" 
                className="flex items-center gap-3 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-[10px] sm:text-xs xl:text-base shrink-0"
              >
                <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
                <span>VOLVER</span>
              </Link>

              {/* Title (Mobile) */}
              <div className="lg:hidden text-center flex-1 min-w-0">
                <h1 className="ninja-title text-xl sm:text-3xl truncate uppercase tracking-widest">
                  <span className="text-oro">COMPRAS</span>
                </h1>
              </div>

              {/* Spacer for centering title on mobile */}
              <div className="lg:hidden w-10 sm:w-12" />
            </div>

            {/* Title & Icon (Desktop) */}
            <div className="hidden lg:flex items-center gap-10 flex-1 justify-center">
              <div className="h-10 w-px bg-oro/10" />
              <div className="flex items-center gap-6">
                {/* <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-6 xl:w-8 h-auto" alt="icon" /> */}
                <h1 className="ninja-title text-4xl xl:text-7xl uppercase tracking-[0.3em] leading-none break-words">
                  <span className="text-oro">COMPRAS</span>
                </h1>
              </div>
              <div className="h-10 w-px bg-oro/10" />
            </div>
          </div>
        </header>

        <div className="space-y-12">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10 p-6 sm:p-10 ninja-card-oro animate-in fade-in slide-in-from-top-2 duration-500">
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

          <div className="bg-transparent space-y-12">
            {loading ? (
              <div className="py-60 flex flex-col items-center gap-10">
                <div className="w-16 h-16 border-4 border-oro border-t-transparent animate-spin ninja-clip-md" />
                <p className="text-oro font-black uppercase tracking-[0.6em] text-sm animate-pulse">Auditando Tesorería...</p>
              </div>
            ) : data.list.length > 0 ? (
              <div className="space-y-16">
                <div className="flex flex-col gap-10 xl:gap-14">
                  {data.list.map(reg => (
                    <RegistroCard 
                      key={reg.id} 
                      registro={reg} 
                      onRefresh={() => fetchData(data.page)} 
                      isAdmin={isAdmin} 
                      isGlobalView={true}
                    />
                  ))}
                </div>
                
                <div className="flex justify-center items-center gap-10 pt-16 border-t border-oro/10">
                  <button 
                    disabled={data.page === 1}
                    onClick={() => fetchData(data.page - 1)}
                    className="p-5 ninja-btn-oro"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </button>
                  <span className="text-xs xl:text-base font-black text-oro uppercase tracking-[0.4em] italic">
                    PÁGINA <span className="text-oro/40">{data.page}</span> DE <span className="text-oro/40">{Math.ceil(data.count / 15)}</span>
                  </span>
                  <button 
                    disabled={data.list.length < 15 || data.page * 15 >= data.count}
                    onClick={() => fetchData(data.page + 1)}
                    className="p-5 ninja-btn-oro"
                  >
                    <ChevronRight className="w-7 h-7" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-60 text-center ninja-card-oro opacity-50">
                <ShoppingBag className="w-24 h-24 text-oro/10 mx-auto mb-8" />
                <p className="text-sm xl:text-lg font-black text-oro/20 uppercase tracking-[0.6em] italic">NO HAY COMPRAS REGISTRADAS TODAVÍA</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
