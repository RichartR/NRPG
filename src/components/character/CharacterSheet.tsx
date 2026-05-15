'use client';

import { useCharacterStore } from '@/store/useCharacterStore';
import { useEffect } from 'react';
import Link from 'next/link';

export default function CharacterSheet() {
  const { activeCharacter, loading, error, fetchActiveCharacter } = useCharacterStore();

  useEffect(() => {
    fetchActiveCharacter();
  }, [fetchActiveCharacter]);

  if (loading) return <div className="animate-pulse bg-black/60 p-8 ninja-box ninja-border flex justify-center items-center h-64 text-oro font-black uppercase tracking-widest">Cargando datos ninja...</div>;
  if (error) return <div className="text-rojo-sangre bg-rojo-sangre/10 p-6 ninja-box ninja-border border-rojo-sangre/40">Error: {error}</div>;
  if (!activeCharacter) return <div className="text-oro/60 bg-black/60 p-8 ninja-box ninja-border">No tienes un personaje activo.</div>;

  const { stats_base, atributos_derivados, nombre_ninja, rango, xp, ryous } = activeCharacter;

  return (
    <div className="relative ninja-card-oro p-6 sm:p-10 xl:p-12 shadow-2xl h-full flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-80 h-80 bg-oro/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex flex-col 2xl:flex-row justify-between items-center 2xl:items-start gap-6 2xl:gap-10 mb-10">
          <div className="text-center 2xl:text-left min-w-0 w-full 2xl:w-auto">
            <h2 className="ninja-title text-4xl sm:text-5xl mb-2 break-words">
              {nombre_ninja}
            </h2>
            <div className="flex flex-wrap items-center justify-center 2xl:justify-start gap-3 sm:gap-4 mt-4">
              <span className="px-4 sm:px-5 py-1.5 text-[10px] sm:text-xs xl:text-sm font-black bg-rojo-sangre text-oro uppercase tracking-[0.2em]">
                Rango {rango}
              </span>
              <span className="text-oro/80 text-[10px] sm:text-xs xl:text-base font-bold uppercase tracking-widest">{xp} XP</span>
              <span className="text-oro/80 text-[10px] sm:text-xs xl:text-base font-bold uppercase tracking-widest">{ryous} Ryos</span>
            </div>
          </div>
          
          <Link 
            href={`/ficha/${activeCharacter.id}`}
            className="ninja-btn-oro px-8 py-4 text-xs xl:text-sm w-full 2xl:w-auto text-center shrink-0"
          >
            Ver Ficha
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-10 xl:gap-12">
          {/* Atributos Derivados */}
          <div className="space-y-8">
            <h3 className="text-xs sm:text-base xl:text-xl font-black text-oro mb-6 flex items-center justify-center sm:justify-start gap-3 uppercase tracking-[0.3em]">
              <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-6 h-auto object-contain" alt="icon" />
              Estado Vital
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] xl:text-sm font-black uppercase tracking-widest">
                  <span className="text-rojo-sangre flex items-center gap-3">VIT (Vitalidad)</span>
                  <span className="text-oro">{atributos_derivados.VIT} / {atributos_derivados.VIT}</span>
                </div>
                <div className="h-2 w-full bg-black/40 border border-oro/10 p-[1px]">
                  <div className="h-full bg-rojo-sangre shadow-[0_0_12px_rgba(103,9,9,0.5)]" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] xl:text-sm font-black uppercase tracking-widest">
                  <span className="text-blue-500 flex items-center gap-3">CH (Chakra)</span>
                  <span className="text-oro">{atributos_derivados.CH} / {atributos_derivados.CH}</span>
                </div>
                <div className="h-2 w-full bg-black/40 border border-oro/10 p-[1px]">
                  <div className="h-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.5)]" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="bg-rojo-sangre/10 border border-oro/20 p-4 sm:p-6 flex flex-col justify-center items-center group hover:bg-rojo-sangre/20 transition-all ninja-clip-xs">
                <div className="w-1.5 h-1.5 bg-oro/20 rotate-45 mb-3 group-hover:bg-oro transition-colors" />
                <span className="text-oro/40 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Resistencia</span>
                <span className="text-xl sm:text-2xl font-black text-oro">{atributos_derivados.RES}%</span>
              </div>
              <div className="bg-rojo-sangre/10 border border-oro/20 p-4 sm:p-6 flex flex-col justify-center items-center group hover:bg-rojo-sangre/20 transition-all ninja-clip-xs">
                <div className="w-1.5 h-1.5 bg-oro/20 rotate-45 mb-3 group-hover:bg-oro transition-colors" />
                <span className="text-oro/40 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Velocidad</span>
                <span className="text-xl sm:text-2xl font-black text-oro">{atributos_derivados.VEL}</span>
              </div>
            </div>
          </div>

          {/* Stats Base */}
          <div>
            <h3 className="text-xs sm:text-base xl:text-xl font-black text-oro mb-6 flex items-center justify-center sm:justify-start gap-3 uppercase tracking-[0.3em]">
              <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-6 h-auto object-contain" alt="icon" />
              Atributos Base
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'NIN', value: stats_base.NIN },
                { label: 'TAI', value: stats_base.TAI },
                { label: 'GEN', value: stats_base.GEN },
                { label: 'INT', value: stats_base.INT },
                { label: 'FUE', value: stats_base.FUE },
                { label: 'AGI', value: stats_base.AGI },
                { label: 'EST', value: stats_base.EST },
                { label: 'SM', value: stats_base.SM },
              ].map((stat) => (
                <div key={stat.label} className="bg-black/40 border border-oro/10 p-3 sm:p-4 flex justify-between items-center group hover:border-oro/40 transition-all ninja-clip-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-1 bg-oro/20 group-hover:bg-oro transition-colors rotate-45" />
                    <span className="text-oro/60 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                  </div>
                  <span className="text-base sm:text-lg font-black text-oro">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}



