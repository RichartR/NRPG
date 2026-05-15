'use client';

import { useState, useEffect } from 'react';
import { RegistrosService } from '@/services/supabase/registros.service';
import { MasterService } from '@/services/supabase/master.service';
import { Registro } from '@/domain/types';
import { useCharacterStore } from '@/store/useCharacterStore';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SelectField } from '@/components/ui/Fields';
import { Plus, X, Link as LinkIcon, Search, UserPlus, User, Swords, Info, Trophy, Users } from 'lucide-react';

export default function CombatForm({ 
  onCreated, 
  initialData = null 
}: { 
  onCreated: () => void, 
  initialData?: Registro | null
}) {
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    if (!activeCharacter) {
      fetchActiveCharacter();
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>(initialData?.data?.urls_imagenes || ['']);
  const [winner, setWinner] = useState<'A' | 'B' | 'Empate'>(initialData?.data?.ganador || 'Empate');
  const [combatConfig, setCombatConfig] = useState<Record<string, number> | null>(null);
  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([]);
  
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchTargetTeam, setSearchTargetTeam] = useState<'A' | 'B'>('A');
  const [searchResults, setSearchResults] = useState<{ id: number; nombre_ninja: string }[]>([]);
  
  // Equipos
  const [teamA, setTeamA] = useState<{ id: number; nombre_ninja: string; estado_nombre?: string; has_estado_alterado?: boolean; descripcion_estado?: string; huye?: boolean }[]>([]);
  const [teamB, setTeamB] = useState<{ id: number; nombre_ninja: string; estado_nombre?: string; has_estado_alterado?: boolean; descripcion_estado?: string; huye?: boolean }[]>([]);

  useEffect(() => {
    if (initialData) {
      const bA = initialData.data?.equipo_a || [];
      const bB = initialData.data?.equipo_b || [];
      setTeamA(bA);
      setTeamB(bB);
    } else if (activeCharacter) {
      setTeamA([{ id: Number(activeCharacter.id), nombre_ninja: activeCharacter.nombre_ninja }]);
    }
  }, [activeCharacter, initialData]);

  useEffect(() => {
    fetchCombatConfig();
    fetchEstados();
  }, []);

  const fetchCombatConfig = async () => {
    try {
      const config = await MasterService.getSystemConfig('experiencia_combates');
      if (config) setCombatConfig(config);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEstados = async () => {
    try {
      const data = await MasterService.getEstadosCombate();
      setEstados(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchParticipants = async (query: string, team: 'A' | 'B') => {
    setParticipantSearch(query);
    setSearchTargetTeam(team);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await RegistrosService.searchCharacters(query);
      const allParticipants = [...teamA, ...teamB];
      setSearchResults(results.filter(r => 
        !allParticipants.find(p => Number(p.id) === Number(r.id))
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const addParticipant = (p: { id: number; nombre_ninja: string }) => {
    if (searchTargetTeam === 'A') setTeamA([...teamA, { ...p, estado_nombre: '' }]);
    else setTeamB([...teamB, { ...p, estado_nombre: '' }]);
    
    setParticipantSearch('');
    setSearchResults([]);
  };

  const updateParticipantState = (id: number, team: 'A' | 'B', updates: Partial<{ estado_nombre: string, has_estado_alterado: boolean, descripcion_estado: string, huye: boolean }>) => {
    if (team === 'A') {
      setTeamA(teamA.map(p => p.id === id ? { ...p, ...updates } : p));
    } else {
      setTeamB(teamB.map(p => p.id === id ? { ...p, ...updates } : p));
    }
  };

  const removeParticipant = (id: number, team: 'A' | 'B') => {
    if (team === 'A') setTeamA(teamA.filter(p => p.id !== id));
    else setTeamB(teamB.filter(p => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!activeCharacter) {
      addToast('No se ha detectado un personaje activo.', 'error');
      return;
    }

    if (teamA.length === 0 || teamB.length === 0) {
      addToast('Debe haber al menos un participante por bando', 'error');
      return;
    }

    // Calcular resultado para el autor
    const authorInA = teamA.find(p => Number(p.id) === Number(activeCharacter.id));
    const authorInB = teamB.find(p => Number(p.id) === Number(activeCharacter.id));
    const authorParticipant = authorInA || authorInB;
    
    let finalResult = 'retirarse';
    if (winner === 'A') {
      finalResult = authorInA ? 'ganar' : 'perder';
    } else if (winner === 'B') {
      finalResult = authorInB ? 'ganar' : 'perder';
    } else {
      finalResult = 'retirarse';
    }

    // Si el autor huye, no recibe XP
    const finalXP = authorParticipant?.huye ? 0 : (combatConfig ? (combatConfig[finalResult] || 0) : 0);

    const payload: any = {
      tipo: 'combate',
      autor_id: activeCharacter.id,
      participantes_ids: [...teamA.map(p => p.id), ...teamB.map(p => p.id)],
      data: {
        ganador: winner,
        equipo_a: teamA,
        equipo_b: teamB,
        resultado: finalResult,
        recompensa_xp: finalXP,
        config_xp: {
          ganar: combatConfig?.ganar || 0,
          perder: combatConfig?.perder || 0,
          retirarse: combatConfig?.retirarse || 0
        }
      }
    };

    setLoading(true);
    try {
      if (initialData) {
        await RegistrosService.updateRegistro(initialData.id, payload);
        addToast('Registro actualizado correctamente', 'success');
      } else {
        await RegistrosService.createRegistro(payload);
        addToast('Registro publicado correctamente', 'success');
      }
      onCreated();
    } catch (err: any) {
      addToast(err.message || 'Error al procesar el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 space-y-8 backdrop-blur-xl">
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-2xl border bg-red-500/10 border-red-500/20 text-red-500">
          <Swords className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">Registro de Combate</h3>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Define los bandos y el resultado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bando A */}
        <div className="space-y-4 p-6 bg-zinc-950/50 border border-zinc-800 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <h4 className="text-sm font-black uppercase italic tracking-widest text-blue-500">Bando A</h4>
            <span className="text-[10px] font-bold text-zinc-600 uppercase">{teamA.length} Combatientes</span>
          </div>
          
          <div className="relative z-10">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
              <input 
                type="text"
                placeholder="Añadir al Bando A..."
                value={searchTargetTeam === 'A' ? participantSearch : ''}
                onChange={(e) => handleSearchParticipants(e.target.value, 'A')}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
              />
              {searchResults.length > 0 && searchTargetTeam === 'A' && (
                <div className="absolute z-20 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                  {searchResults.map(p => (
                    <button key={p.id} onClick={() => addParticipant(p)} className="w-full px-4 py-3 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-all">
                      <UserPlus className="w-3 h-3" /> {p.nombre_ninja}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {teamA.map(p => (
                <div key={p.id} className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl group/item space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-blue-500" />
                      </div>
                      <span className="text-xs font-bold text-zinc-300">
                        {p.nombre_ninja} {Number(p.id) === Number(activeCharacter?.id) && <span className="text-[9px] text-zinc-500 ml-1">(Tú)</span>}
                      </span>
                    </div>
                    <button onClick={() => removeParticipant(p.id, 'A')} className="opacity-0 group-hover/item:opacity-100 p-1 text-zinc-600 hover:text-red-500 transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <select 
                        value={p.estado_nombre || ''}
                        onChange={(e) => updateParticipantState(p.id, 'A', { estado_nombre: e.target.value })}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-400 outline-none focus:border-blue-500/30 transition-all"
                      >
                        <option value="">Sin estado</option>
                        {estados.map(est => (
                          <option key={est.id} value={est.nombre}>{est.nombre}</option>
                        ))}
                      </select>
                      
                      <div className="flex items-center gap-1">
                        <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer group/toggle bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                          <input 
                            type="checkbox"
                            checked={!!p.has_estado_alterado}
                            onChange={(e) => updateParticipantState(p.id, 'A', { has_estado_alterado: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-3 h-3 rounded-sm border border-zinc-800 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                            <Plus className={`w-2 h-2 text-white transition-transform ${p.has_estado_alterado ? 'rotate-45' : ''}`} />
                          </div>
                          <span className="text-[8px] font-black uppercase text-zinc-600 group-hover/toggle:text-zinc-400 transition-colors">Estado Alterado</span>
                        </label>

                        <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer group/toggle bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                          <input 
                            type="checkbox"
                            checked={!!p.huye}
                            onChange={(e) => updateParticipantState(p.id, 'A', { huye: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-3 h-3 rounded-sm border border-zinc-800 peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center">
                            <X className="w-2 h-2 text-white" />
                          </div>
                          <span className="text-[8px] font-black uppercase text-zinc-600 group-hover/toggle:text-zinc-400 transition-colors">Huye</span>
                        </label>
                      </div>
                    </div>

                    {p.has_estado_alterado && (
                      <textarea
                        value={p.descripcion_estado || ''}
                        onChange={(e) => updateParticipantState(p.id, 'A', { descripcion_estado: e.target.value })}
                        placeholder="Describe el estado alterado..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] font-bold text-zinc-400 outline-none focus:border-blue-500/30 transition-all min-h-[60px] resize-none animate-in slide-in-from-top-2 duration-300"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bando B */}
        <div className="space-y-4 p-6 bg-zinc-950/50 border border-zinc-800 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between relative z-10">
            <h4 className="text-sm font-black uppercase italic tracking-widest text-red-500">Bando B</h4>
            <span className="text-[10px] font-bold text-zinc-600 uppercase">{teamB.length} Combatientes</span>
          </div>

          <div className="relative z-10">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
              <input 
                type="text"
                placeholder="Añadir al Bando B..."
                value={searchTargetTeam === 'B' ? participantSearch : ''}
                onChange={(e) => handleSearchParticipants(e.target.value, 'B')}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white font-bold outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-700"
              />
              {searchResults.length > 0 && searchTargetTeam === 'B' && (
                <div className="absolute z-20 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                  {searchResults.map(p => (
                    <button key={p.id} onClick={() => addParticipant(p)} className="w-full px-4 py-3 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-all">
                      <UserPlus className="w-3 h-3" /> {p.nombre_ninja}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {teamB.map(p => (
                <div key={p.id} className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl group/item space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-red-500" />
                      </div>
                      <span className="text-xs font-bold text-zinc-300">
                        {p.nombre_ninja} {Number(p.id) === Number(activeCharacter?.id) && <span className="text-[9px] text-zinc-500 ml-1">(Tú)</span>}
                      </span>
                    </div>
                    <button onClick={() => removeParticipant(p.id, 'B')} className="opacity-0 group-hover/item:opacity-100 p-1 text-zinc-600 hover:text-red-500 transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <select 
                        value={p.estado_nombre || ''}
                        onChange={(e) => updateParticipantState(p.id, 'B', { estado_nombre: e.target.value })}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-400 outline-none focus:border-red-500/30 transition-all"
                      >
                        <option value="">Sin estado</option>
                        {estados.map(est => (
                          <option key={est.id} value={est.nombre}>{est.nombre}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer group/toggle bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                          <input 
                            type="checkbox"
                            checked={!!p.has_estado_alterado}
                            onChange={(e) => updateParticipantState(p.id, 'B', { has_estado_alterado: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-3 h-3 rounded-sm border border-zinc-800 peer-checked:bg-red-500 peer-checked:border-red-500 transition-all flex items-center justify-center">
                            <Plus className={`w-2 h-2 text-white transition-transform ${p.has_estado_alterado ? 'rotate-45' : ''}`} />
                          </div>
                          <span className="text-[8px] font-black uppercase text-zinc-600 group-hover/toggle:text-zinc-400 transition-colors">Estado Alterado</span>
                        </label>

                        <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer group/toggle bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
                          <input 
                            type="checkbox"
                            checked={!!p.huye}
                            onChange={(e) => updateParticipantState(p.id, 'B', { huye: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-3 h-3 rounded-sm border border-zinc-800 peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center">
                            <X className="w-2 h-2 text-white" />
                          </div>
                          <span className="text-[8px] font-black uppercase text-zinc-600 group-hover/toggle:text-zinc-400 transition-colors">Huye</span>
                        </label>
                      </div>
                    </div>

                    {p.has_estado_alterado && (
                      <textarea
                        value={p.descripcion_estado || ''}
                        onChange={(e) => updateParticipantState(p.id, 'B', { descripcion_estado: e.target.value })}
                        placeholder="Describe el estado alterado..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-[10px] font-bold text-zinc-400 outline-none focus:border-red-500/30 transition-all min-h-[60px] resize-none animate-in slide-in-from-top-2 duration-300"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-orange-500" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Resultado Final</h4>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'A', label: 'Ganador Bando A', color: 'border-blue-500/50 text-blue-500 bg-blue-500/5' },
            { id: 'Empate', label: 'Empate / Retirada', color: 'border-zinc-700 text-zinc-500 bg-zinc-900/50' },
            { id: 'B', label: 'Ganador Bando B', color: 'border-red-500/50 text-red-500 bg-red-500/5' }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setWinner(opt.id as any)}
              className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${
                winner === opt.id ? opt.color : 'border-zinc-800 text-zinc-600 hover:border-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {combatConfig && (() => {
          const calculateParticipantXP = (p: any, team: 'A' | 'B') => {
            if (p.huye) return 0;
            if (winner === 'Empate') return combatConfig.retirarse || 0;
            if (winner === team) return combatConfig.ganar || 0;
            return combatConfig.perder || 0;
          };

          return (
            <div className="flex flex-col gap-4 px-6 py-6 bg-orange-500/5 border border-orange-500/10 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 border-b border-orange-500/10 pb-4">
                <Info className="w-4 h-4 text-orange-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500">Desglose de Recompensas</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Desglose Bando A */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-blue-500 tracking-tighter">Bando A</span>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase italic">
                      {winner === 'A' ? 'Ganadores' : winner === 'Empate' ? 'Empate' : 'Perdedores'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {teamA.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-zinc-950/50 p-2 rounded-xl border border-zinc-800/50">
                        <span className="text-[10px] font-bold text-zinc-400">{p.nombre_ninja}</span>
                        <span className={`text-[10px] font-black ${calculateParticipantXP(p, 'A') > 0 ? 'text-green-500' : 'text-zinc-600'}`}>
                          +{calculateParticipantXP(p, 'A')} EXP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desglose Bando B */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-red-500 tracking-tighter">Bando B</span>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase italic">
                      {winner === 'B' ? 'Ganadores' : winner === 'Empate' ? 'Empate' : 'Perdedores'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {teamB.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-zinc-950/50 p-2 rounded-xl border border-zinc-800/50">
                        <span className="text-[10px] font-bold text-zinc-400">{p.nombre_ninja}</span>
                        <span className={`text-[10px] font-black ${calculateParticipantXP(p, 'B') > 0 ? 'text-green-500' : 'text-zinc-600'}`}>
                          +{calculateParticipantXP(p, 'B')} EXP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-orange-500/50 italic text-center pt-2">
                * Las recompensas se aplicarán individualmente al validar el registro.
              </p>
            </div>
          );
        })()}
      </div>

      <button 
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
      >
        {loading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Swords className="w-5 h-5" />}
        {loading ? 'Procesando...' : 'Publicar Crónica de Combate'}
      </button>
    </div>
  );
}

