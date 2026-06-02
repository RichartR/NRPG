'use client';

import { useCharacterStore } from '@/store/useCharacterStore';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ImageIcon, Save, X, Loader2, User } from 'lucide-react';
import { CharacterService } from '@/services/supabase/character.service';
import { CharacterRadarChart } from './CharacterRadarChart';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { useScrollLock } from '@/hooks/useScrollLock';

export default function CharacterSheet() {
  const { activeCharacter, loading, error, fetchActiveCharacter } = useCharacterStore();
  const [isEditingPortrait, setIsEditingPortrait] = useState(false);

  // Prevent background scrolling when portrait modal is open
  useScrollLock(isEditingPortrait);
  const [newPortraitUrl, setNewPortraitUrl] = useState('');
  const [updating, setUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [hasPendingAppeal, setHasPendingAppeal] = useState(false);
  const [checkingAppeal, setCheckingAppeal] = useState(false);
  const [sendingAppeal, setSendingAppeal] = useState(false);

  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  useEffect(() => {
    setMounted(true);
    fetchActiveCharacter();
  }, [fetchActiveCharacter]);

  useEffect(() => {
    if (activeCharacter && activeCharacter.activo === false) {
      setCheckingAppeal(true);
      CharacterService.checkPendingAppeal(activeCharacter.id)
        .then(hasAppeal => {
          setHasPendingAppeal(hasAppeal);
        })
        .catch(err => console.error("Error checking pending appeal:", err))
        .finally(() => setCheckingAppeal(false));
    }
  }, [activeCharacter]);

  const handleAppeal = async () => {
    if (!activeCharacter) return;
    setSendingAppeal(true);
    try {
      await CharacterService.appealArchive(activeCharacter.id);
      setHasPendingAppeal(true);
      addToast("Apelación enviada con éxito al equipo de administración", "success");
    } catch (err: any) {
      console.error("Error sending appeal:", err);
      addToast(err.message || "Error al enviar la apelación", "error");
    } finally {
      setSendingAppeal(false);
    }
  };

  const handleManualArchive = async () => {
    if (!activeCharacter) return;

    const ok = await confirmAction({
      title: 'Archivar Definitivamente',
      message: '¿ESTÁS SEGURO? Si archivas definitivamente este personaje, se liberarán inmediatamente todos sus requisitos y cupos en el glosario. La ficha no se podrá recuperar de forma automática ni apelar.',
      variant: 'danger',
      confirmLabel: 'Archivar Definitivamente'
    });

    if (!ok) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/characters/${activeCharacter.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al archivar personaje');
      }

      addToast("Personaje archivado definitivamente con éxito", "success");
      await fetchActiveCharacter();
    } catch (err: any) {
      console.error("Error manual archiving:", err);
      addToast(err.message || "Error al archivar", "error");
    } finally {
      setUpdating(false);
    }
  };

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
    <div className="relative ninja-card-oro p-5 sm:p-6 xl:p-6 shadow-2xl h-full flex flex-col justify-between overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-oro/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>

      <div className="relative z-10 w-full h-full flex flex-col justify-between gap-6">
        {activeCharacter.activo === false && (
          <div className="bg-rojo-sangre/15 border border-rojo-sangre/30 p-5 ninja-clip-xs flex flex-col gap-4 relative overflow-hidden shadow-[0_0_20px_rgba(103,9,9,0.25)]">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-rojo-sangre via-oro to-transparent" />
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <span className="text-rojo-sangre text-base animate-pulse">⚠️</span>
              <span className="text-oro text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] font-ninja">
                Shinobi Archivado por Inactividad
              </span>
            </div>
            <p className="text-gris-texto text-[10px] sm:text-xs font-bold leading-relaxed uppercase tracking-wider text-center sm:text-left">
              Tu personaje ha superado los 3 meses sin actividad reglamentaria. Puedes apelar para reactivarlo o archivarlo manualmente de forma definitiva.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {hasPendingAppeal ? (
                <button
                  disabled
                  className="flex-1 py-2.5 bg-black/40 border border-oro/10 text-oro/40 text-[9px] sm:text-xs font-black uppercase tracking-widest cursor-not-allowed text-center"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  Apelación Pendiente
                </button>
              ) : (
                <button
                  onClick={handleAppeal}
                  disabled={checkingAppeal || sendingAppeal}
                  className="flex-1 py-2.5 bg-oro text-rojo-sangre border border-oro-soft hover:brightness-110 active:scale-[0.98] transition-all text-[9px] sm:text-xs font-black uppercase tracking-widest text-center cursor-pointer disabled:opacity-50"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  {sendingAppeal ? 'Enviando...' : 'Apelar Recuperación'}
                </button>
              )}
              <button
                onClick={handleManualArchive}
                disabled={updating}
                className="flex-1 py-2.5 bg-rojo-sangre/20 text-red-400 border border-rojo-sangre/30 hover:bg-rojo-sangre hover:text-oro active:scale-[0.98] transition-all text-[9px] sm:text-xs font-black uppercase tracking-widest text-center cursor-pointer disabled:opacity-50"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                {updating ? 'Archivando...' : 'Archivar Definitivamente'}
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col 2xl:flex-row justify-between items-center 2xl:items-start gap-6 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left min-w-0 w-full 2xl:w-auto">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
              <div className="relative w-full h-full bg-black/40 overflow-hidden flex items-center justify-center ninja-clip-md">
                {activeCharacter.url_img ? (
                  <img
                    src={activeCharacter.url_img}
                    className="w-full h-full object-cover object-top"
                    alt="Avatar"
                  />
                ) : (
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-oro/20" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 w-full">
              <h2 className="ninja-title text-2xl sm:text-4xl xl:text-5xl mb-2 break-words leading-tight">
                {nombre_ninja}
              </h2>
              {/* Rango (Solo en móvil, centrado y arriba) */}
              <div className="flex sm:hidden justify-center mb-3">
                <span className="px-4 py-1.5 text-[10px] font-black bg-rojo-sangre text-oro uppercase tracking-[0.2em] whitespace-nowrap">
                  Rango {rango}
                </span>
              </div>
              <div className="flex flex-nowrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-2 sm:mt-4 overflow-x-auto sm:overflow-visible scrollbar-none max-w-full sm:max-w-none py-1 pr-6">
                {/* Rango (Solo en desktop/tablet, integrado en la fila) */}
                <span className="hidden sm:inline-block px-4 sm:px-5 py-1.5 text-[10px] sm:text-xs xl:text-sm font-black bg-rojo-sangre text-oro uppercase tracking-[0.2em] whitespace-nowrap">
                  Rango {rango}
                </span>
                <span className="text-oro/80 text-[10px] sm:text-xs xl:text-base font-bold uppercase tracking-widest whitespace-nowrap">{xp || 0} EXP</span>
                <span className="text-oro/80 text-[10px] sm:text-xs xl:text-base font-bold uppercase tracking-widest whitespace-nowrap">{ryous || 0} Ryos</span>
                <span className="text-oro/80 text-[10px] sm:text-xs xl:text-base font-bold uppercase tracking-widest whitespace-nowrap">{activeCharacter.puntos_aprendizaje || 0} PA</span>
                {activeCharacter.moneda_evento !== undefined && (
                  <span className="text-oro/80 text-[10px] sm:text-xs xl:text-base font-bold uppercase tracking-widest whitespace-nowrap">{activeCharacter.moneda_evento || 0} M. Evento</span>
                )}
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

        <div className="w-full min-w-0 flex-1 flex flex-col justify-between gap-6">
          {/* Atributos Derivados */}
          <div className="space-y-4 w-full min-w-0">
            <h3 className="text-xs sm:text-base xl:text-xl font-black text-oro mb-3 flex items-center justify-center sm:justify-start gap-3 uppercase tracking-[0.3em]">
              <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto object-contain" alt="icon" />
              Estado Vital
            </h3>

            <div className="space-y-3.5 w-full min-w-0">
              <div className="space-y-3 w-full min-w-0">
                <div className="flex justify-between text-[10px] xl:text-sm font-black uppercase tracking-widest w-full gap-2">
                  <span className="text-red-600 flex items-center gap-3 shrink-0">VIT (Vitalidad)</span>
                  <span className="text-oro shrink-0">{atributos_derivados.VIT} / {atributos_derivados.VIT}</span>
                </div>
                <div className="h-2 w-full bg-black/40 border border-oro/10 p-[1px] relative overflow-hidden">
                  <div className="h-full bg-red-600 shadow-[0_0_12px_rgba(103,9,9,0.5)]" style={{ width: '100%' }}></div>
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

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-rojo-sangre/10 border border-oro/20 p-2 sm:p-2.5 flex items-center justify-between px-4 group hover:bg-rojo-sangre/20 transition-all ninja-clip-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1 h-1 bg-oro/20 rotate-45 group-hover:bg-oro transition-colors shrink-0" />
                  <span className="text-oro/40 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] truncate">Resistencia</span>
                </div>
                <span className="text-base sm:text-lg font-black text-oro shrink-0">{atributos_derivados.RES}%</span>
              </div>
              <div className="bg-rojo-sangre/10 border border-oro/20 p-2 sm:p-2.5 flex items-center justify-between px-4 group hover:bg-rojo-sangre/20 transition-all ninja-clip-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1 h-1 bg-oro/20 rotate-45 group-hover:bg-oro transition-colors shrink-0" />
                  <span className="text-oro/40 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] truncate">Velocidad</span>
                </div>
                <span className="text-base sm:text-lg font-black text-oro shrink-0">{atributos_derivados.VEL}</span>
              </div>
            </div>

            {/* Ramas y Especialidades */}
            {activeCharacter.personajes_ramas && activeCharacter.personajes_ramas.some((r: any) => r.info_ramas_clanes) && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {activeCharacter.personajes_ramas
                  .filter((r: any) => r.info_ramas_clanes)
                  .sort((a: any, b: any) => a.slot - b.slot)
                  .map((rama: any) => (
                    <div key={rama.slot} className="bg-black/40 border border-oro/10 p-2 sm:p-2.5 flex flex-col justify-center px-4 relative overflow-hidden ninja-clip-xs group hover:border-oro/30 transition-all">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-oro/5 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none" />

                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-oro/40 text-[9px] font-black uppercase tracking-[0.15em] truncate">
                          Rama / Clan
                        </span>
                      </div>

                      <div className="mt-1 text-xs xl:text-sm font-black text-oro truncate">
                        {rama.info_ramas_clanes?.nombre}
                      </div>

                      {rama.info_sub_especialidades && (
                        <div className="text-[9px] xl:text-[10px] text-red-500 font-bold uppercase tracking-widest mt-0.5 truncate">
                          {rama.info_sub_especialidades.nombre}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Stats Base */}
          <div className="space-y-4">
            <h3 className="text-xs sm:text-base xl:text-xl font-black text-oro flex items-center justify-center sm:justify-start gap-3 uppercase tracking-[0.3em] my-0">
              <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto object-contain" alt="icon" />
              Atributos Base
            </h3>

            {/* Radar visible en todo momento */}
            <div className="flex justify-center items-center w-full bg-black/20 border border-oro/10 p-2.5 ninja-clip-xs relative overflow-hidden flex-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
              <div className="w-full max-w-[440px] xl:max-w-[460px] mx-auto">
                <CharacterRadarChart stats={stats_base} maxVal={10} />
              </div>
            </div>

            {/* Cuadrícula compacta de Atributos Base */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
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
                <div key={stat.label} className="bg-black/40 border border-oro/10 p-2.5 sm:p-3 flex justify-between items-center group hover:border-oro/40 transition-all ninja-clip-xs overflow-hidden">
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

      {isEditingPortrait && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg ninja-card-oro p-8 space-y-6 relative overflow-hidden" style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}>
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
        </div>,
        document.body
      )}
    </div>
  );
}



