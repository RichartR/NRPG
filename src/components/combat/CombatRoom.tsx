'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useCharacterStore } from '@/store/useCharacterStore';
import { ProfileService } from '@/services/supabase/profile.service';
import {
  Dices, Users, Play,
  RotateCcw, ChevronUp, ChevronDown,
  Trash2, Copy, Sparkles
} from 'lucide-react';
import { useToastStore } from '@/components/ui/Toast';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CombatForm from '@/components/registros/CombatForm';
import NarrationForm from '@/components/registros/NarrationForm';
import { CharacterStats } from '@/domain/types';

interface CombatState {
  vit: number;
  maxVit: number;
  ch: number;
  maxCh: number;
  vel: number;
  kawarimi: number;
  maxKawarimi: number;
  usedTraits?: Record<number, boolean>;
}

interface Participant {
  user_id: string;
  nombre: string;
  url_img?: string;
  estado: CombatState;
  bando: 'A' | 'B' | null;
  isInCombat: boolean;
  cooldowns?: Record<number, number>; // tecnicaId -> reusableAtRound
  rasgos?: Array<{ id: number; nombre: string; usado: boolean }>;
  equipo?: Array<{ id: number; nombre: string }>;
  stats_base?: Record<string, number>; // Added for temp characters
}

export default function CombatRoom({ roomId }: { roomId: string }) {
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const searchParams = useSearchParams();
  const isEventMode = searchParams ? searchParams.get('mode') === 'event' : false;
  const canUseCombatMusic = isEventMode;

  // Participant presence records
  const [participants, setParticipants] = useState<Record<string, Participant>>({});

  // Local active character combat state
  const [localState, setLocalState] = useState<CombatState | null>(null);
  const [myBando, setMyBando] = useState<'A' | 'B' | null>(null);
  const [myIsInCombat, setMyIsInCombat] = useState(false);
  const [myCooldowns, setMyCooldowns] = useState<Record<number, number>>({});

  // Roll Mode state (Normal, Advantage, Disadvantage)
  const [rollMode, setRollMode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');

  const getStatModifier = (statVal: number) => {
    const clamped = Math.max(1, Math.min(10, statVal));
    const mods: Record<number, number> = {
      1: -2,
      2: -1,
      3: 0,
      4: 0,
      5: 1,
      6: 1,
      7: 2,
      8: 3,
      9: 4,
      10: 5
    };
    return mods[clamped] ?? 0;
  };

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
  const [vitInput, setVitInput] = useState<number | ''>('');
  const [chInput, setChInput] = useState<number | ''>('');
  const [dadoInput, setDadoInput] = useState(100);
  const [tempModifier, setTempModifier] = useState<number>(0);

  // Technique Console Inputs
  const [selectedTecnicaId, setSelectedTecnicaId] = useState<number | null>(null);
  const [customChCost, setCustomChCost] = useState<number>(0);
  const [customCdRounds, setCustomCdRounds] = useState<number>(1);
  const [tecnicaSearch, setTecnicaSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCdDropdownOpen, setIsCdDropdownOpen] = useState(false);
  const [bgNumber, setBgNumber] = useState<number>(1);
  const [isAdminOrNarrator, setIsAdminOrNarrator] = useState(false);
  const [tempCharacters, setTempCharacters] = useState<Record<string, Participant>>({});
  const tempCharactersRef = useRef(tempCharacters);
  const [masterTraits, setMasterTraits] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [showCreateTempModal, setShowCreateTempModal] = useState(false);
  const [rollTargetId, setRollTargetId] = useState<string>('self');

  // NPC Form States
  const [npcName, setNpcName] = useState('');
  const [npcBando, setNpcBando] = useState<'A' | 'B'>('A');
  const [npcVit, setNpcVit] = useState<number>(30);
  const [npcStats, setNpcStats] = useState<Record<string, number>>({
    NIN: 3, TAI: 3, GEN: 3, INT: 3, FUE: 3, AGI: 3, EST: 3, SM: 3
  });
  const [npcRasgos, setNpcRasgos] = useState<Array<{ id: number | string; nombre: string; usado: boolean }>>([]);
  const [npcEquipo, setNpcEquipo] = useState<Array<{ id: number | string; nombre: string }>>([]);
  const [traitSearch, setTraitSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [customTrait, setCustomTrait] = useState('');
  const [customItem, setCustomItem] = useState('');

  // Music Streaming States
  const [activeMusicVideoId, setActiveMusicVideoId] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState<number>(70);
  const [musicUrlInput, setMusicUrlInput] = useState('');
  const [musicIsPlaying, setMusicIsPlaying] = useState(true);
  const ytPlayerRef = useRef<any>(null);
  const activeMusicVideoIdRef = useRef<string | null>(null);
  const musicIsPlayingRef = useRef(musicIsPlaying);
  const playerTimeRef = useRef(0);

  useEffect(() => { activeMusicVideoIdRef.current = activeMusicVideoId; }, [activeMusicVideoId]);
  useEffect(() => { musicIsPlayingRef.current = musicIsPlaying; }, [musicIsPlaying]);

  // Listen to postMessage from YouTube Player API to track current playback time
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.event === 'infoDelivery' && data.info && typeof data.info.currentTime === 'number') {
          playerTimeRef.current = data.info.currentTime;
        }
      } catch (err) {
        // Not a JSON message from YT Player
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync volume with YouTube player iframe via postMessage
  useEffect(() => {
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'setVolume',
            args: [musicVolume]
          }),
          '*'
        );
      } catch (err) {
        console.error('Error syncing volume to YouTube player:', err);
      }
    }
  }, [musicVolume, activeMusicVideoId]);


  const handleTogglePlayMusic = () => {
    if (!canUseCombatMusic) return;
    const nextState = !musicIsPlaying;
    setMusicIsPlaying(nextState);
    if (ytPlayerRef.current) {
      ytPlayerRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: nextState ? 'playVideo' : 'pauseVideo',
          args: []
        }),
        '*'
      );
    }
    if (channelRef.current && activeCharacter) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'music_control',
        payload: {
          action: nextState ? 'play' : 'pause',
          senderId: String(activeCharacter.id)
        }
      });
    }
  };

  const handleSeekMusic = (deltaSeconds: number) => {
    if (!canUseCombatMusic) return;
    const newTime = Math.max(0, playerTimeRef.current + deltaSeconds);
    playerTimeRef.current = newTime; // optimistic update
    if (ytPlayerRef.current) {
      ytPlayerRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [newTime, true]
        }),
        '*'
      );
    }
    if (channelRef.current && activeCharacter) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'music_control',
        payload: {
          action: 'seek',
          value: newTime,
          senderId: String(activeCharacter.id)
        }
      });
    }
  };

  const supabase = createClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // We have 3 combat backgrounds
    const randomNum = Math.floor(Math.random() * 12) + 1;
    setBgNumber(randomNum);
  }, []);

  useEffect(() => {
    async function loadUserRoles() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await ProfileService.getProfile(user.id);
          const hasRole = profile?.roles?.some((r: string) => ['admin', 'moderador', 'narrador'].includes(r));
          setIsAdminOrNarrator(!!hasRole);
        }
      } catch (err) {
        console.error("Error loading user roles in CombatRoom:", err);
      }
    }
    loadUserRoles();
  }, [supabase]);

  useEffect(() => {
    if (isAdminOrNarrator && isEventMode) {
      supabase.from('info_rasgos').select('*').eq('activo', true).order('nombre')
        .then(({ data }) => {
          if (data) setMasterTraits(data);
        });

      supabase.from('info_glosario').select('*').eq('categoria_id', 2).eq('activo', true).order('nombre_es')
        .then(({ data }) => {
          if (data) setMasterItems(data);
        });
    }
  }, [isAdminOrNarrator, isEventMode, supabase]);

  useEffect(() => {
    fetchActiveCharacter();
  }, [fetchActiveCharacter]);

  // Initializing local character stats
  useEffect(() => {
    if (activeCharacter) {
      if (!localState) {
        let vit = activeCharacter.atributos_derivados.VIT;
        let maxVit = activeCharacter.atributos_derivados.VIT;

        if (isEventMode) {
          const rankVal = (activeCharacter.rango || 'D').toUpperCase();
          const rankVits: Record<string, number> = {
            'D': 15,
            'C': 25,
            'B': 50,
            'A': 80,
            'S': 100
          };
          const evVit = rankVits[rankVal] ?? 15;
          vit = evVit;
          maxVit = evVit;
        }

        setLocalState({
          vit: vit,
          maxVit: maxVit,
          ch: activeCharacter.atributos_derivados.CH,
          maxCh: activeCharacter.atributos_derivados.CH,
          vel: activeCharacter.atributos_derivados.VEL || 0,
          kawarimi: 0,
          maxKawarimi: 1,
          usedTraits: {},
        });
      } else if (localState.vel !== activeCharacter.atributos_derivados.VEL) {
        setLocalState(prev => prev ? { ...prev, vel: activeCharacter.atributos_derivados.VEL || 0 } : null);
      }
    }
  }, [activeCharacter, localState?.vel, isEventMode]);

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
  useEffect(() => { tempCharactersRef.current = tempCharacters; }, [tempCharacters]);

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
          channel.send({
            type: 'broadcast',
            event: 'combat_state_update',
            payload: {
              turnQueue: turnQueueRef.current,
              currentTurnIndex: currentTurnIndexRef.current,
              rondaActual: rondaActualRef.current,
              combatStarted: combatStartedRef.current,
              logs: logsRef.current,
              tempCharacters: tempCharactersRef.current,
              activeMusicVideoId: activeMusicVideoIdRef.current,
              musicIsPlaying: musicIsPlayingRef.current,
              senderId: String(activeCharacter.id)
            }
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
          if (payload.tempCharacters !== undefined) {
            setTempCharacters(payload.tempCharacters);
          }
          if (isEventMode && payload.activeMusicVideoId !== undefined) {
            setActiveMusicVideoId(payload.activeMusicVideoId);
          }
          if (isEventMode && payload.musicIsPlaying !== undefined) {
            setMusicIsPlaying(payload.musicIsPlaying);
            setTimeout(() => {
              if (ytPlayerRef.current) {
                ytPlayerRef.current.contentWindow?.postMessage(
                  JSON.stringify({
                    event: 'command',
                    func: payload.musicIsPlaying ? 'playVideo' : 'pauseVideo',
                    args: []
                  }),
                  '*'
                );
              }
            }, 800);
          }
        }
      })
      .on('broadcast', { event: 'temp_character_update' }, ({ payload }) => {
        if (payload.senderId !== String(activeCharacterRef.current?.id)) {
          setTempCharacters(payload.tempCharacters);
        }
      })
      .on('broadcast', { event: 'music_update' }, ({ payload }) => {
        if (isEventMode && payload.senderId !== String(activeCharacterRef.current?.id)) {
          setActiveMusicVideoId(payload.videoId ?? null);
          setMusicIsPlaying(true);
        }
      })
      .on('broadcast', { event: 'music_control' }, ({ payload }) => {
        if (isEventMode && payload.senderId !== String(activeCharacterRef.current?.id)) {
          if (payload.action === 'play') {
            setMusicIsPlaying(true);
            ytPlayerRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
              '*'
            );
          } else if (payload.action === 'pause') {
            setMusicIsPlaying(false);
            ytPlayerRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
              '*'
            );
          } else if (payload.action === 'seek') {
            ytPlayerRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'seekTo', args: [payload.value, true] }),
              '*'
            );
          }
        }
      })
      .on('broadcast', { event: 'combat_reset' }, () => {
        setMyBando(null);
        setMyIsInCombat(false);
        setMyCooldowns({});
        setTempCharacters({});
        setActiveMusicVideoId(null);
        setMusicIsPlaying(true);
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
        cooldowns: myCooldowns,
        rasgos: activeCharacter.personajes_rasgos?.map(r => ({
          id: r.info_rasgos?.id || r.rasgo_id,
          nombre: r.info_rasgos?.nombre || 'Rasgo',
          usado: localState.usedTraits?.[r.info_rasgos?.id || r.rasgo_id] || false
        })) || [],
        equipo: activeCharacter.personajes_inventario?.filter(pi => pi.equipado).map(pi => ({
          id: pi.info_glosario?.id || pi.item_id,
          nombre: pi.info_glosario?.nombre_es || 'Objeto'
        })) || []
      };
      console.log("REACTIVELY TRACKING PRESENCE PAYLOAD:", payload);
      channelRef.current.track(payload);
    }
  }, [
    isSubscribed,
    activeCharacter?.id,
    activeCharacter?.personajes_rasgos,
    activeCharacter?.personajes_inventario,
    localState,
    myBando,
    myIsInCombat,
    myCooldowns
  ]);

  const addLog = async (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatted = `[${time}] ${message}`;
    setLogs(prev => [...prev, formatted].slice(-40));

    if (channelRef.current && activeCharacter) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'combat_log',
        payload: {
          message: formatted,
          senderId: String(activeCharacter.id)
        }
      });
    }
  };

  const broadcastGlobalState = (queue: string[], index: number, round: number, started: boolean, temps?: Record<string, Participant>) => {
    if (channelRef.current && activeCharacter) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'combat_state_update',
        payload: {
          turnQueue: queue,
          currentTurnIndex: index,
          rondaActual: round,
          combatStarted: started,
          tempCharacters: temps ?? tempCharactersRef.current,
          activeMusicVideoId: activeMusicVideoIdRef.current,
          musicIsPlaying: musicIsPlayingRef.current,
          senderId: String(activeCharacter.id)
        }
      });
    }
  };

  const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    // Standardize URL patterns
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const broadcastMusic = (videoId: string | null) => {
    if (!canUseCombatMusic) return;
    if (channelRef.current && activeCharacter) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'music_update',
        payload: {
          videoId,
          senderId: String(activeCharacter.id)
        }
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

  const broadcastTempCharacters = (temps: Record<string, Participant>) => {
    if (channelRef.current && activeCharacter) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'temp_character_update',
        payload: {
          tempCharacters: temps,
          senderId: String(activeCharacter.id)
        }
      });
    }
  };

  const createTempCharacter = (tempChar: Participant) => {
    const newTemps = { ...tempCharactersRef.current, [tempChar.user_id]: tempChar };
    setTempCharacters(newTemps);
    broadcastTempCharacters(newTemps);
    addLog(`**[NPC]** **${tempChar.nombre}** ha sido añadido al **Bando ${tempChar.bando}** como personaje temporal.`);
  };

  const updateTempCharacter = (id: string, updates: Partial<Participant>) => {
    const updated = { ...tempCharactersRef.current };
    if (updated[id]) {
      updated[id] = { ...updated[id], ...updates };
      setTempCharacters(updated);
      broadcastTempCharacters(updated);
    }
  };

  const removeTempCharacter = (id: string) => {
    const updated = { ...tempCharactersRef.current };
    const name = updated[id]?.nombre || 'NPC';
    delete updated[id];
    // Remove from turn queue too
    const newQueue = turnQueue.filter(qid => qid !== id);
    let newIndex = currentTurnIndex;
    if (newIndex >= newQueue.length && newQueue.length > 0) newIndex = 0;
    setTempCharacters(updated);
    broadcastTempCharacters(updated);
    if (newQueue.length !== turnQueue.length) {
      updateGlobalCombatState(newQueue, newIndex, rondaActual, newQueue.length > 0 ? combatStarted : false);
    }
    addLog(`**[NPC]** **${name}** ha sido eliminado de la sala de combate.`);
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
    addLog(`El participante **${participants[charId]?.nombre || tempCharactersRef.current[charId]?.nombre || 'Shinobi'}** ha sido retirado de los turnos.`);
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
    const activePlayerName = participants[turnQueue[0]]?.nombre || tempCharactersRef.current[turnQueue[0]]?.nombre || 'Shinobi';
    addLog(`Es el turno de **${activePlayerName}**.`);
  };

  const resetCombat = () => {
    const newTemps: Record<string, Participant> = {};
    updateGlobalCombatState([], 0, 1, false);
    setMyBando(null);
    setMyIsInCombat(false);
    setMyCooldowns({});
    setTempCharacters(newTemps);
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
    const activeParticipantName = participants[activeCharId]?.nombre || tempCharactersRef.current[activeCharId]?.nombre || 'Shinobi';

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
    const nextPlayerName = participants[nextCharId]?.nombre || tempCharactersRef.current[nextCharId]?.nombre || 'Siguiente shinobi';
    addLog(`Es el turno de **${nextPlayerName}**.`);
  };

  // Local actions for VIT & CH
  const handleApplyDamage = () => {
    if (!localState || vitInput === '' || vitInput <= 0) return;
    const currentRes = activeCharacter?.atributos_derivados.RES || 0;
    const reduced = Math.max(1, Math.floor(vitInput * (1 - currentRes / 100)));
    const newVit = Math.max(0, localState.vit - reduced);

    const updated = { ...localState, vit: newVit };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja}** recibe ${vitInput} de daño (${reduced} tras resistencia). VIT: ${newVit}/${localState.maxVit}.`);
    setVitInput('');
  };

  const handleApplyHeal = () => {
    if (!localState || vitInput === '' || vitInput <= 0) return;
    const newVit = Math.min(localState.maxVit, localState.vit + vitInput);

    const updated = { ...localState, vit: newVit };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja}** se cura +${vitInput} VIT. VIT: ${newVit}/${localState.maxVit}.`);
    setVitInput('');
  };

  const handleSpendChakra = () => {
    if (!localState || chInput === '' || chInput <= 0) return;
    const newCh = Math.max(0, localState.ch - chInput);
    const updated = { ...localState, ch: newCh };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja}** gasta ${chInput} de CH. CH: ${newCh}/${localState.maxCh}.`);
    setChInput('');

    const percentage = (newCh / localState.maxCh) * 100;
    if (percentage < 10) {
      addLog(`**¡CRÍTICO!** Chakra de **${activeCharacter?.nombre_ninja}** es menor al 10%. Requiere Tirada de Cansancio Avanzado.`);
    } else if (percentage < 20) {
      addLog(`**¡ADVERTENCIA!** Chakra de **${activeCharacter?.nombre_ninja}** es menor al 20%. Requiere Tirada de Cansancio.`);
    }
  };

  const handleRecoverChakra = () => {
    if (!localState || chInput === '' || chInput <= 0) return;
    const newCh = Math.min(localState.maxCh, localState.ch + chInput);
    const updated = { ...localState, ch: newCh };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja}** recupera +${chInput} CH. CH: ${newCh}/${localState.maxCh}.`);
    setChInput('');
  };

  const rollDice = () => {
    if (isEventMode) {
      const roll1 = Math.floor(Math.random() * dadoInput) + 1;
      const roll2 = Math.floor(Math.random() * dadoInput) + 1;

      let finalResult = roll1;
      let formulaText = `**${activeCharacter?.nombre_ninja}** realiza una Tirada (D${dadoInput})`;

      if (rollMode === 'advantage') {
        finalResult = Math.max(roll1, roll2);
        formulaText += ` con **VENTAJA** [Dados: ${roll1}, ${roll2}] y saca: **${finalResult}**`;
      } else if (rollMode === 'disadvantage') {
        finalResult = Math.min(roll1, roll2);
        formulaText += ` con **DESVENTAJA** [Dados: ${roll1}, ${roll2}] y saca: **${finalResult}**`;
      } else {
        formulaText += ` y saca: **${finalResult}**`;
      }

      addLog(formulaText);
    } else {
      const result = Math.floor(Math.random() * dadoInput) + 1;
      addLog(`**${activeCharacter?.nombre_ninja}** realiza una Tirada de Cansancio (D${dadoInput}) y saca: **${result}**`);
    }
  };

  const rollStat = (statName: string) => {
    let targetName = activeCharacter?.nombre_ninja || 'Ninja';
    let statsSource = activeCharacter?.stats_base;

    if (rollTargetId !== 'self' && tempCharacters[rollTargetId]) {
      targetName = `[NPC] ${tempCharacters[rollTargetId].nombre}`;
      statsSource = tempCharacters[rollTargetId].stats_base as any;
    }

    if (!statsSource) return;
    const statVal = Number(statsSource[statName as keyof CharacterStats]) || 1;
    const baseMod = getStatModifier(statVal);
    const mod = baseMod + tempModifier;

    const modSign = mod >= 0 ? `+${mod}` : `${mod}`;
    const baseModSign = baseMod >= 0 ? `+${baseMod}` : `${baseMod}`;
    const tempModSign = tempModifier >= 0 ? `+${tempModifier}` : `${tempModifier}`;
    const modExplanationText = tempModifier !== 0 ? ` (${baseModSign} base ${tempModSign} temp)` : '';

    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;

    let finalDice = roll1;
    let formulaText = `**${targetName}** tira **${statName}** (d20${modSign})${modExplanationText}`;

    if (rollMode === 'advantage') {
      finalDice = Math.max(roll1, roll2);
      formulaText += ` con **VENTAJA** [Dados: ${roll1}, ${roll2}]`;
    } else if (rollMode === 'disadvantage') {
      finalDice = Math.min(roll1, roll2);
      formulaText += ` con **DESVENTAJA** [Dados: ${roll1}, ${roll2}]`;
    }

    const finalResult = finalDice + mod;
    formulaText += `: **${finalResult}** (d20: ${finalDice} ${modSign})`;

    if (finalDice === 20) {
      formulaText += ` **¡CRÍTICO!**`;
    }

    addLog(formulaText);
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

    if (!isEventMode && localState.ch < customChCost) {
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
    const newCh = isEventMode ? localState.ch : Math.max(0, localState.ch - customChCost);
    const newCooldowns = { ...myCooldowns };
    if (customCdRounds > 0) {
      newCooldowns[selectedTecnicaId] = rondaActual + customCdRounds + 1;
    }

    const updatedState = { ...localState, ch: newCh };
    setLocalState(updatedState);
    setMyCooldowns(newCooldowns);

    // Logging & Roll resolution for event mode
    let rollText = '';
    if (isEventMode) {
      let matchedStats: string[] = [];
      const desc = techWrapper?.info_glosario?.descripcion?.toUpperCase() || '';
      ['NIN', 'TAI', 'GEN', 'INT', 'FUE', 'AGI', 'EST', 'SM'].forEach(s => {
        if (desc.includes(s)) {
          matchedStats.push(s);
        }
      });

      if (matchedStats.length === 0) {
        matchedStats.push('NIN');
      }

      let bestStat = matchedStats[0];
      let bestVal = Number(activeCharacter.stats_base[bestStat as keyof CharacterStats]) || 1;
      matchedStats.forEach(s => {
        const val = Number(activeCharacter.stats_base[s as keyof CharacterStats]) || 1;
        if (val > bestVal) {
          bestVal = val;
          bestStat = s;
        }
      });

      const baseMod = getStatModifier(bestVal);
      const mod = baseMod + tempModifier;
      const modSign = mod >= 0 ? `+${mod}` : `${mod}`;
      const baseModSign = baseMod >= 0 ? `+${baseMod}` : `${baseMod}`;
      const tempModSign = tempModifier >= 0 ? `+${tempModifier}` : `${tempModifier}`;
      const modExplanationText = tempModifier !== 0 ? ` (${baseModSign} base ${tempModSign} temp)` : '';

      const roll1 = Math.floor(Math.random() * 20) + 1;
      const roll2 = Math.floor(Math.random() * 20) + 1;

      let finalDice = roll1;
      let advantageText = '';

      if (rollMode === 'advantage') {
        finalDice = Math.max(roll1, roll2);
        advantageText = ` con **VENTAJA** [Dados: ${roll1}, ${roll2}]`;
      } else if (rollMode === 'disadvantage') {
        finalDice = Math.min(roll1, roll2);
        advantageText = ` con **DESVENTAJA** [Dados: ${roll1}, ${roll2}]`;
      }

      const finalResult = finalDice + mod;
      rollText = ` | Daño / Tirada (${bestStat}): **${finalResult}** (d20: ${finalDice}${advantageText} ${modSign}${modExplanationText})${finalDice === 20 ? ' **¡CRÍTICO!**' : ''}`;
    }

    if (isEventMode) {
      addLog(`**${activeCharacter.nombre_ninja}** usa **${techName}** (CD: ${customCdRounds} rondas)${rollText}.`);
    } else {
      addLog(`**${activeCharacter.nombre_ninja}** usa **${techName}** (Coste: ${customChCost} CH | CD: ${customCdRounds} rondas). CH restante: ${newCh}/${localState.maxCh}.`);

      const percentage = (newCh / localState.maxCh) * 100;
      if (percentage < 10) {
        addLog(`**¡CRÍTICO!** Chakra de **${activeCharacter.nombre_ninja}** es menor al 10%. Requiere Tirada de Cansancio Avanzado.`);
      } else if (percentage < 20) {
        addLog(`**¡ADVERTENCIA!** Chakra de **${activeCharacter.nombre_ninja}** es menor al 20%. Requiere Tirada de Cansancio.`);
      }
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
    if (isEventMode) {
      const activeParticipantsList = Object.values(participants).map(p => ({
        id: Number(p.user_id),
        nombre_ninja: p.nombre
      }));

      return (
        <div className="min-h-screen flex flex-col relative text-oro p-4 lg:p-8 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
            style={{
              backgroundImage: `url('/assets/ui/bg-combat/bg-combat-${bgNumber}.png')`,
              filter: 'blur(4px)',
              transform: 'scale(1.03)'
            }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none z-10" />
          <div className="w-full max-w-[1400px] mx-auto relative z-20 py-6">
            <NarrationForm
              onCreated={() => setShowRegisterForm(false)}
              initialParticipants={activeParticipantsList}
            />
          </div>
        </div>
      );
    }

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
      <div className="min-h-screen flex flex-col relative text-oro p-4 lg:p-8 overflow-hidden">
        {/* Subtle blurred background layer to prevent pixelation */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
          style={{
            backgroundImage: `url('/assets/ui/bg-combat/bg-combat-${bgNumber}.png')`,
            filter: 'blur(4px)',
            transform: 'scale(1.03)'
          }}
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none z-10" />
        <div className="w-full max-w-[1400px] mx-auto relative z-20 py-6">
          <CombatForm
            onCreated={() => setShowRegisterForm(false)}
            initialData={prefilledData as any}
          />
        </div>
      </div>
    );
  }

  // Group participants by bando (merge real participants + temp characters)
  const allParticipantsMap = { ...participants, ...tempCharacters };
  const bandoAParticipants = Object.values(allParticipantsMap).filter(p => p.bando === 'A');
  const bandoBParticipants = Object.values(allParticipantsMap).filter(p => p.bando === 'B');
  const spectatorParticipants = Object.values(participants).filter(p => p.bando === null);

  const isMyTurn = combatStarted && turnQueue.length > 0 && turnQueue[currentTurnIndex] === String(activeCharacter.id);

  return (
    <div className="min-h-screen flex flex-col relative text-oro selection:bg-oro/20 overflow-hidden">
      {/* Subtle blurred background layer to prevent pixelation */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
        style={{
          backgroundImage: `url('/assets/ui/bg-combat/bg-combat-${bgNumber}.png')`,
          filter: 'blur(3px)',
          transform: 'scale(1.03)'
        }}
      />

      {/* Main room wrapper */}
      <div className="relative z-10 w-full max-w-[1800px] mx-auto p-4 lg:p-8 flex flex-col flex-1 gap-6">

        {/* HEADER AREA */}
        <header className="flex flex-col md:flex-row justify-between items-center ninja-card-oro p-6 backdrop-blur-md relative gap-4" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
            <h1 className="ninja-title text-2xl xl:text-3xl italic tracking-widest">
              {isEventMode ? 'SALA DE COMBATE DE EVENTOS: ' : 'SALA DE COMBATE: '}
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
            {isEventMode && isAdminOrNarrator && (
              <button
                onClick={() => setShowCreateTempModal(true)}
                className="ninja-btn-oro px-6 py-2.5 text-xs text-center flex items-center gap-2"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <Sparkles className="w-3.5 h-3.5 text-rojo-sangre" />
                Crear NPC Temporal
              </button>
            )}
            <button
              onClick={() => setShowRegisterForm(true)}
              className="ninja-btn-oro px-6 py-2.5 text-xs text-center"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {isEventMode ? 'Registrar Narración' : 'Registrar Combate'}
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

        {/* MUSIC AMBIENT PLAYER */}
        {canUseCombatMusic && (activeMusicVideoId || isAdminOrNarrator) && (
          <div className="ninja-card-oro p-3 flex flex-col sm:flex-row items-center gap-2 relative overflow-hidden">

            {/* YouTube embed — styled to be invisible but active in DOM to avoid browser background playback block */}
            {/* YouTube embed — styled to be invisible but active in DOM to avoid browser background playback block */}
            {activeMusicVideoId && (
              <div className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none overflow-hidden" style={{ top: '-999px', left: '-999px' }}>
                <iframe
                  ref={ytPlayerRef}
                  key={activeMusicVideoId}
                  className="w-full h-full border-0"
                  src={`https://www.youtube.com/embed/${activeMusicVideoId}?autoplay=1&loop=1&playlist=${activeMusicVideoId}&rel=0&enablejsapi=1`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  onLoad={() => {
                    // Give YouTube API a brief moment to initialize before setting initial volume and play state
                    setTimeout(() => {
                      if (ytPlayerRef.current) {
                        ytPlayerRef.current.contentWindow?.postMessage(
                          JSON.stringify({
                            event: 'command',
                            func: 'setVolume',
                            args: [musicVolume]
                          }),
                          '*'
                        );
                        ytPlayerRef.current.contentWindow?.postMessage(
                          JSON.stringify({
                            event: 'command',
                            func: musicIsPlayingRef.current ? 'playVideo' : 'pauseVideo',
                            args: []
                          }),
                          '*'
                        );
                      }
                    }, 800);
                  }}
                />
              </div>
            )}

            {/* Status indicator */}
            <div className="flex items-center gap-2 shrink-0">
              {activeMusicVideoId ? (
                <>
                  <span className={`ml-2 w-2 h-2 rounded-full shrink-0 ${musicIsPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${musicIsPlaying ? 'text-emerald-400' : 'text-amber-500'}`}>
                    {musicIsPlaying ? '♫ Reproduciendo' : '♫ Pausado'}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest">♫ Sin música</span>
              )}
            </div>

            {/* Narrator Playback Controls */}
            {activeMusicVideoId && isAdminOrNarrator && (
              <div className="flex items-center gap-1.5 border-l border-oro/10 pl-3 shrink-0">
                <button
                  onClick={() => handleSeekMusic(-10)}
                  title="Retroceder 10s"
                  className="h-7 px-2.5 bg-black/40 hover:bg-oro/10 text-oro border border-oro/20 rounded-sm transition-all inline-flex items-center justify-center shrink-0"
                >
                  <span className="text-[10px] font-black">⏪ -10s</span>
                </button>
                <button
                  onClick={handleTogglePlayMusic}
                  className="h-7 px-2.5 text-[10px] font-black bg-oro/10 hover:bg-oro/25 text-oro border border-oro/30 rounded-sm transition-all uppercase inline-flex items-center justify-center shrink-0"
                >
                  {musicIsPlaying ? "⏸ Pausar" : "▶ Play"}
                </button>
                <button
                  onClick={() => handleSeekMusic(10)}
                  title="Adelantar 10s"
                  className="h-7 px-2.5 bg-black/40 hover:bg-oro/10 text-oro border border-oro/20 rounded-sm transition-all inline-flex items-center justify-center shrink-0"
                >
                  <span className="text-[10px] font-black">+10s ⏩</span>
                </button>
              </div>
            )}

            {/* Volume control */}
            {activeMusicVideoId && (
              <div className="flex items-center gap-2 sm:flex-none sm:w-[220px] w-full">
                <span className="text-[10px] font-black text-oro/40 uppercase shrink-0">Vol.</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}

                  className="flex-1 h-1.5 accent-oro cursor-pointer"
                />
                <span className="text-[10px] font-black text-oro/60 w-6 text-left shrink-0">{musicVolume}</span>
              </div>
            )}

            {/* Admin/Narrator controls */}
            {isAdminOrNarrator && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Link de YouTube..."
                  value={musicUrlInput}
                  onChange={(e) => setMusicUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const id = extractYoutubeId(musicUrlInput.trim());
                      if (id) {
                        setActiveMusicVideoId(id);
                        broadcastMusic(id);
                        setMusicUrlInput('');
                      }
                    }
                  }}
                  className="flex-1 bg-black/50 border border-oro/20 text-oro placeholder-oro/20 px-3 py-[5px] text-xs font-black outline-none focus:border-oro transition-all rounded-sm min-w-0"
                />
                <button
                  onClick={() => {
                    const id = extractYoutubeId(musicUrlInput.trim());
                    if (id) {
                      setActiveMusicVideoId(id);
                      broadcastMusic(id);
                      setMusicUrlInput('');
                    }
                  }}
                  className="ninja-btn-oro px-3 py-[5px] text-xs font-black shrink-0"
                >
                  Poner
                </button>
                {activeMusicVideoId && (
                  <button
                    onClick={() => {
                      setActiveMusicVideoId(null);
                      broadcastMusic(null);
                    }}
                    className="ninja-btn-rojo px-3 py-[5px] text-xs shrink-0 border border-rojo-sangre/30 leading-none whitespace-nowrap"
                  >
                    Parar
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* THREE COLUMNS BATTLEGROUND */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 lg:h-[720px]">

          {/* COLUMN 1: BANDO A */}
          <div className="lg:col-span-1 flex flex-col gap-4 ninja-card-oro p-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-oro/10 pb-4 mb-2 gap-2">
              <h2 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2 shrink-0">
                BANDO A
              </h2>
              {/* Bando Selector for Self */}
              {myIsInCombat && myBando !== 'A' && (
                <button
                  onClick={() => selectBando('A')}
                  className="ninja-btn-oro py-1.5 px-4 text-xs text-center"
                >
                  Unirse
                </button>
              )}
              <span className="text-caption font-black bg-oro/10 border border-oro/30 text-oro px-2.5 py-0.5 rounded-sm shrink-0">
                {bandoAParticipants.length} ninjas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4 scrollbar-hide">
              {bandoAParticipants.map(p => {
                const isTemp = !!tempCharacters[p.user_id];
                const canControlTemp = isTemp && isAdminOrNarrator;
                return (
                  <div key={p.user_id} className={`border p-4 rounded-sm hover:border-oro/20 transition-all ${isTemp ? 'bg-purple-950/20 border-purple-500/20' : 'bg-black/40 border-oro/5'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black border border-oro/20 overflow-hidden flex items-center justify-center shrink-0">
                          {p.url_img ? (
                            <img src={p.url_img} alt="Avatar" className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="text-oro font-black text-xs">{p.nombre.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm text-oro uppercase tracking-wider truncate max-w-[120px]">{p.nombre}</div>
                          <div className="flex gap-1 flex-wrap">
                            {p.isInCombat && (
                              <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1 rounded-sm">Combatiente</span>
                            )}
                            {isTemp && (
                              <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-950/40 border border-purple-500/20 px-1 rounded-sm">NPC</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {canControlTemp && (
                        <div className="flex items-center gap-1 ml-1 shrink-0">
                          <button
                            onClick={() => {
                              const inQueue = turnQueue.includes(p.user_id);
                              let newQueue;
                              if (inQueue) {
                                newQueue = turnQueue.filter(id => id !== p.user_id);
                              } else {
                                newQueue = [...turnQueue, p.user_id];
                              }
                              let newIndex = currentTurnIndex;
                              if (newIndex >= newQueue.length && newQueue.length > 0) newIndex = 0;
                              updateGlobalCombatState(newQueue, newIndex, rondaActual, newQueue.length > 0 ? combatStarted : false);
                              addLog(`**[NPC] ${p.nombre}** ${inQueue ? 'sale del combate' : 'se une a los turnos'}.`);
                            }}
                            className={`p-1 rounded-sm transition-all ${turnQueue.includes(p.user_id) ? 'text-emerald-450 hover:text-emerald-300 hover:bg-emerald-950/20' : 'text-oro/40 hover:text-oro hover:bg-oro/10'}`}
                            title={turnQueue.includes(p.user_id) ? "Retirar del orden de turnos" : "Añadir al orden de turnos"}
                          >
                            <Play className={`w-3.5 h-3.5 ${turnQueue.includes(p.user_id) ? 'fill-emerald-400' : ''}`} />
                          </button>
                          <button
                            onClick={() => removeTempCharacter(p.user_id)}
                            className="p-1 text-red-500/40 hover:text-red-400 hover:bg-red-950/20 rounded-sm transition-all"
                            title="Eliminar NPC"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
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
                      {!isEventMode && (
                        <div>
                          <div className="flex justify-between text-[10px] font-black mb-1">
                            <span className="text-blue-400">CH</span>
                            <span>{p.estado?.ch} / {p.estado?.maxCh}</span>
                          </div>
                          <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(p.estado?.ch / p.estado?.maxCh) * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* NPC Inline Controls */}
                      {canControlTemp && (
                        <div className="flex gap-1 pt-1">
                          <input
                            type="number"
                            min="1"
                            placeholder="Cant."
                            id={`npc-vit-input-a-${p.user_id}`}
                            className="w-14 bg-black/50 border border-purple-500/20 text-oro px-2 py-1 text-[9px] font-black outline-none focus:border-purple-400 transition-all rounded-sm"
                          />
                          <button
                            onClick={() => {
                              const el = document.getElementById(`npc-vit-input-a-${p.user_id}`) as HTMLInputElement;
                              const val = parseInt(el?.value || '0');
                              if (val > 0) {
                                const newVit = Math.max(0, (p.estado?.vit ?? 0) - val);
                                updateTempCharacter(p.user_id, { estado: { ...p.estado, vit: newVit } });
                                addLog(`**[NPC] ${p.nombre}** recibe **${val}** de daño. VIT: ${newVit}/${p.estado?.maxVit}.`);
                                el.value = '';
                              }
                            }}
                            className="flex-1 py-1 text-[9px] font-black bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-950/60 transition-all rounded-sm"
                          >Daño</button>
                          <button
                            onClick={() => {
                              const el = document.getElementById(`npc-vit-input-a-${p.user_id}`) as HTMLInputElement;
                              const val = parseInt(el?.value || '0');
                              if (val > 0) {
                                const newVit = Math.min(p.estado?.maxVit ?? 0, (p.estado?.vit ?? 0) + val);
                                updateTempCharacter(p.user_id, { estado: { ...p.estado, vit: newVit } });
                                addLog(`**[NPC] ${p.nombre}** se cura **+${val}** VIT. VIT: ${newVit}/${p.estado?.maxVit}.`);
                                el.value = '';
                              }
                            }}
                            className="flex-1 py-1 text-[9px] font-black bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/60 transition-all rounded-sm"
                          >Sanar</button>
                        </div>
                      )}

                      {/* Speed & Kawarimi */}
                      {!isTemp && (
                        <div className="flex justify-between items-center text-[10px] font-black pt-2 border-t border-oro/10 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500 uppercase tracking-wider">VEL:</span>
                            <span className="text-white">{p.estado?.vel ?? 0}</span>
                          </div>
                          {!isEventMode && (
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
                          )}
                        </div>
                      )}

                      {isEventMode && (
                        <div className="space-y-2.5 pt-2 border-t border-oro/10 mt-1 animate-in fade-in duration-300">
                          {/* Traits (Rasgos) */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-oro/40 uppercase font-black block tracking-wider">Rasgos:</span>
                            {p.rasgos && p.rasgos.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.rasgos.map((r: any) => {
                                  const isSelf = String(activeCharacter?.id) === p.user_id;
                                  const canToggle = isSelf || canControlTemp;
                                  return (
                                    <button
                                      key={r.id}
                                      disabled={!canToggle}
                                      onClick={() => {
                                        if (!canToggle) return;
                                        if (isTemp) {
                                          const newRasgos = (p.rasgos || []).map((rr: any) => rr.id === r.id ? { ...rr, usado: !rr.usado } : rr);
                                          updateTempCharacter(p.user_id, { rasgos: newRasgos });
                                          addLog(`**[NPC] ${p.nombre}** marca el rasgo **${r.nombre}** como ${!r.usado ? 'usado' : 'disponible'}.`);
                                        } else if (localState) {
                                          const currentUsed = localState.usedTraits || {};
                                          const updatedUsed = { ...currentUsed, [r.id]: !currentUsed[r.id] };
                                          const updated = { ...localState, usedTraits: updatedUsed };
                                          setLocalState(updated);
                                          addLog(`**${activeCharacter.nombre_ninja}** marca el rasgo **${r.nombre}** como ${updatedUsed[r.id] ? 'usado' : 'disponible'}.`);
                                        }
                                      }}
                                      className={`px-1.5 py-0.5 border text-[9px] font-black transition-all flex items-center gap-1 rounded-sm ${r.usado
                                        ? 'bg-red-500/10 border-red-500/30 text-red-400 line-through'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                        } ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
                                      title={canToggle ? `Haga clic para cambiar estado de ${r.nombre}` : r.nombre}
                                    >
                                      <span>{r.nombre}</span>
                                      <span>{r.usado ? '✕' : '✓'}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[9px] text-oro/20 italic block">Sin rasgos</span>
                            )}
                          </div>

                          {/* Equipment (Equipo) */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-oro/40 uppercase font-black block tracking-wider">Equipo Equipado:</span>
                            {p.equipo && p.equipo.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.equipo.map((eq: any) => (
                                  <span
                                    key={eq.id}
                                    className="px-1.5 py-0.5 bg-black/40 border border-oro/10 text-[9px] font-black text-oro/70 rounded-sm"
                                  >
                                    {eq.nombre}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[9px] text-oro/20 italic block">Sin equipo equipado</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {bandoAParticipants.length === 0 && (
                <div className="text-center py-10 text-oro/20 text-xs font-black uppercase tracking-wider">Vacío</div>
              )}
            </div>
          </div>

          {/* COLUMN 2 & 3: CENTER (COMBAT CONTROLS, TURN QUEUE, AND LOGS) */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* TURN QUEUE CONTAINER */}
            <div className="ninja-card-oro p-4 relative overflow-hidden">
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
                  {myIsInCombat ? 'Salir del Combate' : 'Unirse al Combate'}
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
                  const part = allParticipantsMap[charId];
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
            <div className="ninja-card-oro p-6 flex flex-col relative overflow-hidden h-[500px] min-h-[300px] max-h-[500px]">
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
              {myIsInCombat && myBando !== 'B' && (
                <button
                  onClick={() => selectBando('B')}
                  className="ninja-btn-rojo py-1.5 px-4 text-xs text-center"
                >
                  Unirse
                </button>
              )}
              <span className="text-caption font-black bg-oro/10 border border-oro/30 text-oro px-2.5 py-0.5 rounded-sm shrink-0">
                {bandoBParticipants.length} ninjas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4 scrollbar-hide">
              {bandoBParticipants.map(p => {
                const isTemp = !!tempCharacters[p.user_id];
                const canControlTemp = isTemp && isAdminOrNarrator;
                return (
                  <div key={p.user_id} className={`border p-4 rounded-sm hover:border-oro/20 transition-all ${isTemp ? 'bg-purple-950/20 border-purple-500/20' : 'bg-black/40 border-oro/5'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black border border-oro/20 overflow-hidden flex items-center justify-center shrink-0">
                          {p.url_img ? (
                            <img src={p.url_img} alt="Avatar" className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="text-oro font-black text-xs">{p.nombre.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm text-oro uppercase tracking-wider truncate max-w-[120px]">{p.nombre}</div>
                          <div className="flex gap-1 flex-wrap">
                            {p.isInCombat && (
                              <span className="text-[9px] font-black uppercase text-red-400 bg-red-950/40 border border-red-500/20 px-1 rounded-sm">Combatiente</span>
                            )}
                            {isTemp && (
                              <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-950/40 border border-purple-500/20 px-1 rounded-sm">NPC</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {canControlTemp && (
                        <div className="flex items-center gap-1 ml-1 shrink-0">
                          <button
                            onClick={() => {
                              const inQueue = turnQueue.includes(p.user_id);
                              let newQueue;
                              if (inQueue) {
                                newQueue = turnQueue.filter(id => id !== p.user_id);
                              } else {
                                newQueue = [...turnQueue, p.user_id];
                              }
                              let newIndex = currentTurnIndex;
                              if (newIndex >= newQueue.length && newQueue.length > 0) newIndex = 0;
                              updateGlobalCombatState(newQueue, newIndex, rondaActual, newQueue.length > 0 ? combatStarted : false);
                              addLog(`**[NPC] ${p.nombre}** ${inQueue ? 'sale del combate' : 'se une a los turnos'}.`);
                            }}
                            className={`p-1 rounded-sm transition-all ${turnQueue.includes(p.user_id) ? 'text-emerald-450 hover:text-emerald-300 hover:bg-emerald-950/20' : 'text-oro/40 hover:text-oro hover:bg-oro/10'}`}
                            title={turnQueue.includes(p.user_id) ? "Retirar del orden de turnos" : "Añadir al orden de turnos"}
                          >
                            <Play className={`w-3.5 h-3.5 ${turnQueue.includes(p.user_id) ? 'fill-emerald-400' : ''}`} />
                          </button>
                          <button
                            onClick={() => removeTempCharacter(p.user_id)}
                            className="p-1 text-red-500/40 hover:text-red-400 hover:bg-red-950/20 rounded-sm transition-all"
                            title="Eliminar NPC"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
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
                      {!isEventMode && (
                        <div>
                          <div className="flex justify-between text-[10px] font-black mb-1">
                            <span className="text-blue-400">CH</span>
                            <span>{p.estado?.ch} / {p.estado?.maxCh}</span>
                          </div>
                          <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(p.estado?.ch / p.estado?.maxCh) * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* NPC Inline Controls */}
                      {canControlTemp && (
                        <div className="flex gap-1 pt-1">
                          <input
                            type="number"
                            min="1"
                            placeholder="Cant."
                            id={`npc-vit-input-b-${p.user_id}`}
                            className="w-14 bg-black/50 border border-purple-500/20 text-oro px-2 py-1 text-[9px] font-black outline-none focus:border-purple-400 transition-all rounded-sm"
                          />
                          <button
                            onClick={() => {
                              const el = document.getElementById(`npc-vit-input-b-${p.user_id}`) as HTMLInputElement;
                              const val = parseInt(el?.value || '0');
                              if (val > 0) {
                                const newVit = Math.max(0, (p.estado?.vit ?? 0) - val);
                                updateTempCharacter(p.user_id, { estado: { ...p.estado, vit: newVit } });
                                addLog(`**[NPC] ${p.nombre}** recibe **${val}** de daño. VIT: ${newVit}/${p.estado?.maxVit}.`);
                                el.value = '';
                              }
                            }}
                            className="flex-1 py-1 text-[9px] font-black bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-950/60 transition-all rounded-sm"
                          >Daño</button>
                          <button
                            onClick={() => {
                              const el = document.getElementById(`npc-vit-input-b-${p.user_id}`) as HTMLInputElement;
                              const val = parseInt(el?.value || '0');
                              if (val > 0) {
                                const newVit = Math.min(p.estado?.maxVit ?? 0, (p.estado?.vit ?? 0) + val);
                                updateTempCharacter(p.user_id, { estado: { ...p.estado, vit: newVit } });
                                addLog(`**[NPC] ${p.nombre}** se cura **+${val}** VIT. VIT: ${newVit}/${p.estado?.maxVit}.`);
                                el.value = '';
                              }
                            }}
                            className="flex-1 py-1 text-[9px] font-black bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/60 transition-all rounded-sm"
                          >Sanar</button>
                        </div>
                      )}

                      {!isTemp && (
                        <div className="flex justify-between items-center text-[10px] font-black pt-2 border-t border-oro/10 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500 uppercase tracking-wider">VEL:</span>
                            <span className="text-white">{p.estado?.vel ?? 0}</span>
                          </div>
                          {!isEventMode && (
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
                          )}
                        </div>
                      )}

                      {isEventMode && (
                        <div className="space-y-2.5 pt-2 border-t border-oro/10 mt-1 animate-in fade-in duration-300">
                          <div className="space-y-1">
                            <span className="text-[9px] text-oro/40 uppercase font-black block tracking-wider">Rasgos:</span>
                            {p.rasgos && p.rasgos.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.rasgos.map((r: any) => {
                                  const isSelf = String(activeCharacter?.id) === p.user_id;
                                  const canToggle = isSelf || canControlTemp;
                                  return (
                                    <button
                                      key={r.id}
                                      disabled={!canToggle}
                                      onClick={() => {
                                        if (!canToggle) return;
                                        if (isTemp) {
                                          const newRasgos = (p.rasgos || []).map((rr: any) => rr.id === r.id ? { ...rr, usado: !rr.usado } : rr);
                                          updateTempCharacter(p.user_id, { rasgos: newRasgos });
                                          addLog(`**[NPC] ${p.nombre}** marca el rasgo **${r.nombre}** como ${!r.usado ? 'usado' : 'disponible'}.`);
                                        } else if (localState) {
                                          const currentUsed = localState.usedTraits || {};
                                          const updatedUsed = { ...currentUsed, [r.id]: !currentUsed[r.id] };
                                          setLocalState({ ...localState, usedTraits: updatedUsed });
                                          addLog(`**${activeCharacter.nombre_ninja}** marca el rasgo **${r.nombre}** como ${updatedUsed[r.id] ? 'usado' : 'disponible'}.`);
                                        }
                                      }}
                                      className={`px-1.5 py-0.5 border text-[9px] font-black transition-all flex items-center gap-1 rounded-sm ${r.usado ? 'bg-red-500/10 border-red-500/30 text-red-400 line-through' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'} ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
                                      title={canToggle ? `Haga clic para cambiar estado de ${r.nombre}` : r.nombre}
                                    >
                                      <span>{r.nombre}</span>
                                      <span>{r.usado ? '✕' : '✓'}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[9px] text-oro/20 italic block">Sin rasgos</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-oro/40 uppercase font-black block tracking-wider">Equipo Equipado:</span>
                            {p.equipo && p.equipo.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.equipo.map((eq: any) => (
                                  <span key={eq.id} className="px-1.5 py-0.5 bg-black/40 border border-oro/10 text-[9px] font-black text-oro/70 rounded-sm">{eq.nombre}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[9px] text-oro/20 italic block">Sin equipo equipado</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

                  {!isEventMode && (
                    <div>
                      <div className="flex justify-between text-xs font-black mb-1.5">
                        <span className="text-blue-400">CHAKRA (CH)</span>
                        <span>{localState.ch} / {localState.maxCh}</span>
                      </div>
                      <div className="h-4 bg-black/60 border border-oro/15 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300" style={{ width: `${(localState.ch / localState.maxCh) * 100}%` }} />
                      </div>
                    </div>
                  )}

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
                {/* Adjust Life (VIT) */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Vida (Cant.)"
                    value={vitInput}
                    onChange={(e) => setVitInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-1/3 bg-black/50 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                  />
                  <button
                    onClick={handleApplyDamage}
                    className="ninja-btn-rojo flex-1 py-2 text-xs text-center font-black"
                  >
                    Recibir
                  </button>
                  <button
                    onClick={handleApplyHeal}
                    className="ninja-btn-oro flex-1 py-2 text-xs text-center font-black"
                  >
                    Sanar
                  </button>
                </div>

                {/* Adjust Chakra (CH) */}
                {!isEventMode && (
                  <div className="flex gap-2 pt-3 border-t border-oro/10">
                    <input
                      type="number"
                      min="0"
                      placeholder="Chakra (Cant.)"
                      value={chInput}
                      onChange={(e) => setChInput(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-1/3 bg-black/50 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                    />
                    <button
                      onClick={handleSpendChakra}
                      className="ninja-btn-rojo flex-1 py-2 text-xs text-center font-black"
                    >
                      Gastar
                    </button>
                    <button
                      onClick={handleRecoverChakra}
                      className="ninja-btn-oro flex-1 py-2 text-xs text-center font-black"
                    >
                      Recuperar
                    </button>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-oro/10">
                  <div className="flex items-center w-2/3 bg-black/50 border border-oro/20 px-3 focus-within:border-oro transition-all">
                    <span className="text-oro/40 font-mono text-xs mr-2 whitespace-nowrap">{isEventMode ? "Dados (D)" : "Cansancio (D)"}</span>
                    <input
                      type="number"
                      value={dadoInput}
                      onChange={(e) => setDadoInput(Number(e.target.value))}
                      className="bg-transparent text-oro text-xs font-black outline-none w-full py-2"
                    />
                  </div>
                  <button
                    onClick={rollDice}
                    className="ninja-btn-oro flex-1 py-2 text-xs flex items-center justify-center gap-2 font-black"
                  >
                    <Dices className="w-4 h-4 text-rojo-sangre" /> Tirar
                  </button>
                </div>

                {isEventMode && (
                  <>
                    <div className="flex gap-2 pt-3 border-t border-oro/10 justify-between">
                      <button
                        onClick={() => setRollMode('normal')}
                        className={`flex-1 py-1.5 px-3 text-[10px] font-black uppercase tracking-widest transition-all border ${rollMode === 'normal'
                          ? 'bg-oro text-black border-oro shadow-md shadow-oro/5'
                          : 'border-oro/10 text-oro/60 bg-black/20'
                          }`}
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                      >
                        Normal
                      </button>
                      <button
                        onClick={() => setRollMode('advantage')}
                        className={`flex-1 py-1.5 px-3 text-[10px] font-black uppercase tracking-widest transition-all border ${rollMode === 'advantage'
                          ? 'bg-oro text-black border-oro shadow-md shadow-oro/5'
                          : 'border-oro/10 text-oro/60 bg-black/20'
                          }`}
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                      >
                        Ventaja
                      </button>
                      <button
                        onClick={() => setRollMode('disadvantage')}
                        className={`flex-1 py-1.5 px-3 text-[10px] font-black uppercase tracking-widest transition-all border ${rollMode === 'disadvantage'
                          ? 'bg-oro text-black border-oro shadow-md shadow-oro/5'
                          : 'border-oro/10 text-oro/60 bg-black/20'
                          }`}
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                      >
                        Desventaja
                      </button>
                    </div>

                    {/* Bonificador Temporal */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-oro/10 animate-in fade-in duration-300">
                      <span className="text-[10px] font-black text-oro/40 uppercase tracking-wider whitespace-nowrap">Modificador Temporal:</span>
                      <div className="flex items-center bg-black/50 border border-oro/20 rounded-sm overflow-hidden w-28 px-2 focus-within:border-oro transition-all">
                        <button
                          onClick={() => setTempModifier(prev => prev - 1)}
                          className="text-oro hover:text-white font-black px-1.5 py-1 text-xs select-none"
                          type="button"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={tempModifier}
                          onChange={(e) => setTempModifier(Number(e.target.value) || 0)}
                          className="bg-transparent text-center text-white text-xs font-black w-full outline-none py-1 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => setTempModifier(prev => prev + 1)}
                          className="text-oro hover:text-white font-black px-1.5 py-1 text-xs select-none"
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {isAdminOrNarrator && Object.keys(tempCharacters).length > 0 && (
                      <div className="pt-3 border-t border-oro/10 flex items-center justify-between gap-3 animate-in fade-in duration-300">
                        <span className="text-[10px] font-black text-oro/40 uppercase tracking-wider whitespace-nowrap">Tirar Como:</span>
                        <select
                          value={rollTargetId}
                          onChange={(e) => setRollTargetId(e.target.value)}
                          className="bg-black/50 border border-oro/20 text-oro text-xs font-black px-2 py-1 outline-none focus:border-oro transition-all rounded-sm max-w-[150px]"
                        >
                          <option value="self">Mi Ninja ({activeCharacter.nombre_ninja})</option>
                          {Object.values(tempCharacters).map(tc => (
                            <option key={tc.user_id} value={tc.user_id}>{tc.nombre}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="pt-3 border-t border-oro/10 space-y-2 animate-in fade-in duration-300">
                      <span className="text-[10px] font-black text-oro/40 block uppercase ml-1">Tiradas de Atributos (d20)</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {['NIN', 'TAI', 'GEN', 'INT', 'FUE', 'AGI', 'EST', 'SM'].map((s) => {
                          let val = activeCharacter.stats_base[s as keyof CharacterStats] || 1;
                          if (rollTargetId !== 'self' && tempCharacters[rollTargetId]) {
                            val = tempCharacters[rollTargetId].stats_base?.[s] || 1;
                          }
                          const mod = getStatModifier(val);
                          const modSign = mod >= 0 ? `+${mod}` : `${mod}`;
                          return (
                            <button
                              key={s}
                              onClick={() => rollStat(s)}
                              className="bg-black/40 border border-oro/15 hover:border-oro py-1 text-[10px] font-black text-oro hover:bg-oro/10 transition-all flex flex-col items-center justify-center rounded-sm"
                              title={`Tirar D20 + Modificador de ${s} (${modSign})`}
                            >
                              <span className="text-white/80">{s}</span>
                              <span className="text-[9px] text-oro/60 font-bold">{modSign}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
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
                        {tecnicaSearch.trim() === '' ? (
                          <div className="px-4 py-4 text-xs text-oro/40 italic text-center">
                            Escribe para buscar una técnica...
                          </div>
                        ) : (
                          <>
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
                                      setCustomChCost(0);
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
                          </>
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

        {/* CREATE NPC MODAL */}
        {showCreateTempModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
            <div
              className="w-full max-w-2xl bg-[#0d0e12] border border-oro/30 shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
              style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
            >
              <h2 className="ninja-title text-xl font-black text-oro uppercase tracking-[0.2em] mb-6 pb-3 border-b border-oro/20 flex items-center gap-2">
                CREAR NPC TEMPORAL
              </h2>

              <div className="space-y-6">
                {/* Basic Details: Name, Bando, VIT */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">Nombre del NPC *</label>
                    <input
                      type="text"
                      placeholder="Ej. Invocación de Serpiente"
                      value={npcName}
                      onChange={(e) => setNpcName(e.target.value)}
                      className="w-full bg-black/40 border border-oro/20 text-white px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">Bando *</label>
                    <select
                      value={npcBando}
                      onChange={(e) => setNpcBando(e.target.value as 'A' | 'B')}
                      className="w-full bg-black/40 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all rounded-sm"
                    >
                      <option value="A">Bando A</option>
                      <option value="B">Bando B</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">Vitalidad (VIT) *</label>
                    <input
                      type="number"
                      min="1"
                      value={npcVit}
                      onChange={(e) => setNpcVit(Math.max(1, Number(e.target.value) || 0))}
                      className="w-full bg-black/40 border border-oro/20 text-white px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all rounded-sm"
                    />
                  </div>
                </div>

                {/* Stats Base Grid */}
                <div>
                  <h3 className="text-[11px] font-black text-oro/40 uppercase tracking-widest mb-3 border-b border-oro/5 pb-1">Atributos Base (1-10)</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {['NIN', 'TAI', 'GEN', 'INT', 'FUE', 'AGI', 'EST', 'SM'].map((s) => (
                      <div key={s} className="bg-black/30 border border-oro/10 p-2 flex flex-col items-center justify-center rounded-sm">
                        <label className="text-[9px] font-black text-white/60 mb-1">{s}</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={npcStats[s] || 3}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                            setNpcStats(prev => ({ ...prev, [s]: val }));
                          }}
                          className="w-10 bg-transparent text-center text-oro text-xs font-black outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Traits Selector */}
                <div>
                  <h3 className="text-[11px] font-black text-oro/40 uppercase tracking-widest mb-3 border-b border-oro/5 pb-1">Rasgos</h3>

                  {/* Selected traits list */}
                  {npcRasgos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-black/20 border border-oro/5 rounded-sm">
                      {npcRasgos.map(r => (
                        <button
                          key={r.id}
                          onClick={() => setNpcRasgos(prev => prev.filter(t => t.id !== r.id))}
                          className="px-2 py-0.5 bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[10px] font-black flex items-center gap-1 hover:border-red-500/50 hover:text-red-400 rounded-sm transition-all"
                          title="Click para quitar rasgo"
                        >
                          <span>{r.nombre}</span>
                          <span className="text-[9px] font-mono">✕</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search and custom input */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar rasgo oficial..."
                        value={traitSearch}
                        onChange={(e) => setTraitSearch(e.target.value)}
                        className="w-full bg-black/40 border border-oro/20 text-white px-3 py-1.5 text-xs outline-none focus:border-oro transition-all rounded-sm"
                      />
                      {traitSearch.trim() !== '' && (
                        <div className="absolute z-10 left-0 right-0 mt-1 bg-black/95 border border-oro/20 max-h-40 overflow-y-auto rounded-sm shadow-xl custom-scrollbar">
                          {masterTraits
                            .filter(t => t.nombre.toLowerCase().includes(traitSearch.toLowerCase()) && !npcRasgos.some(nr => nr.id === t.id))
                            .slice(0, 10)
                            .map(t => (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setNpcRasgos(prev => [...prev, { id: t.id, nombre: t.nombre, usado: false }]);
                                  setTraitSearch('');
                                }}
                                className="px-3 py-2 text-xs font-black text-white/80 hover:bg-oro/10 hover:text-oro cursor-pointer border-b border-oro/5 last:border-0"
                              >
                                {t.nombre}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Crear rasgo personalizado..."
                        value={customTrait}
                        onChange={(e) => setCustomTrait(e.target.value)}
                        className="flex-1 bg-black/40 border border-oro/20 text-white px-3 py-1.5 text-xs outline-none focus:border-oro transition-all rounded-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customTrait.trim()) {
                            setNpcRasgos(prev => [...prev, { id: `custom_${Date.now()}_${Math.random()}`, nombre: customTrait.trim(), usado: false }]);
                            setCustomTrait('');
                          }
                        }}
                        className="ninja-btn-oro px-3 py-1.5 text-xs font-black rounded-sm"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items/Equipment Selector */}
                <div>
                  <h3 className="text-[11px] font-black text-oro/40 uppercase tracking-widest mb-3 border-b border-oro/5 pb-1">Equipamiento</h3>

                  {/* Selected items list */}
                  {npcEquipo.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-black/20 border border-oro/5 rounded-sm">
                      {npcEquipo.map(eq => (
                        <button
                          key={eq.id}
                          onClick={() => setNpcEquipo(prev => prev.filter(item => item.id !== eq.id))}
                          className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] font-black flex items-center gap-1 hover:border-red-500/50 hover:text-red-400 rounded-sm transition-all"
                          title="Click para quitar objeto"
                        >
                          <span>{eq.nombre}</span>
                          <span className="text-[9px] font-mono">✕</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search and custom input */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar objeto oficial..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full bg-black/40 border border-oro/20 text-white px-3 py-1.5 text-xs outline-none focus:border-oro transition-all rounded-sm"
                      />
                      {itemSearch.trim() !== '' && (
                        <div className="absolute z-10 left-0 right-0 mt-1 bg-black/95 border border-oro/20 max-h-40 overflow-y-auto rounded-sm shadow-xl custom-scrollbar">
                          {masterItems
                            .filter(i => i.nombre_es.toLowerCase().includes(itemSearch.toLowerCase()) && !npcEquipo.some(ne => ne.id === i.id))
                            .slice(0, 10)
                            .map(i => (
                              <div
                                key={i.id}
                                onClick={() => {
                                  setNpcEquipo(prev => [...prev, { id: i.id, nombre: i.nombre_es }]);
                                  setItemSearch('');
                                }}
                                className="px-3 py-2 text-xs font-black text-white/80 hover:bg-oro/10 hover:text-oro cursor-pointer border-b border-oro/5 last:border-0"
                              >
                                {i.nombre_es}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Crear objeto personalizado..."
                        value={customItem}
                        onChange={(e) => setCustomItem(e.target.value)}
                        className="flex-1 bg-black/40 border border-oro/20 text-white px-3 py-1.5 text-xs outline-none focus:border-oro transition-all rounded-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customItem.trim()) {
                            setNpcEquipo(prev => [...prev, { id: `custom_${Date.now()}_${Math.random()}`, nombre: customItem.trim() }]);
                            setCustomItem('');
                          }
                        }}
                        className="ninja-btn-oro px-3 py-1.5 text-xs font-black rounded-sm"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Footer Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-oro/15 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTempModal(false);
                      // Reset form values
                      setNpcName('');
                      setNpcBando('A');
                      setNpcVit(30);
                      setNpcStats({ NIN: 3, TAI: 3, GEN: 3, INT: 3, FUE: 3, AGI: 3, EST: 3, SM: 3 });
                      setNpcRasgos([]);
                      setNpcEquipo([]);
                      setTraitSearch('');
                      setItemSearch('');
                      setCustomTrait('');
                      setCustomItem('');
                    }}
                    className="ninja-btn-ghost px-5 py-2 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!npcName.trim()) {
                        addToast("Debe ingresar un nombre para el NPC.", "error");
                        return;
                      }
                      const id = `temp_${Date.now()}`;
                      const tempChar: Participant = {
                        user_id: id,
                        nombre: npcName.trim(),
                        url_img: undefined,
                        estado: {
                          vit: npcVit,
                          maxVit: npcVit,
                          ch: 0,
                          maxCh: 0,
                          vel: 0,
                          kawarimi: 0,
                          maxKawarimi: 0
                        },
                        bando: npcBando,
                        isInCombat: true,
                        rasgos: npcRasgos as any,
                        equipo: npcEquipo as any,
                        stats_base: npcStats
                      };
                      createTempCharacter(tempChar);
                      setShowCreateTempModal(false);

                      // Reset values
                      setNpcName('');
                      setNpcBando('A');
                      setNpcVit(30);
                      setNpcStats({ NIN: 3, TAI: 3, GEN: 3, INT: 3, FUE: 3, AGI: 3, EST: 3, SM: 3 });
                      setNpcRasgos([]);
                      setNpcEquipo([]);
                      setTraitSearch('');
                      setItemSearch('');
                      setCustomTrait('');
                      setCustomItem('');
                    }}
                    className="ninja-btn-oro px-6 py-2 text-xs flex items-center gap-1.5"
                  >
                    Crear NPC
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
