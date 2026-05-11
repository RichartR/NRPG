'use client';

import { useCharacterStore } from '@/store/useCharacterStore';
import { useEffect } from 'react';
import { Shield, Zap, Activity, Sword, Brain, Flame, Wind, Droplets } from 'lucide-react';

export default function CharacterSheet() {
  const { activeCharacter, loading, error, fetchActiveCharacter } = useCharacterStore();

  useEffect(() => {
    fetchActiveCharacter();
  }, [fetchActiveCharacter]);

  if (loading) return <div className="animate-pulse flex space-x-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 backdrop-blur-md h-64 justify-center items-center">Cargando datos ninja...</div>;
  if (error) return <div className="text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">Error: {error}</div>;
  if (!activeCharacter) return <div className="text-zinc-400 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 backdrop-blur-md">No tienes un personaje activo.</div>;

  const { stats_base, atributos_derivados, nombre_ninja, rango, xp, ryos } = activeCharacter;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-zinc-950/80 border border-zinc-800/50 backdrop-blur-xl shadow-2xl p-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 tracking-tight">
              {nombre_ninja}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-3 py-1 text-sm font-bold bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                Rango {rango}
              </span>
              <span className="text-zinc-400 text-sm font-medium">{xp} XP</span>
              <span className="text-zinc-400 text-sm font-medium">{ryos} Ryos</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Atributos Derivados */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-400" />
              Estado Vital
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-red-400 flex items-center gap-1"><Activity className="w-4 h-4"/> VIT (Vitalidad)</span>
                  <span className="text-white">{atributos_derivados.VIT} / {atributos_derivados.VIT}</span>
                </div>
                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-blue-400 flex items-center gap-1"><Droplets className="w-4 h-4"/> CH (Chakra)</span>
                  <span className="text-white">{atributos_derivados.CH} / {atributos_derivados.CH}</span>
                </div>
                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col justify-center items-center">
                <Shield className="w-6 h-6 text-zinc-400 mb-2" />
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Resistencia</span>
                <span className="text-2xl font-bold text-white">{atributos_derivados.RES}%</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col justify-center items-center">
                <Zap className="w-6 h-6 text-yellow-400 mb-2" />
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Velocidad</span>
                <span className="text-2xl font-bold text-white">{atributos_derivados.VEL}</span>
              </div>
            </div>
          </div>

          {/* Stats Base */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sword className="w-5 h-5 text-zinc-400" />
              Atributos Base
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'NIN (Ninjutsu)', value: stats_base.NIN, icon: Flame, color: 'text-orange-400' },
                { label: 'TAI (Taijutsu)', value: stats_base.TAI, icon: Sword, color: 'text-zinc-400' },
                { label: 'GEN (Genjutsu)', value: stats_base.GEN, icon: Brain, color: 'text-purple-400' },
                { label: 'INT (Inteligencia)', value: stats_base.INT, icon: Brain, color: 'text-blue-400' },
                { label: 'FUE (Fuerza)', value: stats_base.FUE, icon: Activity, color: 'text-red-400' },
                { label: 'AGI (Agilidad)', value: stats_base.AGI, icon: Wind, color: 'text-green-400' },
                { label: 'EST (Estamina)', value: stats_base.EST, icon: Shield, color: 'text-yellow-400' },
                { label: 'SM (Sellos)', value: stats_base.SM, icon: Droplets, color: 'text-cyan-400' },
              ].map((stat) => (
                <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3 flex justify-between items-center group hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <stat.icon className={`w-4 h-4 ${stat.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    <span className="text-zinc-400 text-sm font-medium">{stat.label.split(' ')[0]}</span>
                  </div>
                  <span className="text-white font-bold">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
