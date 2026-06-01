'use client';

import { useState, useEffect } from 'react';
import { RegistrosService } from '@/services/supabase/registros.service';
import { MasterService } from '@/services/supabase/master.service';
import { Registro } from '@/domain/types';
import { useCharacterStore } from '@/store/useCharacterStore';
import { useToastStore } from '@/components/ui/Toast';
import { X, Search, UserPlus, User, Trophy, Info } from 'lucide-react';
import { NinjaSelect } from '@/components/ui/Fields';

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
  const [images, setImages] = useState(initialData?.data?.urls_imagenes || ['']);
  const [winner, setWinner] = useState<'A' | 'B' | 'Empate'>(initialData?.data?.ganador || 'Empate');
  const [combatConfig, setCombatConfig] = useState<any | null>(null);
  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([]);

  const [participantSearch, setParticipantSearch] = useState('');
  const [searchTargetTeam, setSearchTargetTeam] = useState<'A' | 'B'>('A');
  const [searchResults, setSearchResults] = useState<{ id: number; nombre_ninja: string; hobba_name?: string | null }[]>([]);

  // Equipos
  const [teamA, setTeamA] = useState<{ id: number; nombre_ninja: string; rango?: string; estado_nombre?: string; has_estado_alterado?: boolean; descripcion_estado?: string; huye?: boolean }[]>([]);
  const [teamB, setTeamB] = useState<{ id: number; nombre_ninja: string; rango?: string; estado_nombre?: string; has_estado_alterado?: boolean; descripcion_estado?: string; huye?: boolean }[]>([]);

  useEffect(() => {
    if (initialData) {
      const bA = initialData.data?.equipo_a || [];
      const bB = initialData.data?.equipo_b || [];
      setTeamA(bA);
      setTeamB(bB);
    } else if (activeCharacter) {
      setTeamA([{ id: Number(activeCharacter.id), nombre_ninja: activeCharacter.nombre_ninja, rango: activeCharacter.rango || 'D' }]);
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

  const addParticipant = (p: { id: number; nombre_ninja: string; rango?: string }) => {
    if (searchTargetTeam === 'A') setTeamA([...teamA, { ...p, rango: p.rango || 'D', estado_nombre: '' }]);
    else setTeamB([...teamB, { ...p, rango: p.rango || 'D', estado_nombre: '' }]);

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

  const calculateXP = (team: 'A' | 'B', huye?: boolean) => {
    if (!combatConfig) return 0;
    if (huye) return 0;
    if (winner === 'Empate') return 0;

    const RANK_SCALE: Record<string, number> = { 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };

    const maxRankA = teamA.reduce((max, p) => {
      const val = RANK_SCALE[(p.rango || 'D').toUpperCase()] || 1;
      return val > max ? val : max;
    }, 1);

    const maxRankB = teamB.reduce((max, p) => {
      const val = RANK_SCALE[(p.rango || 'D').toUpperCase()] || 1;
      return val > max ? val : max;
    }, 1);

    const isWinner = winner === team;
    const ownMaxRankVal = team === 'A' ? maxRankA : maxRankB;
    const opponentMaxRankVal = team === 'A' ? maxRankB : maxRankA;

    const diff = opponentMaxRankVal - ownMaxRankVal;

    const section = isWinner ? combatConfig.victoria : combatConfig.derrota;
    if (!section) {
      return isWinner ? (Number(combatConfig.ganar) || 0) : (Number(combatConfig.perder) || 0);
    }

    if (diff >= 2) return Number(section.mas_2) || 0;
    if (diff === 1) return Number(section.mas_1) || 0;
    if (diff === 0) return Number(section.igual) || 0;
    if (diff === -1) return Number(section.menos_1) || 0;
    return Number(section.menos_2) || 0;
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

    const authorInA = teamA.find(p => Number(p.id) === Number(activeCharacter.id));
    const authorInB = teamB.find(p => Number(p.id) === Number(activeCharacter.id));
    const authorTeam = authorInA ? 'A' : 'B';
    const authorParticipant = authorInA || authorInB;

    const finalXP = calculateXP(authorTeam, authorParticipant?.huye);
    let finalResult = 'retirarse';
    if (winner === 'A') finalResult = authorInA ? 'ganar' : 'perder';
    else if (winner === 'B') finalResult = authorInB ? 'ganar' : 'perder';

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
        config_xp: combatConfig,
        participantes_historicos: [
          { id: activeCharacter.id, nombre_ninja: activeCharacter.nombre_ninja },
          ...teamA.map(p => ({ id: p.id, nombre_ninja: p.nombre_ninja })),
          ...teamB.map(p => ({ id: p.id, nombre_ninja: p.nombre_ninja }))
        ]
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
    <div className="w-full animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="ninja-card-oro p-8 sm:p-12 xl:p-20 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
          <img src="/assets/icons/shuriken.png" className="w-64 h-64 rotate-12" alt="bg" />
        </div>

        <div className="relative z-10 space-y-12 sm:space-y-16">
          <div className="flex justify-between items-start border-b border-oro/10 pb-10">
            <div className="space-y-2">
              <h3 className="ninja-title text-2xl sm:text-4xl md:text-5xl xl:text-6xl text-oro">
                {initialData ? 'EDITAR CRÓNICA' : 'CRÓNICA DE GUERRA'}
              </h3>
              <p className="text-xs sm:text-sm font-black text-oro/40 uppercase tracking-[0.4em]">Sincronizando con el archivo histórico de combate</p>
            </div>
            <button
              onClick={() => onCreated()}
              className="group p-4 bg-black/40 border border-oro/10 hover:border-oro/40 transition-all ninja-clip-xs"
            >
              <X className="w-8 h-8 text-oro/40 group-hover:text-oro" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16">
            {/* Bando A */}
            <div className="space-y-8 p-8 bg-black/40 border border-oro/20 ninja-clip-md">
              <div className="flex items-center justify-between border-b border-oro/10 pb-4">
                <h4 className="text-lg font-black uppercase tracking-[0.3em] text-oro">BANDO A</h4>
                <span className="text-xs font-bold text-oro/40 uppercase">{teamA.length} NINJAS</span>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/20" />
                  <input
                    type="text"
                    placeholder="BUSCAR POR PERSONAJE O HOBBA..."
                    value={searchTargetTeam === 'A' ? participantSearch : ''}
                    onChange={(e) => handleSearchParticipants(e.target.value, 'A')}
                    className="w-full ninja-input pl-14 py-4 text-xs"
                  />
                  {searchResults.length > 0 && searchTargetTeam === 'A' && (
                    <div className="absolute z-50 w-full mt-2 bg-black border border-oro/20 shadow-2xl animate-in fade-in zoom-in duration-200">
                      {searchResults.map(p => (
                        <button key={p.id} onClick={() => addParticipant(p)} className="w-full px-6 py-5 text-left text-[10px] font-black text-oro/60 hover:bg-oro/10 hover:text-oro flex items-center gap-3 transition-all border-b border-oro/5 last:border-0 uppercase tracking-widest">
                          <UserPlus className="w-4 h-4" /> {p.nombre_ninja} {p.hobba_name ? `(${p.hobba_name})` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {teamA.map(p => (
                    <div key={p.id} className="p-5 bg-black/40 border border-oro/10 ninja-clip-xs group/item space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-oro/40" />
                          <span className="text-xs font-black text-oro uppercase tracking-widest">
                            {p.nombre_ninja} {Number(p.id) === Number(activeCharacter?.id) && <span className="text-oro/40 ml-1">(TÚ)</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 px-3 py-1 bg-oro/10 border border-oro/20 ninja-clip-xs">
                            <span className="text-[10px] font-black text-oro">+{calculateXP('A', p.huye)} EXP</span>
                          </div>
                          <button onClick={() => removeParticipant(p.id, 'A')} className="opacity-0 group-hover/item:opacity-100 p-2 text-oro/20 hover:text-rojo-sangre transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <NinjaSelect
                          value={p.estado_nombre || ''}
                          onChange={(val) => updateParticipantState(p.id, 'A', { estado_nombre: val })}
                          placeholder="SIN ESTADO"
                          options={estados.map(est => ({ label: est.nombre, value: est.nombre }))}
                        />

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => updateParticipantState(p.id, 'A', { has_estado_alterado: !p.has_estado_alterado })}
                            className={`px-4 py-2 border text-[10px] font-black uppercase tracking-widest transition-all ${p.has_estado_alterado ? 'bg-oro/20 border-oro/40 text-oro' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                          >
                            ESTADO ALTERADO
                          </button>
                          <button
                            onClick={() => updateParticipantState(p.id, 'A', { huye: !p.huye })}
                            className={`px-4 py-2 border text-[10px] font-black uppercase tracking-widest transition-all ${p.huye ? 'bg-rojo-sangre/20 border-rojo-sangre/40 text-rojo-sangre' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                          >
                            HUYE
                          </button>
                        </div>

                        {p.has_estado_alterado && (
                          <textarea
                            value={p.descripcion_estado || ''}
                            onChange={(e) => updateParticipantState(p.id, 'A', { descripcion_estado: e.target.value })}
                            placeholder="Describe el estado..."
                            className="w-full ninja-input p-4 text-xs min-h-[80px] resize-none animate-in slide-in-from-top-2"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bando B */}
            <div className="space-y-8 p-8 bg-black/40 border border-oro/20 ninja-clip-md">
              <div className="flex items-center justify-between border-b border-oro/10 pb-4">
                <h4 className="text-lg font-black uppercase tracking-[0.3em] text-oro">BANDO B</h4>
                <span className="text-xs font-bold text-oro/40 uppercase">{teamB.length} NINJAS</span>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/20" />
                  <input
                    type="text"
                    placeholder="BUSCAR POR PERSONAJE O HOBBA..."
                    value={searchTargetTeam === 'B' ? participantSearch : ''}
                    onChange={(e) => handleSearchParticipants(e.target.value, 'B')}
                    className="w-full ninja-input pl-14 py-4 text-xs"
                  />
                  {searchResults.length > 0 && searchTargetTeam === 'B' && (
                    <div className="absolute z-50 w-full mt-2 bg-black border border-oro/20 shadow-2xl animate-in fade-in zoom-in duration-200">
                      {searchResults.map(p => (
                        <button key={p.id} onClick={() => addParticipant(p)} className="w-full px-6 py-5 text-left text-[10px] font-black text-oro/60 hover:bg-oro/10 hover:text-oro flex items-center gap-3 transition-all border-b border-oro/5 last:border-0 uppercase tracking-widest">
                          <UserPlus className="w-4 h-4" /> {p.nombre_ninja} {p.hobba_name ? `(${p.hobba_name})` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {teamB.map(p => (
                    <div key={p.id} className="p-5 bg-black/40 border border-oro/10 ninja-clip-xs group/item space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-oro/40" />
                          <span className="text-xs font-black text-oro uppercase tracking-widest">
                            {p.nombre_ninja} {Number(p.id) === Number(activeCharacter?.id) && <span className="text-oro/40 ml-1">(TÚ)</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 px-3 py-1 bg-oro/10 border border-oro/20 ninja-clip-xs">
                            <span className="text-[10px] font-black text-oro">+{calculateXP('B', p.huye)} EXP</span>
                          </div>
                          <button onClick={() => removeParticipant(p.id, 'B')} className="opacity-0 group-hover/item:opacity-100 p-2 text-oro/20 hover:text-rojo-sangre transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <NinjaSelect
                          value={p.estado_nombre || ''}
                          onChange={(val) => updateParticipantState(p.id, 'B', { estado_nombre: val })}
                          placeholder="SIN ESTADO"
                          options={estados.map(est => ({ label: est.nombre, value: est.nombre }))}
                        />

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => updateParticipantState(p.id, 'B', { has_estado_alterado: !p.has_estado_alterado })}
                            className={`px-4 py-2 border text-[10px] font-black uppercase tracking-widest transition-all ${p.has_estado_alterado ? 'bg-oro/20 border-oro/40 text-oro' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                          >
                            ESTADO ALTERADO
                          </button>
                          <button
                            onClick={() => updateParticipantState(p.id, 'B', { huye: !p.huye })}
                            className={`px-4 py-2 border text-[10px] font-black uppercase tracking-widest transition-all ${p.huye ? 'bg-rojo-sangre/20 border-rojo-sangre/40 text-rojo-sangre' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                          >
                            HUYE
                          </button>
                        </div>

                        {p.has_estado_alterado && (
                          <textarea
                            value={p.descripcion_estado || ''}
                            onChange={(e) => updateParticipantState(p.id, 'B', { descripcion_estado: e.target.value })}
                            placeholder="Describe el estado..."
                            className="w-full ninja-input p-4 text-xs min-h-[80px] resize-none animate-in slide-in-from-top-2"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Resultado y Recompensas */}
          <div className="space-y-12 pt-12 border-t border-oro/10">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1 w-full space-y-6">
                <div className="flex items-center gap-4">
                  <Trophy className="w-5 h-5 text-oro/40" />
                  <h4 className="text-xs font-black uppercase tracking-[0.4em] text-oro/40">RESULTADO FINAL</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { id: 'A', label: 'VICTORIA A', color: 'bg-oro text-rojo-sangre border-oro' },
                    { id: 'Empate', label: 'EMPATE', color: 'bg-white/10 text-white/60 border-white/20' },
                    { id: 'B', label: 'VICTORIA B', color: 'bg-oro text-rojo-sangre border-oro' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setWinner(opt.id as any)}
                      className={`py-6 ninja-clip-sm border transition-all font-black text-xs uppercase tracking-[0.2em] ${winner === opt.id ? opt.color : 'bg-black/40 border-oro/10 text-oro/40 hover:border-oro/30'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {combatConfig && (
                <div className="w-full md:w-[450px] p-6 bg-black/40 border border-oro/10 ninja-clip-md text-xs font-black uppercase tracking-widest space-y-4">
                  <div className="flex items-center gap-4 border-b border-oro/10 pb-3 opacity-60">
                    <Info className="w-4 h-4 text-oro" />
                    <span>TABLA DE EXP</span>
                  </div>
                  {combatConfig.victoria ? (
                    <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-center text-[10px]">
                      <div className="text-left text-oro/40">Diferencia</div>
                      <div className="text-green-500">Victoria</div>
                      <div className="text-red-500">Derrota</div>

                      <div className="text-left text-oro/30">+2 Superior</div>
                      <div className="text-oro">+{combatConfig.victoria.mas_2}</div>
                      <div className="text-oro">+{combatConfig.derrota.mas_2}</div>

                      <div className="text-left text-oro/30">+1 Superior</div>
                      <div className="text-oro">+{combatConfig.victoria.mas_1}</div>
                      <div className="text-oro">+{combatConfig.derrota.mas_1}</div>

                      <div className="text-left text-oro/30">= Rango</div>
                      <div className="text-oro">+{combatConfig.victoria.igual}</div>
                      <div className="text-oro">+{combatConfig.derrota.igual}</div>

                      <div className="text-left text-oro/30">-1 Inferior</div>
                      <div className="text-oro">+{combatConfig.victoria.menos_1}</div>
                      <div className="text-oro">+{combatConfig.derrota.menos_1}</div>

                      <div className="text-left text-oro/30">-2 Inferior</div>
                      <div className="text-oro">+{combatConfig.victoria.menos_2}</div>
                      <div className="text-oro">+{combatConfig.derrota.menos_2}</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between"><span>Victoria</span><span className="text-oro">+{combatConfig.ganar} EXP</span></div>
                      <div className="flex justify-between"><span>Derrota</span><span className="text-oro">+{combatConfig.perder} EXP</span></div>
                    </div>
                  )}
                  <div className="text-[9px] text-oro/30 border-t border-oro/5 pt-2 text-center normal-case font-bold">
                    El empate siempre otorga 0 EXP.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-10">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-8 sm:py-10 ninja-btn-oro text-xl sm:text-2xl ${loading ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              {loading ? 'SELLANDO ARCHIVO DE GUERRA...' : initialData ? 'ACTUALIZAR CRÓNICA' : 'PUBLICAR CRÓNICA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
