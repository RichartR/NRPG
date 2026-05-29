'use client';

import { useState, useEffect } from 'react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { RegistrosService } from '@/services/supabase/registros.service';
import { Registro } from '@/domain/types';
import NarrationForm from '@/components/registros/NarrationForm';
import NarrationTable from '@/components/registros/NarrationTable';
import { ScrollText, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AuthService } from '@/services/supabase/auth.service';
import { createClient } from '@/utils/supabase/client';
import { useCharacterStore } from '@/store/useCharacterStore';

export default function NarracionPage() {
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const [data, setData] = useState<{ list: Registro[]; count: number; page: number }>({
    list: [],
    count: 0,
    page: 1,
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
      const {
        data: { user },
      } = await AuthService.getUser();

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
        tipo: 'accion',
        subtipo: 'narracion',
        startDate,
        endDate,
      });
      setData({ list: result.data, count: result.count, page });
    } catch (err) {
      console.error('Error fetching narration records:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8 xl:px-12 xl:py-12 flex flex-col animate-in fade-in duration-500">
      <div className="max-w-[1750px] mx-auto w-full flex-1 flex flex-col gap-6 sm:gap-8">
        <header className="w-full ninja-card-oro p-4 sm:p-6 xl:p-8 z-50">
          <div className="flex flex-col gap-5 sm:gap-6 w-full">
            <div className="flex flex-col gap-4 border-b border-oro/10 pb-4 lg:flex-row lg:items-center lg:justify-between w-full">
              <div className="w-full min-w-0">
                <Breadcrumbs
                  items={[
                    { label: 'Inicio', href: '/' },
                    { label: 'Registros', href: '/registros' },
                    { label: 'Narración' },
                  ]}
                />
              </div>

              <button
                onClick={() => {
                  setEditingRegistro(null);
                  setShowForm(true);
                }}
                disabled={!activeCharacter}
                title={!activeCharacter ? 'Requiere tener un personaje activo en tu ficha shinobi' : undefined}
                className="flex w-full lg:w-auto items-center justify-center gap-3 px-5 sm:px-6 py-3 ninja-btn-oro text-[10px] sm:text-xs disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest font-black shrink-0"
              >
                <Plus className="w-4 h-4" /> NUEVA NARRACIÓN
              </button>
            </div>

            <div className="flex items-center justify-center py-1 sm:py-2">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-center">
                <h1 className="ninja-title text-3xl sm:text-5xl xl:text-7xl uppercase tracking-[0.18em] sm:tracking-[0.3em] leading-none text-center">
                  <span className="text-oro">NARRACIÓN</span>
                </h1>
              </div>
            </div>
          </div>
        </header>

        {showForm || editingRegistro ? (
          <NarrationForm
            onCreated={() => {
              setShowForm(false);
              setEditingRegistro(null);
              fetchData(data.page);
            }}
            initialData={editingRegistro}
          />
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="ninja-card-oro p-4 sm:p-6 xl:p-8 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                <div className="flex flex-col gap-2 min-w-0">
                  <span className="text-[10px] sm:text-xs font-black text-oro/40 uppercase tracking-[0.25em] sm:tracking-[0.3em]">DESDE</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="ninja-input w-full py-3 text-sm sm:text-base"
                  />
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                  <span className="text-[10px] sm:text-xs font-black text-oro/40 uppercase tracking-[0.25em] sm:tracking-[0.3em]">HASTA</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="ninja-input w-full py-3 text-sm sm:text-base"
                  />
                </div>

                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="w-full lg:w-auto justify-self-start text-[10px] sm:text-xs font-black text-rojo-sangre uppercase tracking-[0.25em] sm:tracking-[0.3em] hover:brightness-125 transition-all border-b border-rojo-sangre/30 pb-1 italic"
                  >
                    LIMPIAR FILTROS
                  </button>
                )}
              </div>
            </div>

            <div className="bg-transparent space-y-6 sm:space-y-8">
              {loading ? (
                <div className="py-28 sm:py-40 flex flex-col items-center gap-8 sm:gap-10">
                  <div className="relative">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-oro/20 border-t-oro rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/assets/icons/shuriken.png" className="w-5 h-5 object-contain" alt="Logo" />
                    </div>
                  </div>
                  <p className="text-center text-oro font-black uppercase tracking-[0.35em] sm:tracking-[0.6em] text-[10px] sm:text-sm animate-pulse">
                    Sincronizando Crónicas...
                  </p>
                </div>
              ) : data.list.length > 0 ? (
                <div className="space-y-8 sm:space-y-10">
                  <NarrationTable
                    narraciones={data.list}
                    onRefresh={() => fetchData(data.page)}
                    isAdmin={isAdmin}
                    onEdit={(r) => {
                      setEditingRegistro(r);
                      setShowForm(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />

                  <div className="flex flex-col items-center gap-5 sm:gap-6 pt-10 sm:pt-16 border-t border-oro/10">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button
                        disabled={data.page === 1}
                        onClick={() => fetchData(data.page - 1)}
                        className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center ninja-btn-oro"
                      >
                        <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                      </button>

                      <div className="flex flex-col items-center px-3 text-center">
                        <span className="text-[9px] sm:text-[10px] font-black text-oro/40 uppercase tracking-[0.25em] sm:tracking-[0.4em] mb-1">
                          REGISTROS DE NARRACIÓN
                        </span>
                        <div className="text-[10px] sm:text-sm xl:text-base font-black text-oro uppercase tracking-[0.18em] sm:tracking-[0.2em] italic">
                          PAGINA <span className="text-oro/40">{data.page}</span> DE <span className="text-oro/40">{Math.ceil(data.count / 15)}</span>
                        </div>
                      </div>

                      <button
                        disabled={data.list.length < 15 || data.page * 15 >= data.count}
                        onClick={() => fetchData(data.page + 1)}
                        className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center ninja-btn-oro"
                      >
                        <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-24 sm:py-40 text-center ninja-card-oro opacity-50">
                  <ScrollText className="w-16 h-16 sm:w-24 sm:h-24 text-oro/10 mx-auto mb-6 sm:mb-8" />
                  <p className="text-[10px] sm:text-sm xl:text-lg font-black text-oro/20 uppercase tracking-[0.35em] sm:tracking-[0.6em] italic px-6">
                    NO HAY CRÓNICAS REGISTRADAS TODAVIA
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
