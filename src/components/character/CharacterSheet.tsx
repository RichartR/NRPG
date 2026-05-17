'use client';

import { useCharacterStore } from '@/store/useCharacterStore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ImageIcon, Save, X, Loader2, User } from 'lucide-react';
import { CharacterService } from '@/services/supabase/character.service';

export default function CharacterSheet() {
  const { activeCharacter, loading, error, fetchActiveCharacter } = useCharacterStore();
  const [isEditingPortrait, setIsEditingPortrait] = useState(false);
  const [newPortraitUrl, setNewPortraitUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchActiveCharacter();
  }, [fetchActiveCharacter]);

  const handleUpdatePortrait = async () => {
    if (!activeCharacter) return;
    setUpdating(true);
    try {
      await CharacterService.updateCharacter(activeCharacter.id, {
        url_img: newPortraitUrl.trim() || null
      });
      await fetchActiveCharacter();
      setIsEditingPortrait(false);
    } catch (err) {
      console.error("Error updating portrait:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="ninja-card-oro p-6 sm:p-10 xl:p-12 h-full min-h-[750px] xl:min-h-[850px] flex flex-col justify-center animate-pulse">
      <div className="space-y-10">
        <div className="flex flex-col gap-6 items-center sm:items-start">
          <div className="h-14 w-64 bg-oro/10 ninja-clip-sm" />
          <div className="flex gap-4">
            <div className="h-8 w-24 bg-rojo-sangre/20" />
            <div className="h-8 w-20 bg-oro/5" />
            <div className="h-8 w-20 bg-oro/5" />
          </div>
        </div>
        <div className="space-y-12">
          <div className="space-y-6">
            <div className="h-6 w-40 bg-oro/10" />
            <div className="h-20 w-full bg-black/40 border border-oro/10" />
            <div className="h-20 w-full bg-black/40 border border-oro/10" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-black/40 border border-oro/10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return <div className="text-rojo-sangre bg-rojo-sangre/10 p-6 ninja-box ninja-border border-rojo-sangre/40 h-full flex items-center justify-center">Error: {error}</div>;
  if (!activeCharacter) return <div className="text-oro/60 bg-black/60 p-8 ninja-box ninja-border h-full flex items-center justify-center">No tienes un personaje activo.</div>;

  const { stats_base, atributos_derivados, nombre_ninja, rango, xp, ryous } = activeCharacter;

  // Imagen del personaje 100% independiente
  const portrait = activeCharacter.url_img || '/assets/placeholders/shinobi.png';

  return (
    <div className="relative ninja-card-oro p-6 sm:p-10 xl:p-12 shadow-2xl h-full flex flex-col justify-center overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-oro/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>

      <div className="relative z-10 w-full">
        <div className="flex flex-col 2xl:flex-row justify-between items-center 2xl:items-start gap-8 mb-10 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left min-w-0 w-full 2xl:w-auto overflow-hidden">
            <div 
              onClick={() => {
                setNewPortraitUrl(activeCharacter.url_img || '');
                setIsEditingPortrait(true);
              }}
              className="relative group cursor-pointer w-20 h-20 sm:w-24 sm:h-24 shrink-0"
            >
               <div className="absolute -inset-1 bg-oro/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="relative w-full h-full ninja-card-oro p-1 border-oro/20 bg-black/40 overflow-hidden flex items-center justify-center">
                {activeCharacter.url_img ? (
                  <img 
                    src={activeCharacter.url_img} 
                    className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                    alt="Avatar"
                  />
                ) : (
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-oro/20 group-hover:text-oro/40 transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 bg-oro text-rojo-sangre rounded-full shadow-lg">
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <h2 className="ninja-title text-4xl sm:text-5xl mb-2 break-words leading-tight">
                {nombre_ninja}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-4">
                <span className="px-4 sm:px-5 py-1.5 text-[10px] sm:text-xs xl:text-sm font-black bg-rojo-sangre text-oro uppercase tracking-[0.2em] whitespace-nowrap">
                  Rango {rango}
                </span>
                <span className="text-oro/80 text-[10px] sm:text-xs xl:text-base font-bold uppercase tracking-widest whitespace-nowrap">{xp} XP</span>
                <span className="text-oro/80 text-[10px] sm:text-xs xl:text-base font-bold uppercase tracking-widest whitespace-nowrap">{ryous} Ryos</span>
              </div>
            </div>
          </div>
          
          <Link 
            href={`/ficha/${activeCharacter.id}`}
            className="ninja-btn-oro px-8 py-4 text-xs xl:text-sm w-full 2xl:w-auto text-center shrink-0"
          >
            Ver Ficha
          </Link>
        </div>

        <div className="w-full min-w-0 space-y-12">
            {/* Atributos Derivados */}
            <div className="space-y-8 w-full min-w-0">
              <h3 className="text-xs sm:text-base xl:text-xl font-black text-oro mb-6 flex items-center justify-center sm:justify-start gap-3 uppercase tracking-[0.3em]">
                <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto object-contain" alt="icon" />
                Estado Vital
              </h3>
              
              <div className="space-y-6 w-full min-w-0">
                <div className="space-y-3 w-full min-w-0">
                  <div className="flex justify-between text-[10px] xl:text-sm font-black uppercase tracking-widest w-full gap-2">
                    <span className="text-rojo-sangre flex items-center gap-3 shrink-0">VIT (Vitalidad)</span>
                    <span className="text-oro shrink-0">{atributos_derivados.VIT} / {atributos_derivados.VIT}</span>
                  </div>
                  <div className="h-2 w-full bg-black/40 border border-oro/10 p-[1px] relative overflow-hidden">
                    <div className="h-full bg-rojo-sangre shadow-[0_0_12px_rgba(103,9,9,0.5)]" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="space-y-3 w-full min-w-0">
                  <div className="flex justify-between text-[10px] xl:text-sm font-black uppercase tracking-widest w-full gap-2">
                    <span className="text-blue-500 flex items-center gap-3 shrink-0">CH (Chakra)</span>
                    <span className="text-oro shrink-0">{atributos_derivados.CH} / {atributos_derivados.CH}</span>
                  </div>
                  <div className="h-2 w-full bg-black/40 border border-oro/10 p-[1px] relative overflow-hidden">
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
                <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto object-contain" alt="icon" />
                Atributos Base
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
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
                  <div key={stat.label} className="bg-black/40 border border-oro/10 p-3 sm:p-4 flex justify-between items-center group hover:border-oro/40 transition-all ninja-clip-xs overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1 h-1 bg-oro/20 group-hover:bg-oro transition-colors rotate-45 shrink-0" />
                      <span className="text-oro/60 text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate">{stat.label}</span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-oro shrink-0">{stat.value}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {isEditingPortrait && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg ninja-card-oro p-8 space-y-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-xl font-black text-oro uppercase tracking-[0.3em] flex items-center gap-4 italic">
                <ImageIcon className="w-6 h-6" />
                Retrato del Ninja
              </h3>
              <button 
                onClick={() => setIsEditingPortrait(false)}
                className="text-oro/40 hover:text-oro transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 relative z-10">
              <p className="text-oro/60 text-xs font-bold uppercase tracking-widest leading-relaxed">
                Introduce la URL de la imagen para este personaje. Se recomienda una relación de aspecto 3:4.
              </p>
              <div className="group relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-oro/20 group-focus-within:text-oro transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  value={newPortraitUrl}
                  onChange={(e) => setNewPortraitUrl(e.target.value)}
                  placeholder="https://ejemplo.com/retrato.jpg"
                  className="w-full bg-black/60 border border-oro/20 text-oro p-4 pl-12 text-sm focus:outline-none focus:border-oro transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4 relative z-10">
              <button 
                onClick={() => setIsEditingPortrait(false)}
                className="flex-1 px-6 py-4 bg-black/40 border border-oro/10 text-oro/60 text-xs font-black uppercase tracking-widest hover:bg-black/60 hover:text-oro transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdatePortrait}
                disabled={updating}
                className="flex-1 px-6 py-4 ninja-btn-oro text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{updating ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



