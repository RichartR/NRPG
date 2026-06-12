'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useCharacterStore } from '@/store/useCharacterStore';
import {
  Dices, Activity, Users, Play,
  RotateCcw, ChevronUp, ChevronDown, Zap,
  BookOpen, Trash2, Copy
} from 'lucide-react';
import { useToastStore } from '@/components/ui/Toast';
import Link from 'next/link';
import CombatForm from '@/components/registros/CombatForm';

interface CombatState {
  vit: number;
  maxVit: number;
  ch: number;
  maxCh: number;
  vel: number;
  kawarimi: number;
  maxKawarimi: number;
}

interface Participant {
  user_id: string;
  nombre: string;
  url_img?: string;
  estado: CombatState;
  bando: 'A' | 'B' | null;
  isInCombat: boolean;
  cooldowns?: Record<number, number>; // tecnicaId -> reusableAtRound
}

export default function CombatRoom({ roomId }: { roomId: string }) {
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);

  // Participant presence records
  const [participants, setParticipants] = useState<Record<string, Participant>>({});

  // Local active character combat state
  const [localState, setLocalState] = useState<CombatState | null>(null);
  const [myBando, setMyBando] = useState<'A' | 'B' | null>(null);
  const [myIsInCombat, setMyIsInCombat] = useState(false);
  const [myCooldowns, setMyCooldowns] = useState<Record<number, number>>({});

  // Global Combat state (synced via Broadcast)
  const [turnQueue, setTurnQueue] = useState<string[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [rondaActual, setRondaActual] = useState(1);
  const [combatStarted, setCombatStarted] = useState(false);

  // Logs
  const [logs, setLogs] = useState<string[]>([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Console Inputs
  const [damageInput, setDamageInput] = useState<number | ''>('');
  const [healInput, setHealInput] = useState<number | ''>('');
  const [dadoInput, setDadoInput] = useState(100);
  const [chakraSpendInput, setChakraSpendInput] = useState<number | ''>('');
  const [chakraRecoverInput, setChakraRecoverInput] = useState<number | ''>('');

  // Technique Console Inputs
  const [selectedTecnicaId, setSelectedTecnicaId] = useState<number | null>(null);
  const [customChCost, setCustomChCost] = useState<number>(10);
  const [customCdRounds, setCustomCdRounds] = useState<number>(1);
  const [tecnicaSearch, setTecnicaSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCdDropdownOpen, setIsCdDropdownOpen] = useState(false);

  const supabase = createClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchActiveCharacter();
  }, [fetchActiveCharacter]);

  // Initializing local character stats
  useEffect(() => {
    if (activeCharacter) {
      if (!localState) {
        setLocalState({
          vit: activeCharacter.atributos_derivados.VIT,
          maxVit: activeCharacter.atributos_derivados.VIT,
          ch: activeCharacter.atributos_derivados.CH,
          maxCh: activeCharacter.atributos_derivados.CH,
          vel: activeCharacter.atributos_derivados.VEL || 0,
          kawarimi: 0,
          maxKawarimi: 1,
        });
      } else if (localState.vel !== activeCharacter.atributos_derivados.VEL) {
        setLocalState(prev => prev ? { ...prev, vel: activeCharacter.atributos_derivados.VEL || 0 } : null);
      }
    }
  }, [activeCharacter, localState?.vel]);

  // Refs to avoid feedback loops and channel recreation on state updates
  const turnQueueRef = useRef(turnQueue);
  const currentTurnIndexRef = useRef(currentTurnIndex);
  const rondaActualRef = useRef(rondaActual);
  const combatStartedRef = useRef(combatStarted);
  const localStateRef = useRef(localState);
  const myBandoRef = useRef(myBando);
  const myIsInCombatRef = useRef(myIsInCombat);
  const myCooldownsRef = useRef(myCooldowns);
  const logsRef = useRef(logs);
  const activeCharacterRef = useRef(activeCharacter);

  useEffect(() => { turnQueueRef.current = turnQueue; }, [turnQueue]);
  useEffect(() => { currentTurnIndexRef.current = currentTurnIndex; }, [currentTurnIndex]);
  useEffect(() => { rondaActualRef.current = rondaActual; }, [rondaActual]);
  useEffect(() => { combatStartedRef.current = combatStarted; }, [combatStarted]);
  useEffect(() => { localStateRef.current = localState; }, [localState]);
  useEffect(() => { myBandoRef.current = myBando; }, [myBando]);
  useEffect(() => { myIsInCombatRef.current = myIsInCombat; }, [myIsInCombat]);
  useEffect(() => { myCooldownsRef.current = myCooldowns; }, [myCooldowns]);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { activeCharacterRef.current = activeCharacter; }, [activeCharacter]);

  // Supabase Presence and Broadcast Subscriptions
  useEffect(() => {
    if (!activeCharacter) return;

    const channelName = `room_${roomId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: String(activeCharacter.id) },
        broadcast: { self: false }
      },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log("PRESENCE SYNC STATE:", state);
        const activeParticipants: Record<string, Participant> = {};

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences.length > 0) {
            const merged = presences.reduce((acc, curr) => ({ ...acc, ...curr }), {} as Participant);
            activeParticipants[key] = merged;
          }
        });

        console.log("ACTIVE PARTICIPANTS MAPPED:", activeParticipants);
        setParticipants(activeParticipants);
      })
      .on('broadcast', { event: 'combat_log' }, ({ payload }) => {
        if (payload.senderId !== String(activeCharacterRef.current?.id)) {
          setLogs(prev => [...prev, payload.message].slice(-40));
        }
      })
      .on('broadcast', { event: 'request_combat_state' }, () => {
        // Find active participants to choose a single responder
        const presenceState = channel.presenceState();
        const activeResponders = Object.keys(presenceState).filter(key => {
          const presences = presenceState[key] as any[];
          if (presences.length === 0) return false;
          const participant = presences[0];
          return participant.isInCombat || (logsRef.current && logsRef.current.length > 0);
        }).sort();

        const firstResponder = activeResponders[0];

        if (firstResponder === String(activeCharacter.id)) {
          channel.httpSend('combat_state_update', {
            turnQueue: turnQueueRef.current,
            currentTurnIndex: currentTurnIndexRef.current,
            rondaActual: rondaActualRef.current,
            combatStarted: combatStartedRef.current,
            logs: logsRef.current,
            senderId: String(activeCharacter.id)
          });
        }
      })
      .on('broadcast', { event: 'combat_state_update' }, ({ payload }) => {
        if (payload.senderId !== String(activeCharacterRef.current?.id)) {
          setTurnQueue(payload.turnQueue);
          setCurrentTurnIndex(payload.currentTurnIndex);
          setRondaActual(payload.rondaActual);
          setCombatStarted(payload.combatStarted);
          if (payload.logs && payload.logs.length > 0) {
            setLogs(payload.logs);
          }
        }
      })
      .on('broadcast', { event: 'combat_reset' }, () => {
        setMyBando(null);
        setMyIsInCombat(false);
        setMyCooldowns({});
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          // Request the current global combat state from anyone in the room
          channel.send({
            type: 'broadcast',
            event: 'request_combat_state',
            payload: {}
          });
        } else {
          setIsSubscribed(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsSubscribed(false);
    };
  }, [roomId, activeCharacter?.id]);

  // Track presence reactively when stats, bando, or combat status changes (only after subscription is active)
  useEffect(() => {
    if (isSubscribed && channelRef.current && activeCharacter && localState) {
      const payload = {
        user_id: String(activeCharacter.id),
        nombre: activeCharacter.nombre_ninja,
        url_img: activeCharacter.url_img || '',
        estado: localState,
        bando: myBando,
        isInCombat: myIsInCombat,
        cooldowns: myCooldowns
      };
      console.log("REACTIVELY TRACKING PRESENCE PAYLOAD:", payload);
      channelRef.current.track(payload);
    }
  }, [isSubscribed, activeCharacter?.id, localState, myBando, myIsInCombat, myCooldowns]);

  const addLog = async (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatted = `[${time}] ${message}`;
    setLogs(prev => [...prev, formatted].slice(-40));

    if (channelRef.current && activeCharacter) {
      channelRef.current.httpSend('combat_log', {
        message: formatted,
        senderId: String(activeCharacter.id)
      });
    }
  };

  const broadcastGlobalState = (queue: string[], index: number, round: number, started: boolean) => {
    if (channelRef.current && activeCharacter) {
      channelRef.current.httpSend('combat_state_update', {
        turnQueue: queue,
        currentTurnIndex: index,
        rondaActual: round,
        combatStarted: started,
        senderId: String(activeCharacter.id)
      });
    }
  };

  const updateGlobalCombatState = (queue: string[], index: number, round: number, started: boolean) => {
    setTurnQueue(queue);
    setCurrentTurnIndex(index);
    setRondaActual(round);
    setCombatStarted(started);
    broadcastGlobalState(queue, index, round, started);
  };

  // Turn reordering or manual override
  const moveQueueItem = (index: number, direction: 'up' | 'down') => {
    const newQueue = [...turnQueue];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQueue.length) return;

    const temp = newQueue[index];
    newQueue[index] = newQueue[targetIndex];
    newQueue[targetIndex] = temp;

    let newActiveIndex = currentTurnIndex;
    if (currentTurnIndex === index) {
      newActiveIndex = targetIndex;
    } else if (currentTurnIndex === targetIndex) {
      newActiveIndex = index;
    }

    updateGlobalCombatState(newQueue, newActiveIndex, rondaActual, combatStarted);
  };

  const removeFromQueue = (charId: string) => {
    const newQueue = turnQueue.filter(id => id !== charId);
    let newIndex = currentTurnIndex;
    if (newIndex >= newQueue.length && newQueue.length > 0) {
      newIndex = 0;
    }
    updateGlobalCombatState(newQueue, newIndex, rondaActual, newQueue.length > 0 ? combatStarted : false);
    addLog(`El participante **${participants[charId]?.nombre || 'Shinobi'}** ha sido retirado de los turnos.`);
  };

  const toggleJoinCombat = () => {
    if (!activeCharacter) return;
    const charIdStr = String(activeCharacter.id);

    if (myIsInCombat) {
      setMyIsInCombat(false);
      const newQueue = turnQueue.filter(id => id !== charIdStr);
      let newIndex = currentTurnIndex;
      if (newIndex >= newQueue.length && newQueue.length > 0) {
        newIndex = 0;
      }
      updateGlobalCombatState(newQueue, newIndex, rondaActual, newQueue.length > 0 ? combatStarted : false);
      addLog(`**${activeCharacter.nombre_ninja}** sale del combate.`);
    } else {
      setMyIsInCombat(true);
      const newQueue = [...turnQueue, charIdStr];
      updateGlobalCombatState(newQueue, currentTurnIndex, rondaActual, combatStarted);
      addLog(`**${activeCharacter.nombre_ninja}** se une a los turnos del combate.`);
    }
  };

  const startCombat = () => {
    if (turnQueue.length === 0) {
      addToast("Debe haber al menos 1 ninja en los turnos para iniciar.", "error");
      return;
    }
    updateGlobalCombatState(turnQueue, 0, 1, true);
    addLog(`**¡EL COMBATE HA COMENZADO!** (Ronda 1)`);
    const activePlayerName = participants[turnQueue[0]]?.nombre || 'Shinobi';
    addLog(`Es el turno de **${activePlayerName}**.`);
  };

  const resetCombat = () => {
    updateGlobalCombatState([], 0, 1, false);
    setMyBando(null);
    setMyIsInCombat(false);
    setMyCooldowns({});
    addLog(`El combate ha sido reiniciado por completo.`);
    if (channelRef.current && activeCharacter) {
      channelRef.current.httpSend('combat_reset', {
        senderId: String(activeCharacter.id)
      });
    }
  };

  const passTurn = () => {
    if (turnQueue.length === 0) return;

    const activeCharId = turnQueue[currentTurnIndex];
    const activeParticipantName = participants[activeCharId]?.nombre || 'Shinobi';

    let nextIndex = currentTurnIndex + 1;
    let nextRound = rondaActual;
    let roundEnded = false;

    if (nextIndex >= turnQueue.length) {
      nextIndex = 0;
      nextRound = rondaActual + 1;
      roundEnded = true;
    }

    updateGlobalCombatState(turnQueue, nextIndex, nextRound, true);
    addLog(`Fin del turno de **${activeParticipantName}**.`);

    if (roundEnded) {
      addLog(`**Ronda ${nextRound} Iniciada**`);
    }

    const nextCharId = turnQueue[nextIndex];
    const nextPlayerName = participants[nextCharId]?.nombre || 'Siguiente shinobi';
    addLog(`Es el turno de **${nextPlayerName}**.`);
  };

  // Local actions for VIT & CH
  const handleApplyDamage = () => {
    if (!localState || damageInput === '' || damageInput <= 0) return;
    const currentRes = activeCharacter?.atributos_derivados.RES || 0;
    const reduced = Math.max(1, Math.floor(damageInput * (1 - currentRes / 100)));
    const newVit = Math.max(0, localState.vit - reduced);

    const updated = { ...localState, vit: newVit };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja}** recibe ${damageInput} de daño (${reduced} tras resistencia). VIT: ${newVit}/${localState.maxVit}.`);
    setDamageInput('');
  };

  const handleApplyHeal = () => {
    if (!localState || healInput === '' || healInput <= 0) return;
    const newVit = Math.min(localState.maxVit, localState.vit + healInput);

    const updated = { ...localState, vit: newVit };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja}** se cura +${healInput} VIT. VIT: ${newVit}/${localState.maxVit}.`);
    setHealInput('');
  };

  const handleSpendChakra = () => {
    if (!localState || chakraSpendInput === '' || chakraSpendInput <= 0) return;
    const newCh = Math.max(0, localState.ch - chakraSpendInput);
    const updated = { ...localState, ch: newCh };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja}** gasta ${chakraSpendInput} de CH. CH: ${newCh}/${localState.maxCh}.`);
    setChakraSpendInput('');

    const percentage = (newCh / localState.maxCh) * 100;
    if (percentage < 10) {
      addLog(`**¡CRÍTICO!** Chakra de **${activeCharacter?.nombre_ninja}** es menor al 10%. Requiere Tirada de Cansancio Avanzado.`);
    } else if (percentage < 20) {
      addLog(`**¡ADVERTENCIA!** Chakra de **${activeCharacter?.nombre_ninja}** es menor al 20%. Requiere Tirada de Cansancio.`);
    }
  };

  const handleRecoverChakra = () => {
    if (!localState || chakraRecoverInput === '' || chakraRecoverInput <= 0) return;
    const newCh = Math.min(localState.maxCh, localState.ch + chakraRecoverInput);
    const updated = { ...localState, ch: newCh };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja}** recupera +${chakraRecoverInput} CH. CH: ${newCh}/${localState.maxCh}.`);
    setChakraRecoverInput('');
  };

  const rollDice = () => {
    const result = Math.floor(Math.random() * dadoInput) + 1;
    addLog(`**${activeCharacter?.nombre_ninja}** tira un D${dadoInput} y saca: **${result}**`);
  };

  // Change Bando selection
  const selectBando = (bando: 'A' | 'B' | null) => {
    setMyBando(bando);
    const bandoText = bando === 'A' ? 'Bando A' : bando === 'B' ? 'Bando B' : 'Espectador';
    addLog(`**${activeCharacter?.nombre_ninja}** se mueve a: **${bandoText}**.`);
  };

  // Cooldown Helper
  const getRemainingCD = (reusableAtRound: number, cdRounds: number) => {
    if (rondaActual >= reusableAtRound) return 0;
    const castRound = reusableAtRound - cdRounds - 1;
    if (rondaActual === castRound) return cdRounds;
    return reusableAtRound - rondaActual;
  };

  // Use Technique
  const handleUseTecnica = () => {
    if (!localState || selectedTecnicaId === null || !activeCharacter) return;

    const techWrapper = activeCharacter.personajes_tecnicas?.find(t => t.tecnica_id === selectedTecnicaId);
    const techName = techWrapper?.info_glosario?.nombre_es || 'Técnica';

    if (localState.ch < customChCost) {
      addToast("Chakra insuficiente para realizar esta técnica.", "error");
      return;
    }

    // Cooldown check
    const currentCD = myCooldowns[selectedTecnicaId] ? getRemainingCD(myCooldowns[selectedTecnicaId], customCdRounds) : 0;
    if (currentCD > 0) {
      addToast(`La técnica está en cooldown por ${currentCD} rondas más.`, "error");
      return;
    }

    // Subtract Chakra
    const newCh = Math.max(0, localState.ch - customChCost);
    const newCooldowns = { ...myCooldowns };
    if (customCdRounds > 0) {
      newCooldowns[selectedTecnicaId] = rondaActual + customCdRounds + 1;
    }

    const updatedState = { ...localState, ch: newCh };
    setLocalState(updatedState);
    setMyCooldowns(newCooldowns);

    // Logging
    addLog(`**${activeCharacter.nombre_ninja}** usa **${techName}** (Coste: ${customChCost} CH | CD: ${customCdRounds} rondas). CH restante: ${newCh}/${localState.maxCh}.`);

    // Automatic Exhaustion Checks
    const percentage = (newCh / localState.maxCh) * 100;
    if (percentage < 10) {
      addLog(`**¡CRÍTICO!** Chakra de **${activeCharacter.nombre_ninja}** es menor al 10%. Requiere Tirada de Cansancio Avanzado.`);
    } else if (percentage < 20) {
      addLog(`**¡ADVERTENCIA!** Chakra de **${activeCharacter.nombre_ninja}** es menor al 20%. Requiere Tirada de Cansancio.`);
    }
  };

  if (!activeCharacter) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 border-4 border-oro/10 border-t-oro rounded-full animate-spin mb-8" />
        <h2 className="text-oro font-black uppercase tracking-[0.4em] text-xs xl:text-sm animate-pulse text-center">
          CARGANDO EXPEDIENTE NINJA...
        </h2>
      </div>
    );
  }

  if (showRegisterForm) {
    const bandoAParticipants = Object.values(participants).filter(p => p.bando === 'A' && p.isInCombat);
    const bandoBParticipants = Object.values(participants).filter(p => p.bando === 'B' && p.isInCombat);

    const prefilledData = {
      data: {
        equipo_a: bandoAParticipants.map(p => ({
          id: Number(p.user_id),
          nombre_ninja: p.nombre,
          rango: 'D'
        })),
        equipo_b: bandoBParticipants.map(p => ({
          id: Number(p.user_id),
          nombre_ninja: p.nombre,
          rango: 'D'
        })),
        ganador: 'Empate'
      }
    };

    return (
      <div
        className="min-h-screen bg-cover bg-center flex flex-col relative text-oro p-4 lg:p-8"
        style={{ backgroundImage: "url('/assets/ui/bg-combat.png')" }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none" />
        <div className="w-full max-w-[1400px] mx-auto relative z-10 py-6">
          <CombatForm
            onCreated={() => setShowRegisterForm(false)}
            initialData={prefilledData as any}
          />
        </div>
      </div>
    );
  }

  // Group participants by bando
  const bandoAParticipants = Object.values(participants).filter(p => p.bando === 'A');
  const bandoBParticipants = Object.values(participants).filter(p => p.bando === 'B');
  const spectatorParticipants = Object.values(participants).filter(p => p.bando === null);

  const isMyTurn = combatStarted && turnQueue.length > 0 && turnQueue[currentTurnIndex] === String(activeCharacter.id);

  return (
    <div
      className="min-h-screen bg-cover bg-center flex flex-col relative text-oro selection:bg-oro/20"
      style={{ backgroundImage: "url('/assets/ui/bg-combat.png')" }}
    >
      {/* No dark tint overlay to keep background fully visible */}

      {/* Main room wrapper */}
      <div className="relative z-10 w-full max-w-[1800px] mx-auto p-4 lg:p-8 flex flex-col flex-1 gap-6">

        {/* HEADER AREA */}
        <header className="flex flex-col md:flex-row justify-between items-center ninja-card-oro p-6 backdrop-blur-md relative gap-4" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
            <h1 className="ninja-title text-2xl xl:text-3xl italic tracking-widest">
              SALA DE COMBATE:{" "}
              <span
                onClick={() => {
                  navigator.clipboard.writeText(roomId);
                  addToast("¡Código de sala copiado!", "success");
                }}
                className="font-mono text-oro font-black cursor-pointer hover:text-white transition-colors select-all ml-2"
                style={{
                  WebkitTextFillColor: '#ffe69f',
                  background: 'none'
                }}
                title="Click para copiar el código de sala"
              >
                {roomId}
              </span>
            </h1>
            <span
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                addToast("¡Código de sala copiado!", "success");
              }}
              className="text-[10px] font-sans font-black tracking-wider text-oro/40 hover:text-oro hover:bg-oro/5 hover:border-oro/30 cursor-pointer bg-black/40 border border-oro/10 px-2 py-1 align-middle uppercase select-none rounded-sm transition-all flex items-center gap-1.5"
              title="Click para copiar el código de sala"
            >
              <Copy className="w-3 h-3 text-oro/60" />
              CLIC PARA COPIAR
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-oro/60 text-xs font-black uppercase tracking-wider bg-black/40 border border-oro/5 px-4 py-2">
              <Users className="w-4 h-4 text-oro" />
              <span>{Object.keys(participants).length} Conectados</span>
            </div>
            <button
              onClick={() => setShowRegisterForm(true)}
              className="ninja-btn-oro px-6 py-2.5 text-xs text-center"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              Registrar Combate
            </button>
            <Link
              href="/combate"
              className="ninja-btn-rojo px-6 py-2.5 text-xs text-center"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              Salir de la Sala
            </Link>
          </div>
        </header>

        {/* THREE COLUMNS BATTLEGROUND */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 lg:h-[720px]">

          {/* COLUMN 1: BANDO A */}
          <div className="lg:col-span-1 flex flex-col gap-4 ninja-card-oro p-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-oro/10 pb-4 mb-2 gap-2">
              <h2 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2 shrink-0">
                BANDO A
              </h2>
              {/* Bando Selector for Self */}
              {myBando !== 'A' && (
                <button
                  onClick={() => selectBando('A')}
                  className="ninja-btn-oro py-1.5 px-4 text-xs text-center"
                >
                  Unirse
                </button>
              )}
              <span className="text-caption font-black bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-sm shrink-0">
                {bandoAParticipants.length} ninjas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4 scrollbar-hide">
              {bandoAParticipants.map(p => (
                <div key={p.user_id} className="bg-black/40 border border-oro/5 p-4 rounded-sm hover:border-oro/20 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-black border border-oro/20 overflow-hidden flex items-center justify-center shrink-0">
                      {p.url_img ? (
                        <img src={p.url_img} alt="Avatar" className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className="text-oro font-black text-xs">{p.nombre.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-black text-sm text-oro uppercase tracking-wider truncate max-w-[150px]">{p.nombre}</div>
                      {p.isInCombat && (
                        <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1 rounded-sm">Combatiente</span>
                      )}
                    </div>
                  </div>

                  {/* Stats bars */}
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[10px] font-black mb-1">
                        <span className="text-red-400">VIT</span>
                        <span>{p.estado?.vit} / {p.estado?.maxVit}</span>
                      </div>
                      <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(p.estado?.vit / p.estado?.maxVit) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-black mb-1">
                        <span className="text-blue-400">CH</span>
                        <span>{p.estado?.ch} / {p.estado?.maxCh}</span>
                      </div>
                      <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(p.estado?.ch / p.estado?.maxCh) * 100}%` }} />
                      </div>
                    </div>
                    {/* Speed & Kawarimi */}
                    <div className="flex justify-between items-center text-[10px] font-black pt-2 border-t border-oro/10 mt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-500 uppercase tracking-wider">VEL:</span>
                        <span className="text-white">{p.estado?.vel ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 uppercase tracking-wider">KAWARIMI:</span>
                        <div className="flex gap-1">
                          {Array.from({ length: p.estado?.maxKawarimi || 1 }, (_, i) => i + 1).map((num) => {
                            const isUsed = (p.estado?.kawarimi ?? 0) >= num;
                            const isSelf = String(activeCharacter?.id) === p.user_id;
                            return (
                              <button
                                key={num}
                                disabled={!isSelf}
                                onClick={() => {
                                  if (!isSelf || !localState) return;
                                  const newKawarimi = localState.kawarimi === num ? num - 1 : num;
                                  const updated = { ...localState, kawarimi: newKawarimi };
                                  setLocalState(updated);
                                  addLog(`**${activeCharacter.nombre_ninja}** marca Kawarimi ${newKawarimi >= num ? 'usado' : 'recuperado'} (${newKawarimi}/${localState.maxKawarimi}).`);
                                }}
                                className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center text-[8px] transition-all font-black ${isUsed
                                  ? 'bg-red-500/20 border-red-500 text-red-500'
                                  : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'
                                  } ${isSelf ? 'cursor-pointer' : 'cursor-default'}`}
                                title={isSelf ? `Marcar Kawarimi ${num} como ${isUsed ? 'disponible' : 'usado'}` : `Kawarimi ${num}`}
                              >
                                {isUsed ? '✕' : '✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {bandoAParticipants.length === 0 && (
                <div className="text-center py-10 text-oro/20 text-xs font-black uppercase tracking-wider">Vacío</div>
              )}
            </div>
          </div>

          {/* COLUMN 2 & 3: CENTER (COMBAT CONTROLS, TURN QUEUE, AND LOGS) */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* TURN QUEUE CONTAINER */}
            <div className="ninja-card-oro p-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-oro/10 pb-4 mb-4 gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-black text-sm uppercase tracking-[0.2em]">ORDEN DE TURNOS</h2>
                </div>
                <div className="text-caption font-black text-oro/50 uppercase tracking-widest">
                  Ronda: <span className="text-oro font-bold text-base">{rondaActual}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={toggleJoinCombat}
                  className={`px-5 py-2.5 text-xs ${myIsInCombat
                    ? 'ninja-btn-rojo'
                    : 'ninja-btn-oro'
                    }`}
                >
                  {myIsInCombat ? 'Retirarse de Combate' : 'Unirse al Combate'}
                </button>

                {!combatStarted ? (
                  <button
                    onClick={startCombat}
                    disabled={turnQueue.length === 0}
                    className="ninja-btn-oro px-5 py-2.5 text-xs flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-rojo-sangre" /> Iniciar Combate
                  </button>
                ) : (
                  <button
                    onClick={passTurn}
                    className="ninja-btn-oro px-6 py-2.5 text-xs flex items-center gap-2"
                  >
                    Pasar Turno
                  </button>
                )}

                <button
                  onClick={resetCombat}
                  className="ninja-btn-ghost px-5 py-2.5 text-xs flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
                </button>
              </div>

              {/* Turn Queue List */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {turnQueue.map((charId, idx) => {
                  const part = participants[charId];
                  const isActive = combatStarted && idx === currentTurnIndex;
                  if (!part) return null;

                  return (
                    <div
                      key={`${charId}-${idx}`}
                      className={`flex items-center justify-between p-3 border rounded-sm transition-all ${isActive
                        ? 'bg-oro/10 border-oro shadow-[0_0_15px_rgba(255,230,159,0.15)]'
                        : 'bg-black/30 border-oro/5 hover:border-oro/15'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="font-mono text-xs text-oro/40 w-4">{idx + 1}.</div>
                        <div className="w-6 h-6 bg-black border border-oro/20 overflow-hidden flex items-center justify-center shrink-0">
                          {part.url_img ? (
                            <img src={part.url_img} alt="Avatar" className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="text-oro font-black text-[10px]">{part.nombre.charAt(0)}</span>
                          )}
                        </div>
                        <span className={`font-black text-xs uppercase tracking-wide truncate ${isActive ? 'text-oro' : 'text-oro/70'}`}>
                          {part.nombre}
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-black uppercase text-rojo-sangre bg-oro px-1.5 py-0.5 rounded-sm animate-pulse">
                            Turno Activo
                          </span>
                        )}
                      </div>

                      {/* Queue sorting/management */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => moveQueueItem(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-oro/5 text-oro/40 hover:text-oro disabled:opacity-20"
                          title="Subir turno"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveQueueItem(idx, 'down')}
                          disabled={idx === turnQueue.length - 1}
                          className="p-1 hover:bg-oro/5 text-oro/40 hover:text-oro disabled:opacity-20"
                          title="Bajar turno"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFromQueue(charId)}
                          className="p-1 hover:bg-rojo-sangre/10 text-oro/30 hover:text-red-400 ml-2"
                          title="Retirar de turnos"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {turnQueue.length === 0 && (
                  <div className="text-center py-8 text-oro/20 text-xs font-black uppercase tracking-wider italic">
                    Sin ninjas en la fila de turnos. Pulsa "Unirse al Combate" para empezar.
                  </div>
                )}
              </div>
            </div>

            {/* COMBAT LOGS */}
            <div className="ninja-card-oro p-6 flex-1 flex flex-col relative overflow-hidden min-h-[300px]">
              <h3 className="font-black text-sm uppercase tracking-[0.2em] border-b border-oro/10 pb-4 mb-4">
                REGISTRO DE COMBATE
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 font-mono text-xs text-oro/75 custom-scrollbar">
                {[...logs].reverse().map((log, i) => (
                  <div
                    key={i}
                    className="border-b border-oro/5 pb-2 last:border-0 leading-relaxed animate-fade-in"
                    dangerouslySetInnerHTML={{
                      __html: log
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-oro font-black">$1</strong>')
                    }}
                  />
                ))}
                {logs.length === 0 && (
                  <div className="text-oro/20 italic text-center py-12 uppercase tracking-widest">
                    Esperando sucesos en el campo de batalla...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 4: BANDO B */}
          <div className="lg:col-span-1 flex flex-col gap-4 ninja-card-rojo p-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-oro/10 pb-4 mb-2 gap-2">
              <h2 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2 shrink-0">
                BANDO B
              </h2>
              {/* Bando Selector for Self */}
              {myBando !== 'B' && (
                <button
                  onClick={() => selectBando('B')}
                  className="ninja-btn-rojo py-1.5 px-4 text-xs text-center"
                >
                  Unirse
                </button>
              )}
              <span className="text-caption font-black bg-red-950/40 border border-red-500/20 text-red-400 px-2.5 py-0.5 rounded-sm shrink-0">
                {bandoBParticipants.length} ninjas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4 scrollbar-hide">
              {bandoBParticipants.map(p => (
                <div key={p.user_id} className="bg-black/40 border border-oro/5 p-4 rounded-sm hover:border-oro/20 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-black border border-oro/20 overflow-hidden flex items-center justify-center shrink-0">
                      {p.url_img ? (
                        <img src={p.url_img} alt="Avatar" className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className="text-oro font-black text-xs">{p.nombre.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-black text-sm text-oro uppercase tracking-wider truncate max-w-[150px]">{p.nombre}</div>
                      {p.isInCombat && (
                        <span className="text-[9px] font-black uppercase text-red-400 bg-red-950/40 border border-red-500/20 px-1 rounded-sm">Combatiente</span>
                      )}
                    </div>
                  </div>

                  {/* Stats bars */}
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[10px] font-black mb-1">
                        <span className="text-red-400">VIT</span>
                        <span>{p.estado?.vit} / {p.estado?.maxVit}</span>
                      </div>
                      <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(p.estado?.vit / p.estado?.maxVit) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-black mb-1">
                        <span className="text-blue-400">CH</span>
                        <span>{p.estado?.ch} / {p.estado?.maxCh}</span>
                      </div>
                      <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(p.estado?.ch / p.estado?.maxCh) * 100}%` }} />
                      </div>
                    </div>
                    {/* Speed & Kawarimi */}
                    <div className="flex justify-between items-center text-[10px] font-black pt-2 border-t border-oro/10 mt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-500 uppercase tracking-wider">VEL:</span>
                        <span className="text-white">{p.estado?.vel ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 uppercase tracking-wider">KAWARIMI:</span>
                        <div className="flex gap-1">
                          {Array.from({ length: p.estado?.maxKawarimi || 1 }, (_, i) => i + 1).map((num) => {
                            const isUsed = (p.estado?.kawarimi ?? 0) >= num;
                            const isSelf = String(activeCharacter?.id) === p.user_id;
                            return (
                              <button
                                key={num}
                                disabled={!isSelf}
                                onClick={() => {
                                  if (!isSelf || !localState) return;
                                  const newKawarimi = localState.kawarimi === num ? num - 1 : num;
                                  const updated = { ...localState, kawarimi: newKawarimi };
                                  setLocalState(updated);
                                  addLog(`**${activeCharacter.nombre_ninja}** marca Kawarimi ${newKawarimi >= num ? 'usado' : 'recuperado'} (${newKawarimi}/${localState.maxKawarimi}).`);
                                }}
                                className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center text-[8px] transition-all font-black ${isUsed
                                  ? 'bg-red-500/20 border-red-500 text-red-500'
                                  : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'
                                  } ${isSelf ? 'cursor-pointer' : 'cursor-default'}`}
                                title={isSelf ? `Marcar Kawarimi ${num} como ${isUsed ? 'disponible' : 'usado'}` : `Kawarimi ${num}`}
                              >
                                {isUsed ? '✕' : '✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {bandoBParticipants.length === 0 && (
                <div className="text-center py-10 text-oro/20 text-xs font-black uppercase tracking-wider">Vacío</div>
              )}
            </div>
          </div>
        </div>

        {/* SPECTATORS PANEL */}
        {spectatorParticipants.length > 0 && (
          <div className="ninja-card-oro p-4 relative">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-oro/40 border-b border-oro/10 pb-2 mb-2">Espectadores en la sala</h4>
            <div className="flex flex-wrap gap-3">
              {spectatorParticipants.map(s => (
                <span key={s.user_id} className="text-xs font-black text-oro/60 bg-black/40 border border-oro/5 px-3 py-1">
                  {s.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* BOTTOM PANEL: PLAYER CONSOLE CONTROLS */}
        <section className="ninja-card-oro p-6 md:p-8 relative" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

            {/* 1. MY STATS */}
            <div className="space-y-5">
              <h3 className="font-black text-sm uppercase tracking-[0.2em] border-b border-oro/10 pb-3 flex items-center gap-2.5">
                TU ESTADO EN COMBATE
              </h3>

              {localState && (
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-xs font-black mb-1.5">
                      <span className="text-red-400">VITALIDAD (VIT)</span>
                      <span>{localState.vit} / {localState.maxVit}</span>
                    </div>
                    <div className="h-4 bg-black/60 border border-oro/15 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300" style={{ width: `${(localState.vit / localState.maxVit) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-black mb-1.5">
                      <span className="text-blue-400">CHAKRA (CH)</span>
                      <span>{localState.ch} / {localState.maxCh}</span>
                    </div>
                    <div className="h-4 bg-black/60 border border-oro/15 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300" style={{ width: `${(localState.ch / localState.maxCh) * 100}%` }} />
                    </div>
                  </div>

                  {/* VEL and KAWARIMI FOR SELF */}
                  <div className="flex justify-between items-center text-xs font-black pt-3 border-t border-oro/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-500 uppercase tracking-wider">VELOCIDAD:</span>
                      <span className="text-white text-sm">{localState.vel}</span>
                    </div>
                    <div className="flex items-center flex-wrap gap-y-2 gap-x-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 uppercase tracking-wider">KAWARIMI:</span>
                        <div className="flex gap-1.5">
                          {Array.from({ length: localState.maxKawarimi || 1 }, (_, i) => i + 1).map((num) => {
                            const isUsed = localState.kawarimi >= num;
                            return (
                              <button
                                key={num}
                                onClick={() => {
                                  const newKawarimi = localState.kawarimi === num ? num - 1 : num;
                                  const updated = { ...localState, kawarimi: newKawarimi };
                                  setLocalState(updated);
                                  addLog(`**${activeCharacter.nombre_ninja}** marca Kawarimi ${newKawarimi >= num ? 'usado' : 'recuperado'} (${newKawarimi}/${localState.maxKawarimi}).`);
                                }}
                                className={`w-6 h-6 border rounded-sm flex items-center justify-center text-xs transition-all font-black ${isUsed
                                  ? 'bg-red-500/20 border-red-500 text-red-500'
                                  : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'
                                  } cursor-pointer`}
                                title={`Marcar Kawarimi ${num} como ${isUsed ? 'disponible' : 'usado'}`}
                              >
                                {isUsed ? '✕' : '✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Control para ajustar usos máximos */}
                      <div className="flex items-center gap-1 bg-black/40 border border-oro/10 px-1.5 py-0.5 rounded-sm">
                        <span className="text-[10px] text-oro/60 uppercase">Max:</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={localState.maxKawarimi || 1}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                            setLocalState(prev => prev ? { ...prev, maxKawarimi: val, kawarimi: Math.min(prev.kawarimi, val) } : null);
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-8 bg-transparent text-white text-xs font-black text-center outline-none border-none p-0 select-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. STAT ADJUSTMENTS & DICE ROLLS */}
            <div className="space-y-5 border-l border-r border-oro/10 px-0 xl:px-8">
              <h3 className="font-black text-sm uppercase tracking-[0.2em] border-b border-oro/10 pb-3 flex items-center gap-2.5">
                AJUSTES Y TIRADAS
              </h3>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="Daño Recibido"
                    value={damageInput}
                    onChange={(e) => setDamageInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-black/50 border border-oro/20 text-oro px-4 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                  />
                  <button
                    onClick={handleApplyDamage}
                    className="ninja-btn-rojo px-6 py-2 text-xs"
                  >
                    Daño
                  </button>
                </div>

                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="Curación Recibida"
                    value={healInput}
                    onChange={(e) => setHealInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-black/50 border border-oro/20 text-oro px-4 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                  />
                  <button
                    onClick={handleApplyHeal}
                    className="ninja-btn-oro px-6 py-2 text-xs"
                  >
                    Curar
                  </button>
                </div>

                <div className="flex gap-3 pt-3 border-t border-oro/10">
                  <input
                    type="number"
                    min="0"
                    placeholder="Chakra a Gastar"
                    value={chakraSpendInput}
                    onChange={(e) => setChakraSpendInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-black/50 border border-oro/20 text-oro px-4 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                  />
                  <button
                    onClick={handleSpendChakra}
                    className="ninja-btn-rojo px-6 py-2 text-xs"
                  >
                    Gastar
                  </button>
                </div>

                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="Chakra a Recuperar"
                    value={chakraRecoverInput}
                    onChange={(e) => setChakraRecoverInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-black/50 border border-oro/20 text-oro px-4 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                  />
                  <button
                    onClick={handleRecoverChakra}
                    className="ninja-btn-oro px-6 py-2 text-xs"
                  >
                    Recuperar
                  </button>
                </div>

                <div className="flex gap-3 pt-3 border-t border-oro/10">
                  <div className="flex items-center w-full bg-black/50 border border-oro/20 px-4 focus-within:border-oro transition-all">
                    <span className="text-oro/40 font-mono text-xs mr-2">D</span>
                    <input
                      type="number"
                      value={dadoInput}
                      onChange={(e) => setDadoInput(Number(e.target.value))}
                      className="bg-transparent text-oro text-xs font-black outline-none w-full py-2"
                    />
                  </div>
                  <button
                    onClick={rollDice}
                    className="ninja-btn-oro px-6 py-2 text-xs flex items-center gap-2 shrink-0"
                  >
                    <Dices className="w-4 h-4 text-rojo-sangre" /> Tirar
                  </button>
                </div>
              </div>
            </div>

            {/* 3. TECHNIQUE CASTING CONSOLE */}
            <div className="space-y-5">
              <h3 className="font-black text-sm uppercase tracking-[0.2em] border-b border-oro/10 pb-3 flex items-center gap-2.5">
                USO DE TÉCNICAS
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Left Column: Search & Select Ready Technique */}
                <div className="relative">
                  {/* Transparent overlay to close on outside click */}
                  {isDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => { setIsDropdownOpen(false); setTecnicaSearch(''); }} />
                  )}

                  <div
                    onClick={() => {
                      setIsDropdownOpen(prev => !prev);
                      setIsCdDropdownOpen(false);
                    }}
                    className="w-full bg-black/60 border border-oro/20 text-oro px-4 py-2.5 text-xs font-black flex justify-between items-center cursor-pointer hover:border-oro transition-all relative z-40"
                  >
                    <span className="truncate pr-4">
                      {selectedTecnicaId && !(myCooldowns[selectedTecnicaId] && getRemainingCD(myCooldowns[selectedTecnicaId], customCdRounds) > 0)
                        ? activeCharacter.personajes_tecnicas?.find(t => t.tecnica_id === selectedTecnicaId)?.info_glosario?.nombre_es
                        : 'BUSCAR TÉCNICA'}
                    </span>
                    <span className="text-[10px] text-oro/60 shrink-0">▼</span>
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-black/95 border border-oro/30 shadow-2xl max-h-[300px] overflow-hidden flex flex-col backdrop-blur-md">
                      {/* Search input field */}
                      <input
                        type="text"
                        placeholder="Buscar técnica..."
                        value={tecnicaSearch}
                        onChange={(e) => setTecnicaSearch(e.target.value)}
                        className="w-full bg-black/40 border-b border-oro/25 text-oro px-4 py-2 text-xs font-black outline-none focus:bg-black/20"
                        autoFocus
                      />

                      {/* Options list */}
                      <div className="overflow-y-auto max-h-[240px]">
                        {(activeCharacter.personajes_tecnicas || [])
                          .filter(pt => {
                            const name = pt.info_glosario?.nombre_es || '';
                            const isMatch = name.toLowerCase().includes(tecnicaSearch.toLowerCase());
                            const isCD = myCooldowns[pt.tecnica_id] && getRemainingCD(myCooldowns[pt.tecnica_id], customCdRounds) > 0;
                            return isMatch && !isCD; // Ready techniques only
                          })
                          .map(pt => {
                            const isSelected = selectedTecnicaId === pt.tecnica_id;

                            const handleSelect = () => {
                              setSelectedTecnicaId(pt.tecnica_id);
                              setIsDropdownOpen(false);
                              setTecnicaSearch('');

                              if (pt.info_glosario) {
                                const desc = pt.info_glosario.descripcion?.toLowerCase() || '';
                                const chMatch = desc.match(/(\d+)\s*(?:ch|chakra|puntos de chakra)/);
                                if (chMatch) {
                                  setCustomChCost(Number(chMatch[1]));
                                } else {
                                  setCustomChCost(15);
                                }

                                const cdMatch = desc.match(/(\d+)\s*(?:ronda|rondas|cd|cooldown)/);
                                if (cdMatch) {
                                  setCustomCdRounds(Number(cdMatch[1]));
                                } else {
                                  setCustomCdRounds(1);
                                }
                              }
                            };

                            return (
                              <div
                                key={pt.tecnica_id}
                                onClick={handleSelect}
                                className={`px-4 py-2.5 text-xs font-black border-b border-oro/5 last:border-b-0 flex justify-between items-center transition-all text-white/80 hover:bg-oro/10 hover:text-oro cursor-pointer ${isSelected ? 'bg-oro/20 text-oro border-l-2 border-oro' : ''
                                  }`}
                              >
                                <span className="truncate pr-2">{pt.info_glosario?.nombre_es}</span>
                                <span className="text-[9px] text-oro/40 font-mono shrink-0">Disponible</span>
                              </div>
                            );
                          })}

                        {/* No results */}
                        {(activeCharacter.personajes_tecnicas || []).filter(pt => {
                          const name = pt.info_glosario?.nombre_es || '';
                          const isMatch = name.toLowerCase().includes(tecnicaSearch.toLowerCase());
                          const isCD = myCooldowns[pt.tecnica_id] && getRemainingCD(myCooldowns[pt.tecnica_id], customCdRounds) > 0;
                          return isMatch && !isCD;
                        }).length === 0 && (
                            <div className="px-4 py-4 text-xs text-oro/30 italic text-center">
                              No hay técnicas disponibles
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Techniques in CD Dropdown */}
                <div className="relative">
                  {/* Transparent overlay to close on outside click */}
                  {isCdDropdownOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsCdDropdownOpen(false)} />
                  )}

                  <div
                    onClick={() => {
                      setIsCdDropdownOpen(prev => !prev);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full bg-black/60 border border-red-500/20 text-red-400 px-4 py-2.5 text-xs font-black flex justify-between items-center cursor-pointer hover:border-red-500 transition-all relative z-40"
                  >
                    <span className="truncate pr-4">
                      {`TÉCNICAS EN CD (${(activeCharacter.personajes_tecnicas || []).filter(pt => {
                        const cd = myCooldowns[pt.tecnica_id] ? getRemainingCD(myCooldowns[pt.tecnica_id], customCdRounds) : 0;
                        return cd > 0;
                      }).length})`}
                    </span>
                    <span className="text-[10px] text-red-500/60 shrink-0">▼</span>
                  </div>

                  {isCdDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-black/95 border border-red-500/30 shadow-2xl max-h-[300px] overflow-y-auto flex flex-col backdrop-blur-md">
                      {(activeCharacter.personajes_tecnicas || [])
                        .filter(pt => {
                          const cd = myCooldowns[pt.tecnica_id] ? getRemainingCD(myCooldowns[pt.tecnica_id], customCdRounds) : 0;
                          return cd > 0;
                        })
                        .map(pt => {
                          const cd = myCooldowns[pt.tecnica_id] ? getRemainingCD(myCooldowns[pt.tecnica_id], customCdRounds) : 0;
                          return (
                            <div
                              key={pt.tecnica_id}
                              className="px-4 py-2.5 text-xs font-black border-b border-red-500/5 last:border-b-0 flex justify-between items-center bg-red-950/20 text-red-400 border-l-2 border-red-500"
                            >
                              <span className="truncate pr-2">{pt.info_glosario?.nombre_es}</span>
                              <span className="text-[9px] font-black uppercase text-red-500 bg-red-950 border border-red-500/30 px-1.5 py-0.5 rounded-sm shrink-0">
                                CD: {cd} rondas
                              </span>
                            </div>
                          );
                        })}

                      {/* No results */}
                      {(activeCharacter.personajes_tecnicas || []).filter(pt => {
                        const cd = myCooldowns[pt.tecnica_id] ? getRemainingCD(myCooldowns[pt.tecnica_id], customCdRounds) : 0;
                        return cd > 0;
                      }).length === 0 && (
                          <div className="px-4 py-4 text-xs text-red-400/40 italic text-center">
                            Ninguna técnica en cooldown
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {selectedTecnicaId !== null && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-oro/40 block mb-1 uppercase">COSTE CHAKRA (CH)</label>
                      <input
                        type="number"
                        min="0"
                        value={customChCost}
                        onChange={(e) => setCustomChCost(Number(e.target.value))}
                        className="w-full bg-black/50 border border-oro/20 text-oro px-4 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-oro/40 block mb-1 uppercase">COOLDOWN (RONDAS)</label>
                      <input
                        type="number"
                        min="0"
                        value={customCdRounds}
                        onChange={(e) => setCustomCdRounds(Number(e.target.value))}
                        className="w-full bg-black/50 border border-oro/20 text-oro px-4 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleUseTecnica}
                    className="w-full ninja-btn-oro py-3 px-6 text-xs flex items-center justify-center gap-2"
                  >
                    Ejecutar Técnica
                  </button>
                </div>
              )}
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
