'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useCharacterStore } from '@/store/useCharacterStore';
import { Dices, Droplets, Activity, Sword, Users } from 'lucide-react';

interface CombatState {
  vit: number;
  maxVit: number;
  ch: number;
  maxCh: number;
}

interface Participant {
  user_id: string;
  nombre: string;
  estado: CombatState;
}

export default function CombatRoom({ roomId }: { roomId: string }) {
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const [localState, setLocalState] = useState<CombatState | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [damageInput, setDamageInput] = useState(0);
  const [chakraInput, setChakraInput] = useState(0);
  const [dadoInput, setDadoInput] = useState(100);

  const supabase = createClient();

  useEffect(() => {
    fetchActiveCharacter();
  }, [fetchActiveCharacter]);

  // Inicializar estado local
  useEffect(() => {
    if (activeCharacter && !localState) {
      setLocalState({
        vit: activeCharacter.atributos_derivados.VIT,
        maxVit: activeCharacter.atributos_derivados.VIT,
        ch: activeCharacter.atributos_derivados.CH,
        maxCh: activeCharacter.atributos_derivados.CH,
      });
    }
  }, [activeCharacter, localState]);

  useEffect(() => {
    if (!activeCharacter || !localState) return;

    const channel = supabase.channel(`room_${roomId}`, {
      config: { presence: { key: activeCharacter.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeParticipants: Record<string, Participant> = {};
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences.length > 0) {
            activeParticipants[key] = presences[0] as Participant;
          }
        });
        
        setParticipants(activeParticipants);
      })
      .on('broadcast', { event: 'combat_log' }, ({ payload }) => {
        setLogs(prev => [...prev, payload.message].slice(-20)); // mantener ultimos 20
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const participant: Participant = {
            user_id: activeCharacter.id,
            nombre: activeCharacter.nombre_ninja,
            estado: localState
          };
          await channel.track(participant);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, activeCharacter, localState]);

  // Sincronizar estado cuando cambia el local
  useEffect(() => {
    if (activeCharacter && localState) {
      const channel = supabase.channel(`room_${roomId}`);
      channel.track({
        user_id: activeCharacter.id,
        nombre: activeCharacter.nombre_ninja,
        estado: localState
      });
    }
  }, [localState?.vit, localState?.ch]);

  const addLog = async (message: string) => {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${message}`;
    setLogs(prev => [...prev, formatted].slice(-20));
    
    supabase.channel(`room_${roomId}`).send({
      type: 'broadcast',
      event: 'combat_log',
      payload: { message: formatted },
    });
  };

  const applyDamage = () => {
    if (!localState || damageInput <= 0) return;
    const currentRes = activeCharacter?.atributos_derivados.RES || 0;
    const reduced = Math.floor(damageInput * (1 - currentRes / 100));
    const newVit = Math.max(0, localState.vit - reduced);
    setLocalState({ ...localState, vit: newVit });
    addLog(`${activeCharacter?.nombre_ninja} recibe ${damageInput} de daño (${reduced} tras resistencia). VIT restante: ${newVit}.`);
    setDamageInput(0);
  };

  const useChakra = () => {
    if (!localState || chakraInput <= 0) return;
    const newCh = Math.max(0, localState.ch - chakraInput);
    setLocalState({ ...localState, ch: newCh });
    addLog(`${activeCharacter?.nombre_ninja} gasta ${chakraInput} CH. CH restante: ${newCh}.`);
    setChakraInput(0);

    // Chequeo de Cansancio Automático
    const percentage = (newCh / localState.maxCh) * 100;
    if (percentage < 10) {
      addLog(`⚠️ ¡ALERTA! CH de ${activeCharacter?.nombre_ninja} < 10%. Requiere Tirada de Cansancio Avanzado.`);
    } else if (percentage < 20) {
      addLog(`⚠️ ¡ALERTA! CH de ${activeCharacter?.nombre_ninja} < 20%. Requiere Tirada de Cansancio.`);
    }
  };

  const rollDice = () => {
    const result = Math.floor(Math.random() * dadoInput) + 1;
    addLog(`🎲 ${activeCharacter?.nombre_ninja} tira un D${dadoInput} y saca: **${result}**`);
  };

  if (!activeCharacter) return <div className="p-8 text-white">Debes tener un personaje activo para combatir.</div>;

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8 flex flex-col">
      <header className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
            <Sword className="w-6 h-6 text-red-500" />
            Sala: <span className="font-mono text-red-400">{roomId}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Users className="w-5 h-5" />
          <span className="font-medium">{Object.keys(participants).length} Conectados</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        {/* Controles del Usuario */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Tu Estado</h2>
            {localState && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-red-400 text-sm font-bold flex items-center gap-1"><Activity className="w-4 h-4"/> VIT</span>
                    <span className="text-white text-sm">{localState.vit} / {localState.maxVit}</span>
                  </div>
                  <div className="h-4 bg-zinc-950 rounded-full border border-zinc-800">
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(localState.vit/localState.maxVit)*100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-blue-400 text-sm font-bold flex items-center gap-1"><Droplets className="w-4 h-4"/> CH</span>
                    <span className="text-white text-sm">{localState.ch} / {localState.maxCh}</span>
                  </div>
                  <div className="h-4 bg-zinc-950 rounded-full border border-zinc-800">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(localState.ch/localState.maxCh)*100}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-zinc-300">Acciones</h3>
            <div className="flex gap-2">
              <input type="number" min="0" value={damageInput} onChange={(e) => setDamageInput(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-white" placeholder="Daño Recibido" />
              <button onClick={applyDamage} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shrink-0">Aplicar</button>
            </div>
            <div className="flex gap-2">
              <input type="number" min="0" value={chakraInput} onChange={(e) => setChakraInput(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-white" placeholder="Gasto CH" />
              <button onClick={useChakra} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shrink-0">Gastar</button>
            </div>
            <div className="flex gap-2 pt-4 border-t border-zinc-800">
              <div className="flex items-center w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3">
                <span className="text-zinc-500 mr-2">D</span>
                <input type="number" value={dadoInput} onChange={(e) => setDadoInput(Number(e.target.value))} className="bg-transparent text-white w-full outline-none py-2" />
              </div>
              <button onClick={rollDice} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shrink-0">
                <Dices className="w-4 h-4" /> Tirar
              </button>
            </div>
          </div>
        </div>

        {/* Participantes y Log */}
        <div className="lg:col-span-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-zinc-300 mb-4">Adversarios / Aliados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(participants).filter(p => p.user_id !== activeCharacter.id).map(p => (
                <div key={p.user_id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <div className="font-bold text-white mb-2">{p.nombre}</div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-red-400">VIT: {p.estado?.vit}</span>
                    <span className="text-blue-400">CH: {p.estado?.ch}</span>
                  </div>
                </div>
              ))}
              {Object.values(participants).length <= 1 && (
                <div className="text-zinc-500 text-sm">Esperando a otros combatientes...</div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex-1 flex flex-col min-h-0">
            <h3 className="font-bold text-zinc-300 mb-4 shrink-0">Registro de Combate</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 font-mono text-sm">
              {logs.map((log, i) => (
                <div key={i} className="text-zinc-400 border-b border-zinc-800/50 pb-2 last:border-0" dangerouslySetInnerHTML={{__html: log.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}} />
              ))}
              {logs.length === 0 && <div className="text-zinc-600 italic">No hay actividad aún.</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
