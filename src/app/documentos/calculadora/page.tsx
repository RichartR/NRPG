'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { SectionCard } from '@/components/ui/SectionCard';
import { CharacterRadarChart } from '@/components/character/CharacterRadarChart';
import { useMasterStore } from '@/store/useMasterStore';
import { useCharacterStore } from '@/store/useCharacterStore';
import { StatsLogic } from '@/domain/character/logic';
import { CharacterStats } from '@/domain/types';
import { Heart, ChevronUp, ChevronDown, RefreshCw, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { useToastStore } from '@/components/ui/Toast';

const LOCAL_STORAGE_KEY = 'nrpg_build_simulator_state';

const DEFAULT_STATS: CharacterStats = {
  NIN: 1,
  TAI: 1,
  GEN: 1,
  SM: 1,
  FUE: 1,
  AGI: 1,
  EST: 1,
  INT: 1
};

export default function BuildSimulatorPage() {
  const masters = useMasterStore();
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);

  const [stats, setStats] = useState<CharacterStats>(DEFAULT_STATS);

  // Modo de puntos: 'limite' (fija un total) o 'libres' (se incrementa conforme se suman stats)
  const [modoPuntos, setModoPuntos] = useState<'limite' | 'libres'>('limite');
  const [puntosTotalesInput, setPuntosTotalesInput] = useState<string>('8');
  const [puntosTotales, setPuntosTotales] = useState<number>(8);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar masters al montar
  useEffect(() => {
    useMasterStore.getState().initialize();
  }, []);

  // Cargar personaje activo si existe al montar
  useEffect(() => {
    useCharacterStore.getState().fetchActiveCharacter().catch(console.error);
  }, []);

  // Cargar datos guardados en localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stats && typeof parsed.stats === 'object') {
          setStats(parsed.stats);
        }
        if (typeof parsed.puntosTotales === 'number') {
          setPuntosTotales(parsed.puntosTotales);
          setPuntosTotalesInput(String(parsed.puntosTotales));
        }
        if (parsed.modoPuntos === 'limite' || parsed.modoPuntos === 'libres') {
          setModoPuntos(parsed.modoPuntos);
        }
      }
    } catch (e) {
      console.error('Error loading simulator state from localStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Guardar en localStorage ante cambios
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ stats, puntosTotales, modoPuntos }));
    } catch (e) {
      console.error('Error saving simulator state to localStorage:', e);
    }
  }, [stats, puntosTotales, modoPuntos, isLoaded]);

  // Puntos invertidos actualmente
  const puntosGastados = useMemo(() => {
    return Object.values(stats).reduce((acc, val) => acc + (Number(val) || 0), 0);
  }, [stats]);

  // Puntos totales efectivos a utilizar para el cálculo de Rango
  const puntosEfectivos = modoPuntos === 'libres' ? puntosGastados : puntosTotales;

  // Puntos disponibles en modo limite
  const puntosLibres = puntosTotales - puntosGastados;

  // Calcular el rango automático basado en el total de puntos de stats
  const rangoCalculado = useMemo(() => {
    if (!masters.rangoRules) return 'D';
    return StatsLogic.calculateAutoRank(
      puntosEfectivos,
      masters.rangoRules,
      [],
      [],
      [],
      [],
      null,
      [],
      []
    );
  }, [puntosEfectivos, masters.rangoRules]);

  // Reglas del rango actual (respetando stat_max del rango S como máximo absoluto de todo el sistema)
  const rangoBaseRules = useMemo(() => {
    const rule = masters.rangoRules?.[rangoCalculado];
    return {
      min: rule?.min ?? 0,
      vit_base: rule?.vit_base ?? 600,
      ch_base: rule?.ch_base ?? 0,
      vel_base: rule?.vel_base ?? 5,
      stat_max: rule?.stat_max ?? 10,
      puntos_totales: rule?.puntos_totales ?? puntosEfectivos
    };
  }, [masters.rangoRules, rangoCalculado, puntosEfectivos]);

  // Valor máximo para el Radar Chart (máximo stat del Rango S o máximo stat invertido)
  const radarMaxVal = useMemo(() => {
    const sRule = masters.rangoRules?.['S'];
    const maxSystem = sRule?.stat_max || 200;
    const currentMaxStat = Math.max(...Object.values(stats), 10);
    return Math.max(rangoBaseRules.stat_max || 10, currentMaxStat, 10);
  }, [masters.rangoRules, rangoBaseRules, stats]);

  // Atributos derivados calculados dinámicamente
  const derivados = useMemo(() => {
    if (!masters.escaladoRules) {
      return { VIT: 600, CH: 0, VEL: 5, RES: 0, VR: 1, DET: 1 };
    }
    return StatsLogic.calculateDerivedStats(stats, rangoBaseRules, masters.escaladoRules);
  }, [stats, rangoBaseRules, masters.escaladoRules]);

  // Manejar cambio de stats con validaciones
  const handleUpdateStat = (statName: keyof CharacterStats, val: number) => {
    const currentVal = stats[statName] || 0;

    if (masters.rangoRules) {
      const validation = StatsLogic.validateStatChange(
        statName,
        val,
        stats,
        rangoCalculado,
        puntosEfectivos,
        masters.rangoRules
      );

      if (!validation.valid && validation.message) {
        addToast(validation.message, 'error');
        return;
      }
    } else {
      const statMax = rangoBaseRules.stat_max || 10;
      if (val < 1) {
        addToast('El valor mínimo para cualquier estadística es 1', 'error');
        return;
      }
      if (val > statMax) {
        addToast(`El límite máximo de estadística para ${rangoCalculado} es ${statMax}`, 'error');
        return;
      }
      if (modoPuntos === 'limite') {
        const diff = val - currentVal;
        if (diff > 0 && puntosLibres < diff) {
          addToast('No tienes suficientes puntos disponibles en tu total asignado', 'error');
          return;
        }
      }
    }

    setStats(prev => ({
      ...prev,
      [statName]: val
    }));
  };

  // Manejar onBlur del input de Puntos Totales
  const handlePuntosTotalesBlur = () => {
    const parsed = parseInt(puntosTotalesInput) || 8;
    const finalVal = Math.max(8, parsed);
    setPuntosTotales(finalVal);
    setPuntosTotalesInput(String(finalVal));

    if (parsed < 8) {
      addToast('El mínimo de puntos totales es 8 (1 por estadística)', 'info');
    }
  };

  // Cargar las estadísticas base del personaje activo
  const handleLoadCharacterStats = () => {
    if (!activeCharacter) {
      addToast('No se encontró un personaje activo en tu sesión', 'error');
      return;
    }
    if (activeCharacter.stats_base) {
      setStats({ ...activeCharacter.stats_base });
    }
    if (activeCharacter.puntos_stats) {
      const pts = Number(activeCharacter.puntos_stats) || 8;
      setPuntosTotales(pts);
      setPuntosTotalesInput(String(pts));
    }
    addToast(`Stats de ${activeCharacter.nombre_ninja} cargadas en el calculadora`, 'success');
  };

  // Resetear el calculadora a valores predeterminados
  const handleResetSimulator = () => {
    setStats({ ...DEFAULT_STATS });
    setPuntosTotales(8);
    setPuntosTotalesInput('8');
    setModoPuntos('limite');
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
    addToast('calculadora reiniciado a los valores base', 'info');
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      {/* Header con Breadcrumbs */}
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Biblioteca', href: '/documentos' },
            { label: 'Calculadora de Stats' }
          ]}
        />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <img src="/assets/icons/shuriken.png" className="w-6 sm:w-7 xl:w-8 h-auto object-contain" alt="icon" />
          </div>
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Calculadora <span className="text-naranja-naruto">de Stats</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        {/* Banner informativo del calculadora */}
        <div className="mb-10 ninja-card-oro p-6 sm:p-10 xl:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-6 mb-6">
                <h1 className="ninja-title text-3xl sm:text-5xl xl:text-7xl uppercase leading-none">CALCULADORA DE STATS</h1>
              </div>
              <p className="text-gris-texto text-base sm:text-lg xl:text-2xl leading-relaxed">
                Prueba distintas combinaciones de estadísticas para tu personaje antes de tomar la decisión final sobre cómo repartir tus STATs.
              </p>
            </div>

            {/* Acciones del calculadora */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {activeCharacter && (
                <button
                  type="button"
                  onClick={handleLoadCharacterStats}
                  className="ninja-btn-oro py-3 px-5 text-xs xl:text-sm font-black uppercase tracking-wider flex items-center gap-2"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <UserCheck className="w-4 h-4" />
                  Cargar mi PJ ({activeCharacter.nombre_ninja})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sección Principal del calculadora */}
        <SectionCard
          title="CONFIGURAR ESTADÍSTICAS Y ATRIBUTOS"
          icon={Heart}
          color="oro"
        >
          {/* Radar Chart idéntico al de la Ficha y Dashboard */}
          <div className="flex flex-col items-center w-full mb-8 border-b border-oro/5 pb-8 -mt-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-oro/60">Rango Estimado:</span>
              <span className="text-xl font-black text-naranja-naruto uppercase tracking-widest bg-naranja-naruto/10 border border-naranja-naruto/30 px-4 py-1">
                Rango {rangoCalculado}
              </span>
            </div>
            <div className="flex justify-center items-center w-full max-w-[900px] bg-[#171717] border border-oro/10 py-6 px-8 ninja-clip-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
              <div className="w-full max-w-[400px] mx-auto">
                <CharacterRadarChart
                  stats={stats}
                  maxVal={10}
                />
              </div>
            </div>
          </div>

          {/* Bloque de Modo de Puntos y Contador asignado a ancho completo */}
          <div className="bg-black/40 border border-oro/20 p-4 space-y-4 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Selector de Modo de Puntos */}
                <div className="flex items-center bg-black/60 border border-oro/20 p-1">
                  <button
                    type="button"
                    onClick={() => setModoPuntos('limite')}
                    className={`py-1.5 px-3 text-xs font-black uppercase tracking-wider transition-all ${modoPuntos === 'limite'
                      ? 'bg-white text-naranja-naruto shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                      : 'text-oro/60 hover:text-oro'
                      }`}
                  >
                    Fijar Máximo
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoPuntos('libres')}
                    className={`py-1.5 px-3 text-xs font-black uppercase tracking-wider transition-all ${modoPuntos === 'libres'
                      ? 'bg-naranja-naruto text-negro-fondo shadow-[0_0_10px_rgba(250,148,39,0.3)]'
                      : 'text-oro/60 hover:text-oro'
                      }`}
                  >
                    Suma Libre
                  </button>
                </div>

                {/* Botón Reiniciar a la misma altura */}
                <button
                  type="button"
                  onClick={handleResetSimulator}
                  className="bg-black/60 hover:bg-oro/10 border border-oro/30 hover:border-oro text-oro/80 hover:text-oro py-2 px-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
                  title="Reiniciar calculadora"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reiniciar
                </button>
              </div>

              {modoPuntos === 'limite' ? (
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-caption font-black text-oro/40 uppercase tracking-[0.3em] mb-1">Total Puntos</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={puntosTotalesInput}
                        onChange={(e) => setPuntosTotalesInput(e.target.value)}
                        onBlur={handlePuntosTotalesBlur}
                        className="bg-black/70 border border-oro/30 rounded-none px-3 py-1 text-xl font-black text-oro w-16 text-center outline-none focus:border-oro"
                      />
                      <span className="text-caption text-oro/40 uppercase font-black tracking-widest">PA</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end border-l border-oro/10 pl-4 sm:pl-6">
                    <span className="text-caption font-black text-oro/40 uppercase tracking-[0.3em] mb-1">Puntos Disponibles</span>
                    <span className="text-2xl xl:text-3xl font-black text-oro italic">
                      {puntosLibres}
                      <span className="text-oro/20 text-xs xl:text-sm ml-1.5 font-normal">/ {puntosTotales}</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-end border-l border-oro/10 pl-4 sm:pl-6">
                  <span className="text-caption font-black text-naranja-naruto uppercase tracking-[0.3em] mb-1">Puntos Invertidos</span>
                  <span className="text-2xl xl:text-3xl font-black text-naranja-naruto italic">
                    {puntosGastados} <span className="text-xs font-bold text-naranja-naruto/50 uppercase not-italic">PA Totales</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">
            {/* Controles de Estadísticas Base */}
            <div className="lg:col-span-6 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-oro/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-naranja-naruto rotate-45" />
                  <h3 className="text-sm sm:text-base font-black text-oro uppercase tracking-[0.4em]">Estadísticas Base</h3>
                </div>
                <span className="text-caption sm:text-xs font-black text-oro uppercase tracking-widest bg-oro/10 border border-oro/20 px-3 py-1 ninja-clip-xs">
                  LÍMITE RANGO {rangoCalculado}: {rangoBaseRules.stat_max || 10}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['NIN', 'GEN', 'TAI', 'SM', 'FUE', 'AGI', 'EST', 'INT'] as (keyof CharacterStats)[]).map((s) => {
                  const val = stats[s] || 0;
                  return (
                    <div
                      key={s}
                      className="bg-black/60 border border-oro/20 py-3.5 px-5 flex justify-between items-center relative group hover:border-oro/50 transition-all overflow-hidden"
                      style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 0px)' }}
                    >
                      <div className="absolute top-0 right-0 w-12 h-12 bg-oro/5 rotate-45 -mr-6 -mt-6 pointer-events-none" />
                      <div className="flex flex-col items-start relative z-10">
                        <span className="text-base font-black text-oro uppercase tracking-[0.2em]">{s}</span>
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => handleUpdateStat(s, parseInt(e.target.value) || 0)}
                          className="bg-transparent text-2xl xl:text-3xl font-black text-oro w-14 text-right outline-none selection:bg-oro/20 leading-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="flex flex-col gap-0 justify-center items-center select-none">
                          <button
                            type="button"
                            onClick={() => handleUpdateStat(s, val + 1)}
                            className="text-oro/60 hover:text-oro active:scale-75 transition-all p-0.5"
                            title="Incrementar"
                          >
                            <ChevronUp className="w-4 h-4 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStat(s, val - 1)}
                            className="text-oro/60 hover:text-oro active:scale-75 transition-all p-0.5"
                            title="Decrementar"
                          >
                            <ChevronDown className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Panel de Atributos Derivados */}
            <div className="lg:col-span-6 space-y-8 lg:border-l lg:border-oro/10 lg:pl-8 xl:pl-12">
              <div className="flex items-center gap-3 border-b border-oro/10 pb-3">
                <div className="w-1.5 h-1.5 bg-naranja-naruto rotate-45" />
                <h3 className="text-sm sm:text-base font-black text-oro uppercase tracking-[0.4em]">Atributos Calculados</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'VIT', val: derivados.VIT, desc: `Vitalidad máxima (FUE × ${masters.escaladoRules?.fue_a_vit ?? 10})`, color: 'text-red-500' },
                  { label: 'CH', val: derivados.CH, desc: `Chakra máximo (EST × ${masters.escaladoRules?.est_a_ch ?? 15})`, color: 'text-blue-400' },
                  { label: 'VEL', val: derivados.VEL, desc: 'Velocidad de combate (AGI / 10)', color: 'text-oro' },
                  { label: 'VR', val: derivados.VR, desc: '', color: 'text-oro/90' },
                  { label: 'DET', val: derivados.DET, desc: '', color: 'text-oro/90' },
                ].map(attr => (
                  <div
                    key={attr.label}
                    className="bg-black/60 border border-oro/20 p-5 flex flex-col justify-between group hover:border-oro/50 transition-all"
                    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-base sm:text-lg font-black text-oro uppercase tracking-[0.2em]">{attr.label}</span>
                      <span className={`text-3xl sm:text-4xl font-black ${attr.color} italic leading-none`}>
                        {String(attr.val || 0)}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm text-oro/75 font-medium leading-tight">{attr.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </main>
    </div>
  );
}
