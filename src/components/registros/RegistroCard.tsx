'use client';

import { Registro } from '@/domain/types';
import { Zap, ScrollText, Swords, User, Image as ImageIcon, Link as LinkIcon, Trash2, Edit3, Loader2, ShieldAlert, Trophy } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { useState } from 'react';

interface RegistroCardProps {
  registro: Registro;
  onRefresh?: () => void;
  onEdit?: (reg: Registro) => void;
  isAdmin?: boolean;
}

export default function RegistroCard({ registro, onRefresh, onEdit, isAdmin }: RegistroCardProps) {
  const { activeCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const [loading, setLoading] = useState(false);

  const isOwner = activeCharacter?.id === registro.autor_id;
  const canManage = isOwner || isAdmin;

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    
    setLoading(true);
    try {
      await RegistrosService.deleteRegistro(registro.id);
      addToast('Registro eliminado', 'success');
      onRefresh?.();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  const getIcon = () => {
    switch (registro.tipo) {
      case 'mision': return ScrollText;
      case 'combate': return Swords;
      default: return Zap;
    }
  };

  const getColorClass = () => {
    switch (registro.tipo) {
      case 'mision': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'combate': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const Icon = getIcon();
  const colorClass = getColorClass();

  const participantNames = registro.participantes?.map(p => p.personaje?.nombre_ninja).filter(Boolean) || [];
  const participants = participantNames.length > 1
    ? `${participantNames.slice(0, -1).join(', ')} y ${participantNames[participantNames.length - 1]}`
    : participantNames[0] || registro.autor?.nombre_ninja;

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-xl border ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            {new Date(registro.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
          {canManage && (
            <div className="flex items-center gap-1 ml-4 pl-4 border-l border-zinc-800/50">
              <button 
                onClick={() => onEdit?.(registro)}
                className="p-2 text-zinc-600 hover:text-orange-500 transition-all rounded-lg hover:bg-orange-500/10"
                title="Editar Registro"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="p-2 text-zinc-600 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10"
                title="Eliminar Registro"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="text-sm text-zinc-300 leading-relaxed mb-4">
        {registro.tipo === 'mision' ? (
          <>
            Misión <span className="text-white font-bold">{registro.data.codigo_mision}</span> de rango <span className="text-white font-bold">{registro.subtipo}</span> ha sido completada por <span className="text-white font-bold">{participants}</span>. 
            Obtienen <span className="text-blue-400 font-bold">{(registro.data.recompensa_xp ?? 0)} EXP</span> y <span className="text-emerald-400 font-bold">{(registro.data.recompensa_ryous ?? 0)} Ryous</span>.
          </>
        ) : (
          <div className="space-y-3">
            {registro.data.equipo_a && registro.data.equipo_b ? (
              <div className="space-y-6">
                {/* Cabecera del Enfrentamiento */}
                <div className="relative flex items-stretch gap-4 min-h-[100px]">
                  {/* Bando A */}
                  <div className="flex-1 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 relative overflow-hidden group">
                    <div className="absolute -top-2 -left-2 w-12 h-12 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
                    <span className="relative z-10 text-[8px] font-black uppercase text-blue-500 tracking-[0.2em] mb-3 block">Bando A</span>
                    <div className="relative z-10 space-y-3">
                      {registro.data.equipo_a.map((p: any) => {
                        const getXP = () => {
                          if (p.huye) return 0;
                          const config = registro.data.config_xp;
                          if (!config) return 0;
                          if (registro.data.ganador === 'Empate') return config.retirarse || 0;
                          if (registro.data.ganador === 'A') return config.ganar || 0;
                          return config.perder || 0;
                        };
                        const xp = getXP();

                        return (
                          <div key={p.id} className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-xs tracking-tight">{p.nombre_ninja}</span>
                              <div className="flex items-center gap-1">
                                {p.estado_nombre && (
                                  <span className="text-[7px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-black uppercase border border-zinc-800">
                                    {p.estado_nombre}
                                  </span>
                                )}
                                {p.huye && (
                                  <span className="text-[7px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-black uppercase border border-orange-500/20">
                                    Huyó
                                  </span>
                                )}
                              </div>
                            </div>
                            {p.has_estado_alterado && p.descripcion_estado && (
                              <p className="text-[9px] text-zinc-500 italic leading-tight border-l border-zinc-800 pl-2 py-0.5">
                                {p.descripcion_estado}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* VS Separator */}
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-px h-full bg-gradient-to-b from-transparent via-zinc-800 to-transparent" />
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl relative z-10">
                      <span className="text-[9px] font-black text-zinc-500 italic">VS</span>
                    </div>
                    <div className="w-px h-full bg-gradient-to-b from-transparent via-zinc-800 to-transparent" />
                  </div>

                  {/* Bando B */}
                  <div className="flex-1 bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-right relative overflow-hidden group">
                    <div className="absolute -top-2 -right-2 w-12 h-12 bg-red-500/10 rounded-full blur-xl group-hover:bg-red-500/20 transition-all" />
                    <span className="relative z-10 text-[8px] font-black uppercase text-red-500 tracking-[0.2em] mb-3 block">Bando B</span>
                    <div className="relative z-10 space-y-3">
                      {registro.data.equipo_b.map((p: any) => {
                        const getXP = () => {
                          if (p.huye) return 0;
                          const config = registro.data.config_xp;
                          if (!config) return 0;
                          if (registro.data.ganador === 'Empate') return config.retirarse || 0;
                          if (registro.data.ganador === 'B') return config.ganar || 0;
                          return config.perder || 0;
                        };
                        const xp = getXP();

                        return (
                          <div key={p.id} className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {p.huye && (
                                  <span className="text-[7px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-black uppercase border border-orange-500/20">
                                    Huyó
                                  </span>
                                )}
                                {p.estado_nombre && (
                                  <span className="text-[7px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-black uppercase border border-zinc-800">
                                    {p.estado_nombre}
                                  </span>
                                )}
                              </div>
                              <span className="text-white font-bold text-xs tracking-tight">{p.nombre_ninja}</span>
                            </div>
                            {p.has_estado_alterado && p.descripcion_estado && (
                              <p className="text-[9px] text-zinc-500 italic leading-tight border-r border-zinc-800 pr-2 py-0.5 text-right">
                                {p.descripcion_estado}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Resultado Final */}
                <div className="pt-2">
                  {registro.data.ganador === 'Empate' ? (
                    <div className="flex items-center justify-center gap-3 px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                      <ShieldAlert className="w-4 h-4 text-zinc-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Combate Retirado / Empate</span>
                    </div>
                  ) : (
                    <div className={`flex items-center justify-between px-5 py-3 rounded-2xl border ${
                      registro.data.ganador === 'A' 
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Trophy className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Victoria: Bando {registro.data.ganador}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase italic opacity-60">Fin del Combate</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
            <div className="flex flex-col gap-1">
              <span className="text-white font-bold">{registro.data.titulo || 'Registro Shinobi'}</span>
              {registro.data.subtitulo && (
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{registro.data.subtitulo}</span>
              )}
            </div>
          )}
            
            {registro.tipo === 'combate' && registro.data.equipo_a && registro.data.equipo_b ? (
              <div className="pt-4 border-t border-zinc-800/50 space-y-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] text-zinc-500 font-bold">
                      Registrado por <span className="text-zinc-300">{registro.autor?.nombre_ninja}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[...registro.data.equipo_a, ...registro.data.equipo_b].map((p: any) => {
                      const isTeamA = registro.data.equipo_a.some((a: any) => a.id === p.id);
                      const getXP = () => {
                        if (p.huye) return 0;
                        const config = registro.data.config_xp;
                        if (!config) return 0;
                        if (registro.data.ganador === 'Empate') return config.retirarse || 0;
                        if (registro.data.ganador === (isTeamA ? 'A' : 'B')) return config.ganar || 0;
                        return config.perder || 0;
                      };
                      const xp = getXP();
                      return (
                        <div key={p.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm transition-all ${
                          xp > 0 
                          ? 'bg-blue-500/10 border-blue-500/30' 
                          : 'bg-zinc-800/50 border-zinc-700/50'
                        }`}>
                          <span className={`text-[9px] font-black uppercase tracking-tight ${xp > 0 ? 'text-zinc-200' : 'text-zinc-400'}`}>
                            {p.nombre_ninja}
                          </span>
                          <span className={`text-[10px] font-black ${xp > 0 ? 'text-blue-400' : 'text-zinc-500'}`}>
                            {xp > 0 ? `+${xp} EXP` : '+0 EXP'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-500 font-bold">
                Registrado por <span className="text-zinc-300">{registro.autor?.nombre_ninja}</span>.
                {(registro.data.recompensa_xp ?? 0) > 0 && (
                  <> Obtiene <span className="text-blue-400">+{(registro.data.recompensa_xp ?? 0)} EXP</span>.</>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {registro.data.urls_imagenes && registro.data.urls_imagenes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800/50">
          {registro.data.urls_imagenes.map((url, i) => (
            <a 
              key={i} 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
            >
              <LinkIcon className="w-3 h-3" /> Prueba {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
