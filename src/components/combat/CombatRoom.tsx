'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useCharacterStore } from '@/store/useCharacterStore';
import { ProfileService } from '@/services/supabase/profile.service';
import {
  Dices, Users, Play,
  RotateCcw, ChevronUp, ChevronDown,
  Trash2, Copy, Sparkles, Eye, EyeOff, RefreshCw, Image as ImageIcon, Pencil
} from 'lucide-react';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CombatForm from '@/components/registros/CombatForm';
import NarrationForm from '@/components/registros/NarrationForm';
import { CharacterStats } from '@/domain/types';
import { searchIncludes } from '@/lib/utils/search';
import { NinjaSelect } from '@/components/ui/Fields';

interface CombatState {
  vit: number;
  maxVit: number;
  ch: number;
  maxCh: number;
  vel: number;
  kawarimi: number;
  maxKawarimi: number;
  usedTraits?: Record<number | string, boolean>;
  usedItems?: Record<number | string, boolean>;
  chConstanteActive?: boolean;
  chConstanteCost?: number;
}

interface Participant {
  user_id: string;
  nombre: string;
  url_img?: string;
  estado: CombatState;
  bando: 'A' | 'B' | null;
  isInCombat: boolean;
  cooldowns?: Array<{ id: number; nombre: string; reusableAtRound: number }>;
  tecnicasActivas?: Array<{ id: number; nombre: string; cdRounds: number }>;
  rasgos?: Array<{ id: number | string; nombre: string; usado: boolean }>;
  equipo?: Array<{ id: number | string; nombre: string }>;
  equipoSinHueco?: Array<{ id: number | string; nombre: string; usado: boolean }>;
  stats_base?: Record<string, number>; // Added for temp characters
  ocultar_vit?: boolean;
}

interface GridElement {
  id: string;
  name: string;
  color: string;
  cells: string[];
  durationUnit: 'rondas' | 'acciones';
  durationValue: number;
  createdByName: string;
  createdById?: string;
  createdInTurnKey?: string;
}

interface GridConfig {
  width: number;
  height: number;
}

export default function CombatRoom({ roomId }: { roomId: string }) {
  const { activeCharacter, fetchActiveCharacter, loading: characterLoading } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const confirm = useConfirmStore(state => state.confirm);
  const searchParams = useSearchParams();
  const isEventMode = roomId.endsWith('-E') || (searchParams ? searchParams.get('mode') === 'event' : false);
  const canUseCombatMusic = isEventMode;

  const [userProfile, setUserProfile] = useState<{ id: string; username: string; url_avatar?: string } | null>(null);
  const [rolesLoaded, setRolesLoaded] = useState(false);

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

  const toggleConstantCh = (active: boolean) => {
    if (!activeCharacter || !localState) return;

    setLocalState(prev => prev ? { ...prev, chConstanteActive: active } : null);
    addLog(`**${activeCharacter.nombre_ninja}** ${active ? 'activa' : 'desactiva'} el consumo de chakra constante.`);
  };

  // Global Combat state (synced via Broadcast)
  const [turnQueue, setTurnQueue] = useState<string[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [rondaActual, setRondaActual] = useState(1);
  const [combatStarted, setCombatStarted] = useState(false);
  const [turnStartTime, setTurnStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

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
  const [isConstantCh, setIsConstantCh] = useState(false);
  const [constantChCost, setConstantChCost] = useState<number>(0);
  const [isTechActive, setIsTechActive] = useState(false);
  const [myActiveTecnicas, setMyActiveTecnicas] = useState<Record<number, { cdRounds: number }>>({});
  const [isActiveDropdownOpen, setIsActiveDropdownOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCdDropdownOpen, setIsCdDropdownOpen] = useState(false);
  const [bgNumber, setBgNumber] = useState<number>(1);
  const [isAdminOrNarrator, setIsAdminOrNarrator] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [tempCharacters, setTempCharacters] = useState<Record<string, Participant>>({});
  const tempCharactersRef = useRef(tempCharacters);
  const [masterTraits, setMasterTraits] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [showCreateTempModal, setShowCreateTempModal] = useState(false);
  const [rollTargetId, setRollTargetId] = useState<string>('self');
  const [activeConsoleMode, setActiveConsoleMode] = useState<'jugador' | 'narrador'>('jugador');

  // PvE Log Image State
  const [logImageUrl, setLogImageUrl] = useState('');
  const [logImageCaption, setLogImageCaption] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedImage) {
        setExpandedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedImage]);

  const handleSendImageToLog = () => {
    if (!logImageUrl.trim()) {
      addToast("Introduce una URL de imagen válida.", "error");
      return;
    }
    const url = logImageUrl.trim();
    const caption = logImageCaption.trim();
    const captionText = caption ? ` - **${caption}**` : '';
    addLog(`**[IMAGEN]**${captionText}\n[IMG:${url}]`);
    setLogImageUrl('');
    setLogImageCaption('');
  };

  // PvP Combat Area Grid State
  const [pvpTab, setPvpTab] = useState<'logs' | 'grid'>('logs');
  const [gridConfig, setGridConfig] = useState<GridConfig | null>(null);
  const [gridElements, setGridElements] = useState<GridElement[]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [elementNameInput, setElementNameInput] = useState('');
  const [elementDurationUnit, setElementDurationUnit] = useState<'rondas' | 'acciones'>('rondas');
  const [elementDurationVal, setElementDurationVal] = useState<number>(3);
  const [gridWidthInput, setGridWidthInput] = useState<number>(10);
  const [gridHeightInput, setGridHeightInput] = useState<number>(10);
  const [gridZoom, setGridZoom] = useState<number>(1);

  const handleZoomIn = () => setGridZoom(prev => Math.min(2.5, +(prev + 0.1).toFixed(1)));
  const handleZoomOut = () => setGridZoom(prev => Math.max(0.2, +(prev - 0.1).toFixed(1)));
  const handleResetZoom = () => setGridZoom(1);

  const gridConfigRef = useRef(gridConfig);
  const gridElementsRef = useRef(gridElements);
  useEffect(() => { gridConfigRef.current = gridConfig; }, [gridConfig]);
  useEffect(() => { gridElementsRef.current = gridElements; }, [gridElements]);

  const ELEMENT_COLORS = [
    '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
    '#14b8a6', '#d946ef'
  ];

  const getRandomElementColor = () => {
    const randomIndex = Math.floor(Math.random() * ELEMENT_COLORS.length);
    return ELEMENT_COLORS[randomIndex];
  };

  const getCellLabel = (row: number, col: number) => {
    let rowLetter = '';
    let temp = row;
    while (temp >= 0) {
      rowLetter = String.fromCharCode(65 + (temp % 26)) + rowLetter;
      temp = Math.floor(temp / 26) - 1;
    }
    return `${rowLetter}${col + 1}`;
  };

  const broadcastGridState = (config: GridConfig | null, elements: GridElement[]) => {
    sendBroadcast('grid_state_update', {
      gridConfig: config,
      gridElements: elements,
      senderId: currentActorId
    });
  };

  const processTerrainDecay = (
    elements: GridElement[],
    options: { advanceAction: boolean; roundsAdvanced: number; currentTurnKey: string }
  ) => {
    if (elements.length === 0) return { updatedElements: [], expiredNames: [] };

    const expiredNames: string[] = [];
    const updatedElements: GridElement[] = [];

    elements.forEach(el => {
      // If created in this exact turn, preserve duration on this placement pass and clear key
      if (el.createdInTurnKey && el.createdInTurnKey === options.currentTurnKey) {
        updatedElements.push({ ...el, createdInTurnKey: undefined });
        return;
      }

      let val = el.durationValue;
      let isExpired = false;

      if (el.durationUnit === 'acciones' && options.advanceAction) {
        val -= 1;
        if (val < 0) isExpired = true;
      } else if (el.durationUnit === 'rondas' && options.roundsAdvanced > 0) {
        val -= options.roundsAdvanced;
        if (val < 0) isExpired = true;
      }

      if (isExpired) {
        if (!expiredNames.includes(el.name)) {
          expiredNames.push(el.name);
        }
      } else {
        updatedElements.push({ ...el, durationValue: val, createdInTurnKey: undefined });
      }
    });

    return { updatedElements, expiredNames };
  };

  // Drag selection state for Grid
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDown(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleCellMouseDown = (cellKey: string) => {
    setIsMouseDown(true);
    if (selectedCells.includes(cellKey)) {
      setDragMode('deselect');
      setSelectedCells(prev => prev.filter(c => c !== cellKey));
    } else {
      setDragMode('select');
      setSelectedCells(prev => [...prev, cellKey]);
    }
  };

  const handleCellMouseEnter = (cellKey: string) => {
    if (!isMouseDown) return;
    if (dragMode === 'select') {
      if (!selectedCells.includes(cellKey)) {
        setSelectedCells(prev => [...prev, cellKey]);
      }
    } else {
      if (selectedCells.includes(cellKey)) {
        setSelectedCells(prev => prev.filter(c => c !== cellKey));
      }
    }
  };

  // Dynamic Damage Calculator State
  const [calcStats, setCalcStats] = useState<{ id: string; stat: string; val: number; multInput: string }[]>([
    { id: 'stat-1', stat: 'NIN', val: 1, multInput: '1' }
  ]);
  const [calcWeapons, setCalcWeapons] = useState<{ id: string; damage: number }[]>([]);
  const [calcPercents, setCalcPercents] = useState<{ id: string; percent: number }[]>([]);

  useEffect(() => {
    if (activeCharacter?.stats_base) {
      setCalcStats(prev => prev.map(item => {
        const baseVal = Number(activeCharacter.stats_base[item.stat as keyof CharacterStats]) || 1;
        return { ...item, val: baseVal };
      }));
    }
  }, [activeCharacter]);

  const addCalcStat = () => {
    const defaultStat = 'TAI';
    const baseVal = activeCharacter?.stats_base
      ? Number(activeCharacter.stats_base[defaultStat as keyof CharacterStats]) || 1
      : 1;
    setCalcStats(prev => [...prev, { id: `stat-${Date.now()}-${Math.random()}`, stat: defaultStat, val: baseVal, multInput: '1' }]);
  };

  const updateCalcStatName = (id: string, newStat: string) => {
    const baseVal = activeCharacter?.stats_base
      ? Number(activeCharacter.stats_base[newStat as keyof CharacterStats]) || 1
      : 1;
    setCalcStats(prev => prev.map(item => item.id === id ? { ...item, stat: newStat, val: baseVal } : item));
  };

  const updateCalcStatVal = (id: string, val: number) => {
    setCalcStats(prev => prev.map(item => item.id === id ? { ...item, val } : item));
  };

  const updateCalcStatMult = (id: string, multInput: string) => {
    setCalcStats(prev => prev.map(item => item.id === id ? { ...item, multInput } : item));
  };

  const removeCalcStat = (id: string) => {
    setCalcStats(prev => prev.filter(item => item.id !== id));
  };

  const addCalcWeapon = () => {
    setCalcWeapons(prev => [...prev, { id: `weapon-${Date.now()}-${Math.random()}`, damage: 0 }]);
  };

  const updateCalcWeapon = (id: string, damage: number) => {
    setCalcWeapons(prev => prev.map(item => item.id === id ? { ...item, damage } : item));
  };

  const removeCalcWeapon = (id: string) => {
    setCalcWeapons(prev => prev.filter(item => item.id !== id));
  };

  const addCalcPercent = () => {
    setCalcPercents(prev => [...prev, { id: `percent-${Date.now()}-${Math.random()}`, percent: 0 }]);
  };

  const updateCalcPercent = (id: string, percent: number) => {
    setCalcPercents(prev => prev.map(item => item.id === id ? { ...item, percent } : item));
  };

  const removeCalcPercent = (id: string) => {
    setCalcPercents(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotalDamage = () => {
    const statsDamage = calcStats.reduce((sum, item) => {
      const mult = parseFloat(item.multInput.replace(',', '.')) || 0;
      return sum + (item.val * mult);
    }, 0);

    const weaponsDamage = calcWeapons.reduce((sum, item) => sum + (item.damage || 0), 0);

    const subtotal = statsDamage + weaponsDamage;

    const totalPercent = calcPercents.reduce((sum, item) => sum + (item.percent || 0), 0);

    const rawTotal = subtotal * (1 + totalPercent / 100);
    if (rawTotal <= 0) return 0;
    return Math.ceil(rawTotal / 5) * 5;
  };

  // NPC Form States
  const [npcName, setNpcName] = useState('');
  const [npcUrlImg, setNpcUrlImg] = useState('');
  const [npcBando, setNpcBando] = useState<'A' | 'B'>('A');
  const [npcVit, setNpcVit] = useState<number>(30);
  const [npcStats, setNpcStats] = useState<Record<string, number>>({
    NIN: 3, TAI: 3, GEN: 3, INT: 3, FUE: 3, AGI: 3, EST: 3, SM: 3
  });
  const [npcRasgos, setNpcRasgos] = useState<Array<{ id: number | string; nombre: string; usado: boolean }>>([]);
  const [npcEquipo, setNpcEquipo] = useState<Array<{ id: number | string; nombre: string }>>([]);
  const [npcEquipoSinHueco, setNpcEquipoSinHueco] = useState<Array<{ id: number | string; nombre: string; usado: boolean }>>([]);
  const [editingNpcId, setEditingNpcId] = useState<string | null>(null);
  const [traitSearch, setTraitSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [customTrait, setCustomTrait] = useState('');
  const [customItem, setCustomItem] = useState('');

  const openEditTempModal = (npcId: string) => {
    const p = tempCharacters[npcId];
    if (!p) return;
    setEditingNpcId(npcId);
    setNpcName(p.nombre || '');
    setNpcUrlImg(p.url_img || '');
    setNpcBando(p.bando || 'A');
    setNpcVit(p.estado?.maxVit || 30);
    setNpcStats(p.stats_base || { NIN: 3, TAI: 3, GEN: 3, INT: 3, FUE: 3, AGI: 3, EST: 3, SM: 3 });
    setNpcRasgos(p.rasgos || []);
    setNpcEquipo(p.equipo || []);
    setNpcEquipoSinHueco(p.equipoSinHueco || []);
    setShowCreateTempModal(true);
  };

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
        void err;
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
          if (profile) {
            setUserProfile({
              id: profile.id,
              username: profile.username || 'Staff',
              url_avatar: profile.url_avatar || profile.url_img
            });
            const roles = profile.roles || [];
            setUserRoles(roles);
            const hasRole = roles.some((r: string) => ['admin', 'moderador', 'narrador'].includes(r));
            setIsAdminOrNarrator(!!hasRole);
          }
        }
      } catch (err) {
        void err;
      } finally {
        setRolesLoaded(true);
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

      supabase.from('info_glosario').select('*, info_glosario_subcategorias(*)').eq('categoria_id', 2).eq('activo', true).order('nombre_es')
        .then(({ data }) => {
          if (data) setMasterItems(data);
        });
    }
  }, [isAdminOrNarrator, isEventMode, supabase]);

  useEffect(() => {
    fetchActiveCharacter();
  }, [fetchActiveCharacter]);

  // Initializing global combat state from localStorage (if valid)
  useEffect(() => {
    const globalStorageKey = `combat_room_global_${roomId}`;
    const savedGlobalStr = localStorage.getItem(globalStorageKey);
    if (savedGlobalStr) {
      try {
        const savedGlobal = JSON.parse(savedGlobalStr);
        if (savedGlobal.timestamp && Date.now() - savedGlobal.timestamp <= 7200000) {
          setTurnQueue(savedGlobal.turnQueue || []);
          setCurrentTurnIndex(savedGlobal.currentTurnIndex || 0);
          setRondaActual(savedGlobal.rondaActual || 1);
          setCombatStarted(savedGlobal.combatStarted || false);
          setTurnStartTime(savedGlobal.turnStartTime || null);
          setLogs(savedGlobal.logs || []);
          setTempCharacters(savedGlobal.tempCharacters || {});
        } else {
          localStorage.removeItem(globalStorageKey);
        }
      } catch (e) {
        console.error("Error parsing saved global combat state:", e);
      }
    }
  }, [roomId]);

  // Initializing local participant stats & bando from localStorage
  useEffect(() => {
    const actorId = activeCharacter ? String(activeCharacter.id) : userProfile?.id;
    if (!actorId) return;

    const storageKey = `combat_room_${roomId}_${actorId}`;
    const savedDataStr = localStorage.getItem(storageKey);
    let restored = false;

    if (savedDataStr) {
      try {
        const savedData = JSON.parse(savedDataStr);
        if (savedData.timestamp && Date.now() - savedData.timestamp <= 7200000) {
          if (savedData.localState) setLocalState(savedData.localState);
          if (savedData.myBando !== undefined) setMyBando(savedData.myBando);
          if (savedData.myIsInCombat !== undefined) setMyIsInCombat(savedData.myIsInCombat);
          if (savedData.myCooldowns) setMyCooldowns(savedData.myCooldowns);
          if (savedData.myActiveTecnicas) setMyActiveTecnicas(savedData.myActiveTecnicas);
          restored = true;
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (e) {
        console.error("Error parsing saved combat state:", e);
      }
    }

    if (!restored && activeCharacter && !localState) {
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
        chConstanteActive: false,
        chConstanteCost: 0,
      });
    }
  }, [activeCharacter?.id ? String(activeCharacter.id) : '', userProfile?.id || '', isEventMode, roomId]);

  // Save local participant state to localStorage on changes
  useEffect(() => {
    const actorId = activeCharacter ? String(activeCharacter.id) : userProfile?.id;
    if (actorId) {
      const storageKey = `combat_room_${roomId}_${actorId}`;
      if (myIsInCombat || myBando !== null || localState !== null) {
        const dataToSave = {
          localState,
          myBando,
          myIsInCombat,
          myCooldowns,
          myActiveTecnicas,
          timestamp: Date.now()
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [roomId, activeCharacter?.id ? String(activeCharacter.id) : '', userProfile?.id || '', localState, myBando, myIsInCombat, myCooldowns, myActiveTecnicas]);

  // Save global room state to localStorage on changes
  useEffect(() => {
    const globalStorageKey = `combat_room_global_${roomId}`;
    if (logs.length > 0 || turnQueue.length > 0 || combatStarted || Object.keys(tempCharacters).length > 0) {
      const globalData = {
        turnQueue,
        currentTurnIndex,
        rondaActual,
        combatStarted,
        turnStartTime,
        logs,
        tempCharacters,
        timestamp: Date.now()
      };
      localStorage.setItem(globalStorageKey, JSON.stringify(globalData));
    } else {
      localStorage.removeItem(globalStorageKey);
    }
  }, [roomId, turnQueue, currentTurnIndex, rondaActual, combatStarted, logs, tempCharacters]);

  // Refs to avoid feedback loops and channel recreation on state updates
  const turnQueueRef = useRef(turnQueue);
  const currentTurnIndexRef = useRef(currentTurnIndex);
  const rondaActualRef = useRef(rondaActual);
  const combatStartedRef = useRef(combatStarted);
  const turnStartTimeRef = useRef(turnStartTime);
  const localStateRef = useRef(localState);
  const myBandoRef = useRef(myBando);
  const myIsInCombatRef = useRef(myIsInCombat);
  const myCooldownsRef = useRef(myCooldowns);
  const logsRef = useRef(logs);
  const activeCharacterRef = useRef(activeCharacter);
  const myActiveTecnicasRef = useRef(myActiveTecnicas);
  const lastProcessedRoundRef = useRef<number>(rondaActual);

  useEffect(() => {
    const previousRound = lastProcessedRoundRef.current;
    if (rondaActual <= previousRound) {
      lastProcessedRoundRef.current = rondaActual;
      return;
    }

    const roundsAdvanced = rondaActual - previousRound;

    // 1. Mantenimiento constante de CH y Cooldowns de personaje activo
    if (combatStarted && !isEventMode && localState && activeCharacter) {
      const cost = localState.chConstanteCost ?? 0;
      if (localState.chConstanteActive && cost > 0) {
        const totalCost = cost * roundsAdvanced;
        const newCh = Math.max(0, localState.ch - totalCost);
        setLocalState(prev => prev ? { ...prev, ch: newCh } : null);
        addLog(`**${activeCharacter.nombre_ninja}** consume **${totalCost}** CH por mantenimiento constante de técnica al iniciar la Ronda ${rondaActual}. CH: ${newCh}/${localState.maxCh}.`);
      }

      // Shift reusableAtRound forward for active techniques to freeze their cooldowns
      const activeTechIds = Object.keys(myActiveTecnicas).map(Number);
      if (activeTechIds.length > 0) {
        setMyCooldowns(prev => {
          const updated = { ...prev };
          activeTechIds.forEach(techId => {
            if (updated[techId]) {
              updated[techId] = updated[techId] + roundsAdvanced;
            }
          });
          return updated;
        });
      }
    }

    // 2. Decrement terrain elements duration in rondas (ALWAYS runs on round advancement)
    if (gridElementsRef.current.length > 0) {
      const updatedElements: GridElement[] = [];
      const expiredNames: string[] = [];

      gridElementsRef.current.forEach(el => {
        if (el.durationUnit === 'rondas') {
          const newVal = el.durationValue - roundsAdvanced;
          if (newVal >= 0) {
            updatedElements.push({ ...el, durationValue: newVal });
          } else {
            expiredNames.push(el.name);
          }
        } else {
          updatedElements.push(el);
        }
      });

      if (expiredNames.length > 0 || updatedElements.length !== gridElementsRef.current.length) {
        setGridElements(updatedElements);
        broadcastGridState(gridConfigRef.current, updatedElements);
        expiredNames.forEach(name => {
          addLog(`**[TERRENO]** El elemento **${name}** ha expirado y desaparece del terreno de combate.`);
        });
      }
    }

    lastProcessedRoundRef.current = rondaActual;
  }, [rondaActual, combatStarted, isEventMode, activeCharacter?.id, localState?.chConstanteActive, localState?.chConstanteCost, myActiveTecnicas]);

  useEffect(() => { turnQueueRef.current = turnQueue; }, [turnQueue]);
  useEffect(() => { currentTurnIndexRef.current = currentTurnIndex; }, [currentTurnIndex]);
  useEffect(() => { rondaActualRef.current = rondaActual; }, [rondaActual]);
  useEffect(() => { combatStartedRef.current = combatStarted; }, [combatStarted]);
  useEffect(() => { turnStartTimeRef.current = turnStartTime; }, [turnStartTime]);
  useEffect(() => { localStateRef.current = localState; }, [localState]);
  useEffect(() => { myBandoRef.current = myBando; }, [myBando]);
  useEffect(() => { myIsInCombatRef.current = myIsInCombat; }, [myIsInCombat]);
  useEffect(() => { myCooldownsRef.current = myCooldowns; }, [myCooldowns]);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { activeCharacterRef.current = activeCharacter; }, [activeCharacter]);
  useEffect(() => { tempCharactersRef.current = tempCharacters; }, [tempCharacters]);
  useEffect(() => { myActiveTecnicasRef.current = myActiveTecnicas; }, [myActiveTecnicas]);

  // Turn timer hook for PvP mode
  useEffect(() => {
    if (!combatStarted || isEventMode || !turnStartTime) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - turnStartTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [combatStarted, isEventMode, turnStartTime]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `[${mins}:${secs}]`;
  };

  const userProfileRef = useRef(userProfile);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  const currentActorId = activeCharacter ? String(activeCharacter.id) : userProfile?.id;
  const currentActorName = activeCharacter?.nombre_ninja || userProfile?.username || 'Staff';
  const currentActorImg = activeCharacter?.url_img || userProfile?.url_avatar || '';

  // Supabase Presence and Broadcast Subscriptions
  useEffect(() => {
    const actorId = activeCharacter ? String(activeCharacter.id) : userProfile?.id;
    if (!actorId) return;

    const channelName = `room_${roomId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: actorId },
        broadcast: { self: false }
      },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log("Supabase Presence sync triggered, raw state:", state);
        const activeParticipants: Record<string, Participant> = {};

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences.length > 0) {
            const merged = presences.reduce((acc, curr) => ({ ...acc, ...curr }), {} as Participant);
            activeParticipants[key] = merged;
          }
        });
        console.log("Processed activeParticipants:", activeParticipants);
        setParticipants(activeParticipants);
      })
      .on('broadcast', { event: 'combat_log' }, ({ payload }) => {
        const myActorId = activeCharacterRef.current ? String(activeCharacterRef.current.id) : userProfileRef.current?.id;
        if (payload.senderId !== myActorId) {
          setLogs(prev => [...prev, payload.message].slice(-40));
        }
      })
      .on('broadcast', { event: 'request_combat_state' }, ({ payload }) => {
        const requesterId = payload?.requesterId;
        const presenceState = channel.presenceState();
        const activeResponders = Object.keys(presenceState).filter(key => {
          if (key === requesterId) return false;
          const presences = presenceState[key] as any[];
          if (presences.length === 0) return false;
          const participant = presences[0];
          return participant.isInCombat || (logsRef.current && logsRef.current.length > 0);
        }).sort();

        const firstResponder = activeResponders[0];
        const myActorId = activeCharacterRef.current ? String(activeCharacterRef.current.id) : userProfileRef.current?.id;

        if (firstResponder === myActorId) {
          channel.send({
            type: 'broadcast',
            event: 'combat_state_update',
            payload: {
              turnQueue: turnQueueRef.current,
              currentTurnIndex: currentTurnIndexRef.current,
              rondaActual: rondaActualRef.current,
              combatStarted: combatStartedRef.current,
              turnStartTime: turnStartTimeRef.current,
              logs: logsRef.current,
              tempCharacters: tempCharactersRef.current,
              activeMusicVideoId: activeMusicVideoIdRef.current,
              musicIsPlaying: musicIsPlayingRef.current,
              gridConfig: gridConfigRef.current,
              gridElements: gridElementsRef.current,
              senderId: myActorId
            }
          });
        }
      })
      .on('broadcast', { event: 'combat_state_update' }, ({ payload }) => {
        const myActorId = activeCharacterRef.current ? String(activeCharacterRef.current.id) : userProfileRef.current?.id;
        if (payload.senderId !== myActorId) {
          setTurnQueue(payload.turnQueue);
          setCurrentTurnIndex(payload.currentTurnIndex);
          setRondaActual(payload.rondaActual);
          setCombatStarted(payload.combatStarted);
          if (payload.turnStartTime !== undefined) {
            setTurnStartTime(payload.turnStartTime);
          }
          if (payload.logs && payload.logs.length > 0) {
            setLogs(payload.logs);
          }
          if (payload.tempCharacters !== undefined) {
            setTempCharacters(payload.tempCharacters);
          }
          if (payload.gridConfig !== undefined) {
            setGridConfig(payload.gridConfig);
          }
          if (payload.gridElements !== undefined) {
            setGridElements(payload.gridElements);
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
        const myActorId = activeCharacterRef.current ? String(activeCharacterRef.current.id) : userProfileRef.current?.id;
        if (payload.senderId !== myActorId) {
          setTempCharacters(payload.tempCharacters);
        }
      })
      .on('broadcast', { event: 'grid_state_update' }, ({ payload }) => {
        const myActorId = activeCharacterRef.current ? String(activeCharacterRef.current.id) : userProfileRef.current?.id;
        if (payload.senderId !== myActorId) {
          if (payload.gridConfig !== undefined) setGridConfig(payload.gridConfig);
          if (payload.gridElements !== undefined) setGridElements(payload.gridElements);
        }
      })
      .on('broadcast', { event: 'music_update' }, ({ payload }) => {
        const myActorId = activeCharacterRef.current ? String(activeCharacterRef.current.id) : userProfileRef.current?.id;
        if (isEventMode && payload.senderId !== myActorId) {
          setActiveMusicVideoId(payload.videoId ?? null);
          setMusicIsPlaying(true);
        }
      })
      .on('broadcast', { event: 'music_control' }, ({ payload }) => {
        const myActorId = activeCharacterRef.current ? String(activeCharacterRef.current.id) : userProfileRef.current?.id;
        if (isEventMode && payload.senderId !== myActorId) {
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
      .on('broadcast', { event: 'request_presence_update' }, () => {
        const myActorId = activeCharacterRef.current ? String(activeCharacterRef.current.id) : userProfileRef.current?.id;
        const myName = activeCharacterRef.current?.nombre_ninja || userProfileRef.current?.username || 'Staff';
        const myImg = activeCharacterRef.current?.url_img || userProfileRef.current?.url_avatar || '';
        if (channelRef.current && myActorId) {
          const payloadTrack = {
            user_id: myActorId,
            nombre: myName,
            url_img: myImg,
            estado: localStateRef.current || { vit: 0, maxVit: 0, ch: 0, maxCh: 0, vel: 0, kawarimi: 0, maxKawarimi: 0 },
            bando: myBandoRef.current,
            isInCombat: myIsInCombatRef.current,
            cooldowns: Object.keys(myCooldownsRef.current).map(Number).map(techId => {
              const pt = activeCharacterRef.current?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
              return {
                id: techId,
                nombre: pt?.info_glosario?.nombre_jp || pt?.info_glosario?.nombre_es || 'Técnica',
                reusableAtRound: myCooldownsRef.current[techId]
              };
            }),
            tecnicasActivas: Object.keys(myActiveTecnicasRef.current).map(Number).map(techId => {
              const pt = activeCharacterRef.current?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
              return {
                id: techId,
                nombre: pt?.info_glosario?.nombre_jp || pt?.info_glosario?.nombre_es || 'Técnica',
                cdRounds: myActiveTecnicasRef.current[techId].cdRounds
              };
            }),
            rasgos: activeCharacterRef.current?.personajes_rasgos?.map(r => ({
              id: r.info_rasgos?.id || r.rasgo_id,
              nombre: r.info_rasgos?.nombre || 'Rasgo',
              usado: localStateRef.current?.usedTraits?.[r.info_rasgos?.id || r.rasgo_id] || false
            })) || [],
            equipo: activeCharacterRef.current?.personajes_inventario?.filter(pi => pi.equipado).map(pi => ({
              id: pi.info_glosario?.id || pi.item_id,
              nombre: pi.info_glosario?.nombre_es || 'Objeto'
            })) || [],
            equipoSinHueco: activeCharacterRef.current?.personajes_inventario?.filter(pi => pi.info_glosario?.ocupa_espacio === false).map(pi => ({
              id: pi.info_glosario?.id || pi.item_id,
              nombre: pi.info_glosario?.nombre_es || 'Objeto',
              usado: localStateRef.current?.usedItems?.[pi.info_glosario?.id || pi.item_id] || false
            })) || []
          };
          channelRef.current.track(payloadTrack);
        }
      })
      .on('broadcast', { event: 'combat_reset' }, () => {
        resetLocalStateToDefault();
        setMyBando(null);
        setMyIsInCombat(false);
        setMyCooldowns({});
        setMyActiveTecnicas({});
        setTempCharacters({});
        setActiveMusicVideoId(null);
        setMusicIsPlaying(true);
        const globalStorageKey = `combat_room_global_${roomId}`;
        localStorage.removeItem(globalStorageKey);
        if (activeCharacterRef.current) {
          const storageKey = `combat_room_${roomId}_${activeCharacterRef.current.id}`;
          localStorage.removeItem(storageKey);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          channel.send({
            type: 'broadcast',
            event: 'request_combat_state',
            payload: { requesterId: actorId }
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
  }, [roomId, activeCharacter?.id ? String(activeCharacter.id) : '', userProfile?.id || '']);

  // Track presence reactively when stats, bando, or combat status changes (only after subscription is active)
  useEffect(() => {
    const myActorId = activeCharacter ? String(activeCharacter.id) : userProfile?.id;
    const myName = activeCharacter?.nombre_ninja || userProfile?.username || 'Staff';
    const myImg = activeCharacter?.url_img || userProfile?.url_avatar || '';
    if (isSubscribed && channelRef.current && myActorId) {
      const payload = {
        user_id: myActorId,
        nombre: myName,
        url_img: myImg,
        estado: localState || { vit: 0, maxVit: 0, ch: 0, maxCh: 0, vel: 0, kawarimi: 0, maxKawarimi: 0 },
        bando: myBando,
        isInCombat: myIsInCombat,
        cooldowns: Object.keys(myCooldowns).map(Number).map(techId => {
          const pt = activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
          return {
            id: techId,
            nombre: pt?.info_glosario?.nombre_jp || pt?.info_glosario?.nombre_es || 'Técnica',
            reusableAtRound: myCooldowns[techId]
          };
        }),
        tecnicasActivas: Object.keys(myActiveTecnicas).map(Number).map(techId => {
          const pt = activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
          return {
            id: techId,
            nombre: pt?.info_glosario?.nombre_jp || pt?.info_glosario?.nombre_es || 'Técnica',
            cdRounds: myActiveTecnicas[techId].cdRounds
          };
        }),
        rasgos: activeCharacter?.personajes_rasgos?.map(r => ({
          id: r.info_rasgos?.id || r.rasgo_id,
          nombre: r.info_rasgos?.nombre || 'Rasgo',
          usado: localState?.usedTraits?.[r.info_rasgos?.id || r.rasgo_id] || false
        })) || [],
        equipo: activeCharacter?.personajes_inventario?.filter(pi => pi.equipado).map(pi => ({
          id: pi.info_glosario?.id || pi.item_id,
          nombre: pi.info_glosario?.nombre_es || 'Objeto'
        })) || [],
        equipoSinHueco: activeCharacter?.personajes_inventario?.filter(pi => pi.info_glosario?.ocupa_espacio === false).map(pi => ({
          id: pi.info_glosario?.id || pi.item_id,
          nombre: pi.info_glosario?.nombre_es || 'Objeto',
          usado: localState?.usedItems?.[pi.info_glosario?.id || pi.item_id] || false
        })) || []
      };
      channelRef.current.track(payload);
    }
  }, [
    isSubscribed,
    activeCharacter?.id,
    userProfile?.id,
    userProfile?.username,
    activeCharacter?.personajes_rasgos,
    activeCharacter?.personajes_inventario,
    localState,
    myBando,
    myIsInCombat,
    myCooldowns,
    myActiveTecnicas
  ]);

  const sendBroadcast = (event: string, payload: any) => {
    if (!channelRef.current || !currentActorId) return;
    if (isSubscribed && channelRef.current.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast',
        event,
        payload
      });
    } else if (typeof channelRef.current.httpSend === 'function') {
      channelRef.current.httpSend(event, payload);
    }
  };

  const addLog = async (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatted = `[${time}] ${message}`;
    setLogs(prev => [...prev, formatted].slice(-40));

    sendBroadcast('combat_log', {
      message: formatted,
      senderId: currentActorId
    });
  };

  const broadcastGlobalState = (
    queue: string[],
    index: number,
    round: number,
    started: boolean,
    temps?: Record<string, Participant>,
    startTime?: number | null,
    overrideGridElements?: GridElement[]
  ) => {
    sendBroadcast('combat_state_update', {
      turnQueue: queue,
      currentTurnIndex: index,
      rondaActual: round,
      combatStarted: started,
      turnStartTime: startTime !== undefined ? startTime : turnStartTimeRef.current,
      tempCharacters: temps ?? tempCharactersRef.current,
      activeMusicVideoId: activeMusicVideoIdRef.current,
      musicIsPlaying: musicIsPlayingRef.current,
      gridConfig: gridConfigRef.current,
      gridElements: overrideGridElements ?? gridElementsRef.current,
      senderId: currentActorId
    });
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
    sendBroadcast('music_update', {
      videoId,
      senderId: currentActorId
    });
  };

  const updateGlobalCombatState = (
    queue: string[],
    index: number,
    round: number,
    started: boolean,
    startTime?: number | null,
    overrideGridElements?: GridElement[]
  ) => {
    const newStartTime = startTime !== undefined ? startTime : turnStartTime;
    let finalElements = overrideGridElements ?? gridElementsRef.current;

    // Check if round advanced without explicit grid elements override
    if (round > rondaActualRef.current && finalElements.length > 0 && !overrideGridElements) {
      const roundsAdvanced = round - rondaActualRef.current;
      const updatedElements: GridElement[] = [];
      const expiredNames: string[] = [];

      finalElements.forEach(el => {
        if (el.durationUnit === 'rondas') {
          const newVal = el.durationValue - roundsAdvanced;
          if (newVal >= 0) {
            updatedElements.push({ ...el, durationValue: newVal });
          } else {
            expiredNames.push(el.name);
          }
        } else {
          updatedElements.push(el);
        }
      });

      finalElements = updatedElements;
      expiredNames.forEach(name => {
        addLog(`**[TERRENO]** El elemento **${name}** ha expirado y desaparece del terreno de combate.`);
      });
    }

    setGridElements(finalElements);
    setTurnQueue(queue);
    setCurrentTurnIndex(index);
    setRondaActual(round);
    setCombatStarted(started);
    setTurnStartTime(newStartTime);
    broadcastGlobalState(queue, index, round, started, undefined, newStartTime, finalElements);
  };

  const broadcastTempCharacters = (temps: Record<string, Participant>) => {
    sendBroadcast('temp_character_update', {
      tempCharacters: temps,
      senderId: currentActorId
    });
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

  const removeFromQueue = async (charId: string) => {
    const isAdminOrMod = userRoles.some(r => ['admin', 'moderador'].includes(r));
    const canDeleteAll = isAdminOrMod || (isEventMode && userRoles.includes('narrador'));
    const isOwnCharacter = activeCharacter && String(activeCharacter.id) === charId;

    if (!canDeleteAll && !isOwnCharacter) {
      addToast("No tienes permission para retirar a este personaje.", "error");
      return;
    }

    const name = participants[charId]?.nombre || tempCharactersRef.current[charId]?.nombre || 'Shinobi';
    const isConfirmed = await confirm({
      title: "Retirar de Turnos",
      message: `¿Seguro que deseas retirar a **${name}** de la cola de turnos?`,
      confirmLabel: "Retirar",
      cancelLabel: "Cancelar",
      variant: "danger"
    });
    if (!isConfirmed) return;

    const newQueue = turnQueue.filter(id => id !== charId);
    let newIndex = currentTurnIndex;
    if (newIndex >= newQueue.length && newQueue.length > 0) {
      newIndex = 0;
    }
    updateGlobalCombatState(newQueue, newIndex, rondaActual, newQueue.length > 0 ? combatStarted : false);
    addLog(`El participante **${name}** ha sido retirado de los turnos.`);
  };

  const toggleJoinCombat = async () => {
    if (!activeCharacter) return;
    const charIdStr = String(activeCharacter.id);

    if (myIsInCombat) {
      const isConfirmed = await confirm({
        title: "Salir del Combate",
        message: "¿Seguro que deseas salir del combate? Serás eliminado del orden de turnos.",
        confirmLabel: "Salir",
        cancelLabel: "Cancelar",
        variant: "danger"
      });
      if (!isConfirmed) return;
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
    const now = Date.now();
    updateGlobalCombatState(turnQueue, 0, 1, true, now);
    addLog(`**¡EL COMBATE HA COMENZADO!** (Ronda 1)`);
    const activePlayerName = participants[turnQueue[0]]?.nombre || tempCharactersRef.current[turnQueue[0]]?.nombre || 'Shinobi';
    addLog(`Es el turno de **${activePlayerName}**.`);
  };

  const resetLocalStateToDefault = () => {
    const char = activeCharacterRef.current || activeCharacter;
    if (char) {
      let vit = char.atributos_derivados.VIT;
      let maxVit = char.atributos_derivados.VIT;

      if (isEventMode) {
        const rankVal = (char.rango || 'D').toUpperCase();
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
        ch: char.atributos_derivados.CH,
        maxCh: char.atributos_derivados.CH,
        vel: char.atributos_derivados.VEL || 0,
        kawarimi: 0,
        maxKawarimi: 1,
        usedTraits: {},
        chConstanteActive: false,
        chConstanteCost: 0,
      });
    }
  };

  const resetCombat = async () => {
    const isConfirmed = await confirm({
      title: "Reiniciar Combate",
      message: "¿Estás seguro de que quieres reiniciar el combate por completo? Esto limpiará el orden de turnos, los registros y reiniciará el estado de todos los participantes.",
      confirmLabel: "Reiniciar",
      cancelLabel: "Cancelar",
      variant: "danger"
    });
    if (!isConfirmed) return;

    resetLocalStateToDefault();

    const newTemps: Record<string, Participant> = {};
    updateGlobalCombatState([], 0, 1, false, null);
    setMyBando(null);
    setMyIsInCombat(false);
    setMyCooldowns({});
    setMyActiveTecnicas({});
    setTempCharacters(newTemps);
    addLog(`El combate ha sido reiniciado por completo.`);
    if (channelRef.current && currentActorId) {
      channelRef.current.httpSend('combat_reset', {
        senderId: currentActorId
      });
    }

    // Clear localStorage on reset
    const globalStorageKey = `combat_room_global_${roomId}`;
    localStorage.removeItem(globalStorageKey);
    if (activeCharacter) {
      const storageKey = `combat_room_${roomId}_${activeCharacter.id}`;
      localStorage.removeItem(storageKey);
    }
  };

  const forceSync = () => {
    if (channelRef.current && currentActorId) {
      // 1. Request the latest global state
      channelRef.current.send({
        type: 'broadcast',
        event: 'request_combat_state',
        payload: { requesterId: currentActorId }
      });
      // 2. Request other players to broadcast/re-track their presence
      channelRef.current.send({
        type: 'broadcast',
        event: 'request_presence_update',
        payload: { senderId: currentActorId }
      });
    }

    // 3. Track ourselves immediately to publish/refresh our status for everyone
    if (isSubscribed && channelRef.current && currentActorId) {
      const payload = {
        user_id: currentActorId,
        nombre: currentActorName,
        url_img: currentActorImg,
        estado: localState || { vit: 0, maxVit: 0, ch: 0, maxCh: 0, vel: 0, kawarimi: 0, maxKawarimi: 0 },
        bando: myBando,
        isInCombat: myIsInCombat,
        cooldowns: Object.keys(myCooldowns).map(Number).map(techId => {
          const pt = activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
          return {
            id: techId,
            nombre: pt?.info_glosario?.nombre_jp || pt?.info_glosario?.nombre_es || 'Técnica',
            reusableAtRound: myCooldowns[techId]
          };
        }),
        tecnicasActivas: Object.keys(myActiveTecnicas).map(Number).map(techId => {
          const pt = activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
          return {
            id: techId,
            nombre: pt?.info_glosario?.nombre_jp || pt?.info_glosario?.nombre_es || 'Técnica',
            cdRounds: myActiveTecnicas[techId].cdRounds
          };
        }),
        rasgos: activeCharacter?.personajes_rasgos?.map(r => ({
          id: r.info_rasgos?.id || r.rasgo_id,
          nombre: r.info_rasgos?.nombre || 'Rasgo',
          usado: localState?.usedTraits?.[r.info_rasgos?.id || r.rasgo_id] || false
        })) || [],
        equipo: activeCharacter?.personajes_inventario?.filter(pi => pi.equipado).map(pi => ({
          id: pi.info_glosario?.id || pi.item_id,
          nombre: pi.info_glosario?.nombre_es || 'Objeto'
        })) || [],
        equipoSinHueco: activeCharacter?.personajes_inventario?.filter(pi => pi.info_glosario?.ocupa_espacio === false).map(pi => ({
          id: pi.info_glosario?.id || pi.item_id,
          nombre: pi.info_glosario?.nombre_es || 'Objeto',
          usado: localState?.usedItems?.[pi.info_glosario?.id || pi.item_id] || false
        })) || []
      };
      channelRef.current.track(payload);
    }
    addToast("Sincronización forzada enviada a la sala.", "info");
  };

  const passTurn = () => {
    let nextIndex = currentTurnIndex + 1;
    let nextRound = rondaActual;
    let roundEnded = false;

    if (turnQueue.length === 0 || nextIndex >= turnQueue.length) {
      nextIndex = 0;
      nextRound = rondaActual + 1;
      roundEnded = true;
    }

    const currentTurnKey = `${rondaActual}_${currentTurnIndex}`;
    const roundsAdvanced = roundEnded ? Math.max(1, nextRound - rondaActual) : 0;
    const { updatedElements, expiredNames } = processTerrainDecay(gridElementsRef.current, {
      advanceAction: true,
      roundsAdvanced,
      currentTurnKey
    });

    expiredNames.forEach(name => {
      addLog(`**[TERRENO]** El elemento **${name}** ha expirado y desaparece del terreno de combate.`);
    });

    const nextTurnStart = Date.now();
    setGridElements(updatedElements);
    updateGlobalCombatState(turnQueue, nextIndex, nextRound, true, nextTurnStart, updatedElements);

    const activeCharId = turnQueue[currentTurnIndex];
    const activeParticipantName = participants[activeCharId]?.nombre || tempCharactersRef.current[activeCharId]?.nombre || currentActorName;

    addLog(`Fin del turno de **${activeParticipantName}**.`);
    if (roundEnded) {
      addLog(`**Ronda ${nextRound} Iniciada**`);
    }

    if (turnQueue.length > 0) {
      const nextCharId = turnQueue[nextIndex];
      const nextPlayerName = participants[nextCharId]?.nombre || tempCharactersRef.current[nextCharId]?.nombre || 'Siguiente shinobi';
      addLog(`Es el turno de **${nextPlayerName}**.`);
    }
  };

  // Local actions for VIT & CH
  const handleApplyDamage = () => {
    if (vitInput === '' || vitInput <= 0) return;
    const amount = Number(vitInput);

    if (isEventMode && activeConsoleMode === 'narrador' && isAdminOrNarrator) {
      const npc = rollTargetId !== 'self' ? (tempCharacters[rollTargetId] || Object.values(tempCharacters).find(tc => String(tc.user_id) === String(rollTargetId))) : undefined;
      if (npc) {
        const maxVit = npc.estado?.maxVit ?? 30;
        const currentVit = npc.estado?.vit ?? maxVit;
        const newVit = Math.max(0, currentVit - amount);
        updateTempCharacter(npc.user_id, {
          estado: { ...npc.estado, vit: newVit, maxVit }
        });
        addLog(`**[NPC] ${npc.nombre}** recibe **${amount}** de daño. VIT: **${newVit}**/**${maxVit}**.`);
        setVitInput('');
        return;
      }
    }

    if (!localState) return;
    const currentRes = activeCharacter?.atributos_derivados.RES || 0;
    const reduced = Math.max(1, Math.floor(amount * (1 - currentRes / 100)));
    const newVit = Math.max(0, localState.vit - reduced);

    const updated = { ...localState, vit: newVit };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja || 'Ninja'}** recibe **${amount}** de daño (**${reduced}** tras resistencia). VIT: **${newVit}**/**${localState.maxVit}**.`);
    setVitInput('');
  };

  const handleApplyHeal = () => {
    if (vitInput === '' || vitInput <= 0) return;
    const amount = Number(vitInput);

    if (isEventMode && activeConsoleMode === 'narrador' && isAdminOrNarrator) {
      const npc = rollTargetId !== 'self' ? (tempCharacters[rollTargetId] || Object.values(tempCharacters).find(tc => String(tc.user_id) === String(rollTargetId))) : undefined;
      if (npc) {
        const maxVit = npc.estado?.maxVit ?? 30;
        const currentVit = npc.estado?.vit ?? maxVit;
        const newVit = Math.min(maxVit, currentVit + amount);
        updateTempCharacter(npc.user_id, {
          estado: { ...npc.estado, vit: newVit, maxVit }
        });
        addLog(`**[NPC] ${npc.nombre}** se cura +**${amount}** VIT. VIT: **${newVit}**/**${maxVit}**.`);
        setVitInput('');
        return;
      }
    }

    if (!localState) return;
    const newVit = Math.min(localState.maxVit, localState.vit + amount);

    const updated = { ...localState, vit: newVit };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja || 'Ninja'}** se cura +**${amount}** VIT. VIT: **${newVit}**/**${localState.maxVit}**.`);
    setVitInput('');
  };

  const handleSpendChakra = () => {
    if (!localState || chInput === '' || chInput <= 0) return;
    const newCh = Math.max(0, localState.ch - chInput);
    const updated = { ...localState, ch: newCh };
    setLocalState(updated);
    addLog(`**${activeCharacter?.nombre_ninja}** gasta **${chInput}** de CH. CH: **${newCh}**/**${localState.maxCh}**.`);
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
    addLog(`**${activeCharacter?.nombre_ninja}** recupera +**${chInput}** CH. CH: **${newCh}**/**${localState.maxCh}**.`);
    setChInput('');
  };

  const getActiveSenderInfo = () => {
    if (rollTargetId === 'narrator') {
      return {
        id: 'narrator',
        name: `Narrador (${userProfile?.username || 'Sistema'})`,
        isNpc: false,
        isNarrator: true,
        stats: undefined
      };
    }
    const npc = rollTargetId !== 'self' ? (tempCharacters[rollTargetId] || Object.values(tempCharacters).find(tc => String(tc.user_id) === String(rollTargetId))) : undefined;
    if (npc) {
      return {
        id: npc.user_id,
        name: `[NPC] ${npc.nombre}`,
        isNpc: true,
        isNarrator: false,
        stats: npc.stats_base || { NIN: 3, TAI: 3, GEN: 3, INT: 3, FUE: 3, AGI: 3, EST: 3, SM: 3 }
      };
    }
    return {
      id: activeCharacter ? String(activeCharacter.id) : (userProfile?.id || 'self'),
      name: activeCharacter?.nombre_ninja || (userProfile?.username ? `Narrador (${userProfile.username})` : 'Narrador'),
      isNpc: false,
      isNarrator: !activeCharacter,
      stats: activeCharacter?.stats_base
    };
  };

  const rollDice = () => {
    const sender = getActiveSenderInfo();
    if (isEventMode) {
      const roll1 = Math.floor(Math.random() * dadoInput) + 1;
      const roll2 = Math.floor(Math.random() * dadoInput) + 1;

      let finalResult = roll1;
      let formulaText = `**${sender.name}** realiza una Tirada (D${dadoInput})`;

      if (rollMode === 'advantage') {
        finalResult = Math.max(roll1, roll2);
        formulaText += ` con **VENTAJA** [Dados: **${roll1}**, **${roll2}**] y saca: **${finalResult}**`;
      } else if (rollMode === 'disadvantage') {
        finalResult = Math.min(roll1, roll2);
        formulaText += ` con **DESVENTAJA** [Dados: **${roll1}**, **${roll2}**] y saca: **${finalResult}**`;
      } else {
        formulaText += ` y saca: **${finalResult}**`;
      }

      addLog(formulaText);
    } else {
      const result = Math.floor(Math.random() * dadoInput) + 1;
      addLog(`**${sender.name}** realiza una Tirada de Cansancio (D${dadoInput}) y saca: **${result}**`);
    }
  };

  const rollStat = (statName: string) => {
    const sender = getActiveSenderInfo();
    const targetName = sender.name;
    const statsSource = sender.stats || activeCharacter?.stats_base;

    const statVal = statsSource ? (Number((statsSource as any)[statName]) ?? 3) : 3;
    const baseMod = getStatModifier(statVal);
    const mod = baseMod + tempModifier;

    const modSign = mod >= 0 ? `+${mod}` : `${mod}`;
    const baseModSign = baseMod >= 0 ? `+${baseMod}` : `${baseMod}`;
    const tempModSign = tempModifier >= 0 ? `+${tempModifier}` : `${tempModifier}`;
    const modExplanationText = tempModifier !== 0 ? ` (${baseModSign} base ${tempModSign} temp)` : '';

    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;

    let finalDice = roll1;
    let formulaText = `**${targetName}** tira **${statName}** (Valor: **${statVal}**, Mod: **${modSign}**)${modExplanationText}`;

    if (rollMode === 'advantage') {
      finalDice = Math.max(roll1, roll2);
      formulaText += ` con **VENTAJA** [Dados: **${roll1}**, **${roll2}**]`;
    } else if (rollMode === 'disadvantage') {
      finalDice = Math.min(roll1, roll2);
      formulaText += ` con **DESVENTAJA** [Dados: **${roll1}**, **${roll2}**]`;
    }

    const finalResult = finalDice + mod;
    formulaText += `: **${finalResult}** (d20: **${finalDice}** ${modSign})`;

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
  const getRemainingCD = (reusableAtRound: number, _cdRounds?: number) => {
    if (rondaActual >= reusableAtRound) return 0;
    return Math.max(0, reusableAtRound - rondaActual - 1);
  };


  // Deactivate Technique
  const handleDeactivateTecnica = (techId: number) => {
    setMyActiveTecnicas(prev => {
      const copy = { ...prev };
      delete copy[techId];
      return copy;
    });
    const techWrapper = activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
    const techName = techWrapper?.info_glosario?.nombre_jp || techWrapper?.info_glosario?.nombre_es || 'Técnica';
    addLog(`**${activeCharacter?.nombre_ninja}** desactiva la técnica **${techName}**. Su CD comienza a transcurrir.`);
  };

  // Use Technique
  const handleUseTecnica = () => {
    if (!localState || selectedTecnicaId === null || !activeCharacter) return;

    const techWrapper = activeCharacter.personajes_tecnicas?.find(t => t.tecnica_id === selectedTecnicaId);
    const techName = techWrapper?.info_glosario?.nombre_jp || techWrapper?.info_glosario?.nombre_es || 'Técnica';

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

    const updatedState = {
      ...localState,
      ch: newCh,
      ...(isConstantCh ? { chConstanteCost: constantChCost, chConstanteActive: true } : {})
    };
    setLocalState(updatedState);
    setMyCooldowns(newCooldowns);

    if (isTechActive) {
      setMyActiveTecnicas(prev => ({
        ...prev,
        [selectedTecnicaId]: { cdRounds: customCdRounds }
      }));
    }

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
        advantageText = ` con **VENTAJA** [Dados: **${roll1}**, **${roll2}**]`;
      } else if (rollMode === 'disadvantage') {
        finalDice = Math.min(roll1, roll2);
        advantageText = ` con **DESVENTAJA** [Dados: **${roll1}**, **${roll2}**]`;
      }

      const finalResult = finalDice + mod;
      rollText = ` | Daño / Tirada (${bestStat}): **${finalResult}** (d20: ${finalDice}${advantageText} ${modSign}${modExplanationText})${finalDice === 20 ? ' **¡CRÍTICO!**' : ''}`;
    }

    if (isEventMode) {
      addLog(`**${activeCharacter.nombre_ninja}** usa **${techName}** (CD: ${customCdRounds} rondas)${rollText}.`);
    } else {
      let constantText = '';
      if (isConstantCh) {
        constantText = ` | Mantenimiento: **${constantChCost}** CH/ronda (Activo)`;
      }
      let activeText = '';
      if (isTechActive) {
        activeText = ` | Estado: **Activa** (CD pausado)`;
      }
      addLog(`**${activeCharacter.nombre_ninja}** usa **${techName}** (Coste: **${customChCost}** CH${constantText}${activeText} | CD: **${customCdRounds}** rondas). CH restante: **${newCh}**/**${localState.maxCh}**.`);

      const percentage = (newCh / localState.maxCh) * 100;
      if (percentage < 10) {
        addLog(`**¡CRÍTICO!** Chakra de **${activeCharacter.nombre_ninja}** es menor al 10%. Requiere Tirada de Cansancio Avanzado.`);
      } else if (percentage < 20) {
        addLog(`**¡ADVERTENCIA!** Chakra de **${activeCharacter.nombre_ninja}** es menor al 20%. Requiere Tirada de Cansancio.`);
      }
    }
  };

  if (characterLoading || !rolesLoaded) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 border-4 border-oro/10 border-t-oro rounded-full animate-spin mb-8" />
        <h2 className="text-oro font-black uppercase tracking-[0.4em] text-xs xl:text-sm animate-pulse text-center">
          CARGANDO EXPEDIENTE NINJA...
        </h2>
      </div>
    );
  }

  if (!activeCharacter && !isAdminOrNarrator) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url('/assets/ui/bg-combat/bg-combat-${bgNumber}.webp')`,
            filter: 'blur(4px)'
          }}
        />
        <div className="ninja-card-oro p-8 max-w-md w-full text-center relative z-10 space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-naranja-naruto/10 border border-naranja-naruto/30 flex items-center justify-center">
            <Users className="w-8 h-8 text-naranja-naruto" />
          </div>
          <div>
            <h2 className="ninja-title text-xl font-black uppercase tracking-wider mb-2 text-oro">
              PERSONAJE REQUERIDO
            </h2>
            <p className="text-xs text-oro/70 leading-relaxed font-sans">
              Para acceder a las salas de combate necesitas tener un personaje activo seleccionado en tu cuenta.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/crear-ficha"
              className="ninja-btn-oro flex-1 py-2.5 text-xs font-black uppercase text-center block"
            >
              Crear Personaje
            </Link>
            <Link
              href="/"
              className="ninja-btn-ghost flex-1 py-2.5 text-xs font-black uppercase text-center block"
            >
              Ir al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Group participants by bando (merge real participants + local participant + temp characters)
  const localParticipant: Participant | null = currentActorId ? {
    user_id: currentActorId,
    nombre: currentActorName,
    url_img: currentActorImg,
    estado: localState || { vit: 0, maxVit: 0, ch: 0, maxCh: 0, vel: 0, kawarimi: 0, maxKawarimi: 0 },
    bando: myBando,
    isInCombat: myIsInCombat,
    cooldowns: Object.keys(myCooldowns).map(Number).map(techId => {
      const pt = activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
      return {
        id: techId,
        nombre: pt?.info_glosario?.nombre_jp || pt?.info_glosario?.nombre_es || 'Técnica',
        reusableAtRound: myCooldowns[techId]
      };
    }),
    tecnicasActivas: Object.keys(myActiveTecnicas).map(Number).map(techId => {
      const pt = activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
      return {
        id: techId,
        nombre: pt?.info_glosario?.nombre_jp || pt?.info_glosario?.nombre_es || 'Técnica',
        cdRounds: myActiveTecnicas[techId].cdRounds
      };
    }),
    rasgos: activeCharacter?.personajes_rasgos?.map(r => ({
      id: r.info_rasgos?.id || r.rasgo_id,
      nombre: r.info_rasgos?.nombre || 'Rasgo',
      usado: localState?.usedTraits?.[r.info_rasgos?.id || r.rasgo_id] || false
    })) || [],
    equipo: activeCharacter?.personajes_inventario?.filter(pi => pi.equipado).map(pi => ({
      id: pi.info_glosario?.id || pi.item_id,
      nombre: pi.info_glosario?.nombre_es || 'Objeto'
    })) || [],
    equipoSinHueco: activeCharacter?.personajes_inventario?.filter(pi => pi.info_glosario?.ocupa_espacio === false).map(pi => ({
      id: pi.info_glosario?.id || pi.item_id,
      nombre: pi.info_glosario?.nombre_es || 'Objeto',
      usado: localState?.usedItems?.[pi.info_glosario?.id || pi.item_id] || false
    })) || []
  } : null;

  // Real human participants (connected via presence or local active user, excluding NPCs)
  const realParticipantsMap: Record<string, Participant> = {
    ...participants,
    ...(localParticipant ? { [localParticipant.user_id]: localParticipant } : {})
  };

  // Full map including NPCs for room display and turn management
  const allParticipantsMap: Record<string, Participant> = {
    ...realParticipantsMap,
    ...tempCharacters
  };

  const bandoAParticipants = Object.values(allParticipantsMap).filter(p => p.bando === 'A');
  const bandoBParticipants = Object.values(allParticipantsMap).filter(p => p.bando === 'B');
  const spectatorParticipants = Object.values(allParticipantsMap).filter(p => p.bando === null);

  if (showRegisterForm) {
    // Only real human characters assigned to Bando A or B (excluding Spectators & NPCs)
    const realBandoA = Object.values(realParticipantsMap).filter(
      p => p.bando === 'A' && !tempCharacters[p.user_id] && !String(p.user_id).startsWith('temp-')
    );
    const realBandoB = Object.values(realParticipantsMap).filter(
      p => p.bando === 'B' && !tempCharacters[p.user_id] && !String(p.user_id).startsWith('temp-')
    );

    if (isEventMode) {
      const activeParticipantsList = [...realBandoA, ...realBandoB].map(p => ({
        id: Number(p.user_id),
        nombre_ninja: p.nombre
      }));

      return (
        <div className="min-h-screen flex flex-col relative text-oro p-4 lg:p-8 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
            style={{
              backgroundImage: `url('/assets/ui/bg-combat/bg-combat-${bgNumber}.webp')`,
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

    const prefilledData = {
      data: {
        equipo_a: realBandoA.map(p => ({
          id: Number(p.user_id),
          nombre_ninja: p.nombre,
          rango: 'D'
        })),
        equipo_b: realBandoB.map(p => ({
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
            backgroundImage: `url('/assets/ui/bg-combat/bg-combat-${bgNumber}.webp')`,
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

  const isMyTurn = combatStarted && turnQueue.length > 0 && turnQueue[currentTurnIndex] === (activeCharacter ? String(activeCharacter.id) : userProfile?.id);
  const selectedNpc = rollTargetId !== 'self' ? (tempCharacters[rollTargetId] || Object.values(tempCharacters).find(tc => String(tc.user_id) === String(rollTargetId))) : undefined;

  return (
    <div className="min-h-screen flex flex-col relative text-oro selection:bg-oro/20 overflow-hidden">
      {/* Subtle blurred background layer to prevent pixelation */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
        style={{
          backgroundImage: `url('/assets/ui/bg-combat/bg-combat-${bgNumber}.webp')`,
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
                <Sparkles className="w-3.5 h-3.5 text-naranja-naruto" />
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
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                >
                  <span className="text-[10px] font-black">⏪ -10s</span>
                </button>
                <button
                  onClick={handleTogglePlayMusic}
                  className="h-7 px-2.5 text-[10px] font-black bg-oro/10 hover:bg-oro/25 text-oro border border-oro/30 rounded-sm transition-all uppercase inline-flex items-center justify-center shrink-0"
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                >
                  {musicIsPlaying ? "⏸ Pausar" : "▶ Play"}
                </button>
                <button
                  onClick={() => handleSeekMusic(10)}
                  title="Adelantar 10s"
                  className="h-7 px-2.5 bg-black/40 hover:bg-oro/10 text-oro border border-oro/20 rounded-sm transition-all inline-flex items-center justify-center shrink-0"
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
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
                    className="ninja-btn-rojo px-3 py-[5px] text-xs shrink-0 border border-naranja-naruto/30 leading-none whitespace-nowrap"
                  >
                    Parar
                  </button>
                )}
              </div>
            )}

          </div>
        )}

        {/* THREE COLUMNS BATTLEGROUND */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">

          {/* COLUMN 1: BANDO A */}
          <div className="lg:col-span-1 flex flex-col gap-4 ninja-card-oro p-6 relative overflow-hidden h-full min-h-0">
            <div className="flex items-center justify-between border-b border-oro/10 pb-4 mb-2 gap-2 shrink-0">
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

            <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 mt-2 min-h-0 border-t border-oro/5 pt-2">
              {bandoAParticipants.map(p => {
                const isTemp = !!tempCharacters[p.user_id];
                const canControlTemp = isTemp && isAdminOrNarrator;
                return (
                  <div key={p.user_id} className={`border p-4 rounded-sm hover:border-oro/80 transition-all ${isTemp ? 'bg-purple-950/20 border-purple-500/40' : 'bg-black/40 border-oro/60'}`}>
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
                            {p.isInCombat && !isTemp && (
                              <span className="text-[9px] font-black uppercase text-naranja-naruto bg-naranja-naruto/20 border border-naranja-naruto/40 px-1 rounded-sm">JUGADOR</span>
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
                            onClick={() => openEditTempModal(p.user_id)}
                            className="p-1 text-oro/40 hover:text-oro hover:bg-oro/10 rounded-sm transition-all"
                            title="Editar NPC"
                          >
                            <Pencil className="w-3.5 h-3.5" />
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
                      {(!p.ocultar_vit || isAdminOrNarrator) && (
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-black mb-1">
                            <span className="text-red-400">
                              VIT {p.ocultar_vit && <span className="text-purple-400 text-[8px] font-black uppercase tracking-wider">(Oculta)</span>}
                            </span>
                            <div className="flex items-center gap-1">
                              {canControlTemp && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isHidden = !!p.ocultar_vit;
                                    updateTempCharacter(p.user_id, { ocultar_vit: !isHidden });
                                    addLog(`**[NPC] ${p.nombre}** ahora tiene su vitalidad **${!isHidden ? 'oculta' : 'visible'}**.`);
                                  }}
                                  className={`p-0.5 rounded-sm transition-all hover:bg-oro/10 ${p.ocultar_vit ? 'text-amber-500 hover:text-amber-400' : 'text-oro/40 hover:text-oro'}`}
                                  title={p.ocultar_vit ? "Mostrar vitalidad" : "Ocultar vitalidad"}
                                >
                                  {p.ocultar_vit ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              <span>{p.estado?.vit} / {p.estado?.maxVit}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(p.estado?.vit / p.estado?.maxVit) * 100}%` }} />
                          </div>
                        </div>
                      )}
                      {!isEventMode && (() => {
                        const chVal = String(activeCharacter?.id) === p.user_id ? (localState?.ch ?? p.estado?.ch ?? 0) : (p.estado?.ch ?? 0);
                        const maxChVal = String(activeCharacter?.id) === p.user_id ? (localState?.maxCh ?? p.estado?.maxCh ?? 0) : (p.estado?.maxCh ?? 0);
                        const chPct = maxChVal > 0 ? Math.round((chVal / maxChVal) * 100) : 0;
                        return (
                          <div>
                            <div className="flex justify-between text-[10px] font-black mb-1">
                              <span className="text-blue-400">CH</span>
                              <span>
                                {chVal} / {maxChVal} <span className="text-blue-300/80 font-mono font-bold text-[9px]">({chPct}%)</span>
                              </span>
                            </div>
                            <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${maxChVal > 0 ? (chVal / maxChVal) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}

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
                                if (p.ocultar_vit) {
                                  addLog(`**[NPC] ${p.nombre}** recibe **${val}** de daño.`);
                                } else {
                                  addLog(`**[NPC] ${p.nombre}** recibe **${val}** de daño. VIT: **${newVit}**/**${p.estado?.maxVit}**.`);
                                }
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
                                if (p.ocultar_vit) {
                                  addLog(`**[NPC] ${p.nombre}** se cura **+${val}** VIT.`);
                                } else {
                                  addLog(`**[NPC] ${p.nombre}** se cura **+${val}** VIT. VIT: **${newVit}**/**${p.estado?.maxVit}**.`);
                                }
                                el.value = '';
                              }
                            }}
                            className="flex-1 py-1 text-[9px] font-black bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/60 transition-all rounded-sm"
                          >Sanar</button>
                        </div>
                      )}

                      {/* Speed & Kawarimi */}
                      {!isTemp && !isEventMode && (
                        <div className="flex flex-col gap-2 text-[10px] font-black pt-2 border-t border-oro/10 mt-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1">
                              <span className="text-amber-500 uppercase tracking-wider">VEL:</span>
                              {String(activeCharacter?.id) === p.user_id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentVel = localState?.vel ?? p.estado?.vel ?? 0;
                                      const newVel = Math.max(0, currentVel - 1);
                                      if (localState) setLocalState(prev => prev ? { ...prev, vel: newVel } : null);
                                      addLog(`**${p.nombre}** reduce su velocidad a **${newVel}**.`);
                                    }}
                                    className="w-4 h-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-[10px] active:scale-95 cursor-pointer"
                                    title="Bajar velocidad"
                                  >
                                    -
                                  </button>
                                  <span className="text-white min-w-[16px] text-center">{localState?.vel ?? p.estado?.vel ?? 0}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentVel = localState?.vel ?? p.estado?.vel ?? 0;
                                      const newVel = currentVel + 1;
                                      if (localState) setLocalState(prev => prev ? { ...prev, vel: newVel } : null);
                                      addLog(`**${p.nombre}** aumenta su velocidad a **${newVel}**.`);
                                    }}
                                    className="w-4 h-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-[10px] active:scale-95 cursor-pointer"
                                    title="Subir velocidad"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : isTemp ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentVel = p.estado?.vel ?? 0;
                                      const newVel = Math.max(0, currentVel - 1);
                                      updateTempCharacter(p.user_id, { estado: { ...p.estado, vel: newVel } });
                                      addLog(`**${p.nombre}** ajusta su velocidad a **${newVel}**.`);
                                    }}
                                    className="w-4 h-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-[10px] active:scale-95 cursor-pointer"
                                    title="Bajar velocidad"
                                  >
                                    -
                                  </button>
                                  <span className="text-white min-w-[16px] text-center">{p.estado?.vel ?? 0}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentVel = p.estado?.vel ?? 0;
                                      const newVel = currentVel + 1;
                                      updateTempCharacter(p.user_id, { estado: { ...p.estado, vel: newVel } });
                                      addLog(`**${p.nombre}** ajusta su velocidad a **${newVel}**.`);
                                    }}
                                    className="w-4 h-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-[10px] active:scale-95 cursor-pointer"
                                    title="Subir velocidad"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <span className="text-white">{p.estado?.vel ?? 0}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-400 uppercase tracking-wider">KAWARIMI:</span>
                              <div className="flex gap-1">
                                {Array.from({ length: String(activeCharacter?.id) === p.user_id ? (localState?.maxKawarimi ?? p.estado?.maxKawarimi ?? 1) : (p.estado?.maxKawarimi || 1) }, (_, i) => i + 1).map((num) => {
                                  const effectiveKawarimi = String(activeCharacter?.id) === p.user_id ? (localState?.kawarimi ?? p.estado?.kawarimi ?? 0) : (p.estado?.kawarimi ?? 0);
                                  const isUsed = effectiveKawarimi >= num;
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
                                        addLog(`**${activeCharacter?.nombre_ninja || p.nombre}** marca Kawarimi ${newKawarimi >= num ? 'usado' : 'recuperado'} (${newKawarimi}/${localState.maxKawarimi}).`);
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
                          {!isEventMode && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black">
                              <span className="text-blue-400 uppercase tracking-wider">CH CONSTANTE:</span>
                              <button
                                type="button"
                                disabled={String(activeCharacter?.id) !== p.user_id}
                                onClick={() => {
                                  const isSelf = String(activeCharacter?.id) === p.user_id;
                                  if (!isSelf || !localState) return;
                                  toggleConstantCh(!localState.chConstanteActive);
                                }}
                                className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center text-[8px] transition-all font-black ${String(activeCharacter?.id) === p.user_id
                                  ? (localState?.chConstanteActive
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'
                                    : 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30')
                                  : (p.estado?.chConstanteActive
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                    : 'bg-red-500/20 border-red-500 text-red-500')
                                  } ${String(activeCharacter?.id) === p.user_id ? 'cursor-pointer' : 'cursor-default'}`}
                                title={String(activeCharacter?.id) === p.user_id ? (localState?.chConstanteActive ? 'Desactivar CH constante' : 'Activar CH constante') : (p.estado?.chConstanteActive ? 'CH constante activo' : 'CH constante inactivo')}
                              >
                                {String(activeCharacter?.id) === p.user_id ? (localState?.chConstanteActive ? '✕' : '✓') : (p.estado?.chConstanteActive ? '✕' : '✓')}
                              </button>
                              <span className={`font-mono font-black text-[9px] uppercase tracking-wider ${String(activeCharacter?.id) === p.user_id ? 'text-blue-100' : 'text-blue-200/80'}`}>
                                {String(activeCharacter?.id) === p.user_id ? (localState?.chConstanteActive ? 'Activo' : 'Inactivo') : (p.estado?.chConstanteActive ? 'Activo' : 'Inactivo')}
                              </span>
                              <span className="font-mono text-[9px] font-black text-blue-100 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-sm">
                                -{String(activeCharacter?.id) === p.user_id ? (localState?.chConstanteCost ?? 0) : (p.estado?.chConstanteCost ?? 0)} CH/Ronda
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {isEventMode && (
                        <div className="space-y-2.5 pt-2 border-t border-oro/10 mt-1 animate-in fade-in duration-300">
                          {/* Traits (Rasgos) */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-oro/60 uppercase font-black block tracking-wider">Rasgos:</span>
                            {p.rasgos && p.rasgos.length > 0 ? (
                              <div className="grid grid-cols-3 gap-1.5">
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
                                          addLog(`**${activeCharacter?.nombre_ninja || p.nombre}** marca el rasgo **${r.nombre}** como ${updatedUsed[r.id] ? 'usado' : 'disponible'}.`);
                                        }
                                      }}
                                      className={`px-2 py-1 border text-xs font-black transition-all flex items-center justify-between gap-1 rounded-sm ${r.usado
                                        ? 'bg-red-500/10 border-red-500/30 text-red-400 line-through'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                        } ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
                                      title={canToggle ? `Haga clic para cambiar estado de ${r.nombre}` : r.nombre}
                                    >
                                      <span className="truncate">{r.nombre}</span>
                                      <span className="shrink-0">{r.usado ? '✕' : '✓'}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[10px] text-oro/20 italic block">Sin rasgos</span>
                            )}
                          </div>

                          {/* Equipment (Equipo) */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-oro/60 uppercase font-black block tracking-wider">Equipo Equipado:</span>
                            {p.equipo && p.equipo.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.equipo.map((eq: any) => (
                                  <span
                                    key={eq.id}
                                    className="px-2 py-1 bg-black/40 border border-oro/10 text-xs font-black text-oro/80 rounded-sm"
                                  >
                                    {eq.nombre}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-oro/20 italic block">Sin equipo equipado</span>
                            )}
                          </div>

                          {/* Equipo Sin Hueco (Desplegable - Abierto por defecto) */}
                          <div className="space-y-1 pt-1">
                            <details open className="group border border-oro/10 rounded-sm bg-black/30 p-2">
                              <summary className="text-[10px] text-oro/70 hover:text-oro uppercase font-black tracking-wider cursor-pointer flex items-center justify-between select-none">
                                <span>Equipo Sin Hueco ({p.equipoSinHueco?.length || 0})</span>
                                <span className="text-[9px] text-oro/40 group-open:rotate-180 transition-transform">▼</span>
                              </summary>
                              <div className="pt-2">
                                {p.equipoSinHueco && p.equipoSinHueco.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {p.equipoSinHueco.map((eq: any) => {
                                      const isSelf = String(activeCharacter?.id) === p.user_id;
                                      const canToggle = isSelf || canControlTemp;
                                      return (
                                        <button
                                          key={eq.id}
                                          disabled={!canToggle}
                                          onClick={() => {
                                            if (!canToggle) return;
                                            if (isTemp) {
                                              const newSinHueco = (p.equipoSinHueco || []).map((item: any) => item.id === eq.id ? { ...item, usado: !item.usado } : item);
                                              updateTempCharacter(p.user_id, { equipoSinHueco: newSinHueco });
                                              addLog(`**[NPC] ${p.nombre}** marca el objeto **${eq.nombre}** como ${!eq.usado ? 'usado' : 'disponible'}.`);
                                            } else if (localState) {
                                              const currentUsedItems = localState.usedItems || {};
                                              const updatedUsedItems = { ...currentUsedItems, [eq.id]: !currentUsedItems[eq.id] };
                                              const updated = { ...localState, usedItems: updatedUsedItems };
                                              setLocalState(updated);
                                              addLog(`**${activeCharacter?.nombre_ninja || p.nombre}** marca el objeto **${eq.nombre}** como ${updatedUsedItems[eq.id] ? 'usado' : 'disponible'}.`);
                                            }
                                          }}
                                          className={`px-2 py-1 border text-xs font-black transition-all flex items-center justify-between gap-1 rounded-sm ${eq.usado
                                            ? 'bg-red-500/10 border-red-500/30 text-red-400 line-through'
                                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                            } ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
                                          title={canToggle ? `Clic para cambiar estado de ${eq.nombre}` : eq.nombre}
                                        >
                                          <span className="truncate">{eq.nombre}</span>
                                          <span className="shrink-0">{eq.usado ? '✕' : '✓'}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-oro/20 italic block">Sin equipo sin hueco</span>
                                )}
                              </div>
                            </details>
                          </div>
                        </div>
                      )}

                      {/* Active & Cooldown Techniques */}
                      {((p.tecnicasActivas && p.tecnicasActivas.length > 0) || (p.cooldowns && p.cooldowns.length > 0 && p.cooldowns.some((c: any) => (c.reusableAtRound - rondaActual - 1) > 0))) && (
                        <div className="space-y-2 pt-2 border-t border-oro/10 mt-1.5 animate-in fade-in duration-300">
                          {p.tecnicasActivas && p.tecnicasActivas.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] text-emerald-400 uppercase font-black block tracking-wider">Técnicas Activas:</span>
                              <div className="flex flex-wrap gap-1">
                                {p.tecnicasActivas.map((ta: any) => (
                                  <span
                                    key={ta.id}
                                    className="px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-500/30 text-[9px] font-black text-emerald-300 rounded-sm"
                                  >
                                    {ta.nombre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {p.cooldowns && p.cooldowns.length > 0 && p.cooldowns.some((c: any) => (c.reusableAtRound - rondaActual - 1) > 0) && (
                            <div className="space-y-1">
                              <span className="text-[9px] text-red-400 uppercase font-black block tracking-wider">Técnicas en CD:</span>
                              <div className="flex flex-wrap gap-1">
                                {p.cooldowns.map((c: any) => {
                                  const remaining = c.reusableAtRound - rondaActual - 1;
                                  if (remaining <= 0) return null;
                                  const isActive = p.tecnicasActivas?.some((ta: any) => ta.id === c.id);
                                  return (
                                    <span
                                      key={c.id}
                                      className="px-1.5 py-0.5 bg-red-950/40 border border-red-500/30 text-[9px] font-black text-red-400 rounded-sm flex items-center gap-1"
                                    >
                                      <span>{c.nombre}</span>
                                      <span className="text-[8px] font-mono opacity-80">
                                        ({isActive ? 'Pausado' : `${remaining} R`})
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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
                <div className="text-caption font-black text-oro/50 uppercase tracking-widest flex items-center gap-3">
                  <span>Ronda: <span className="text-oro font-bold text-base">{rondaActual}</span></span>
                  {!isEventMode && (
                    <span className="font-mono text-base font-bold text-amber-400 bg-black/40 border border-amber-500/20 px-2 py-0.5 rounded-sm">
                      {formatTimer(elapsedSeconds)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                {!activeCharacter ? (
                  <button
                    disabled
                    className="px-5 py-2.5 text-xs bg-black/40 border border-oro/10 text-oro/40 cursor-not-allowed rounded-sm"
                    title="Los usuarios sin personaje activo solo pueden estar como espectadores en la sala."
                  >
                    Modo Espectador (Sin personaje)
                  </button>
                ) : (
                  <button
                    onClick={toggleJoinCombat}
                    className={`px-5 py-2.5 text-xs ${myIsInCombat
                      ? 'ninja-btn-rojo'
                      : 'ninja-btn-oro'
                      }`}
                  >
                    {myIsInCombat ? 'Salir del Combate' : 'Unirse al Combate'}
                  </button>
                )}

                {!combatStarted ? (
                  <button
                    onClick={startCombat}
                    disabled={turnQueue.length === 0}
                    className="ninja-btn-oro px-5 py-2.5 text-xs flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-naranja-naruto" /> Iniciar Combate
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
                  onClick={forceSync}
                  className="ninja-btn-ghost px-5 py-2.5 text-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sincronizar
                </button>

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

                  const isAdminOrMod = userRoles.some(r => ['admin', 'moderador'].includes(r));
                  const canDeleteAll = isAdminOrMod || (isEventMode && userRoles.includes('narrador'));
                  const isOwnCharacter = activeCharacter && String(activeCharacter.id) === charId;
                  const canDelete = canDeleteAll || isOwnCharacter;

                  return (
                    <div
                      key={`${charId}-${idx}`}
                      className={`flex items-center justify-between p-3 border rounded-sm transition-all ${isActive
                        ? 'bg-oro/10 border-oro shadow-[0_0_15px_rgba(255,230,159,0.15)]'
                        : 'bg-black/30 border-oro/5 hover:border-oro/15'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                          {canDelete && (
                            <button
                              onClick={() => removeFromQueue(charId)}
                              className="p-1 hover:bg-naranja-naruto/10 text-red-500/60 hover:text-red-400 rounded-sm transition-all"
                              title="Retirar de turnos"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
                          <span className="text-[9px] font-black uppercase text-naranja-naruto bg-oro px-1.5 py-0.5 rounded-sm animate-pulse">
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

            {/* COMBAT LOGS & AREA DE COMBATE PANEL */}
            <div className="ninja-card-oro p-6 flex flex-col relative overflow-hidden h-[600px] min-h-[400px]">

              {/* Header Tab Bar (Only in PvP mode) */}
              <div className="flex items-center justify-between border-b border-oro/10 pb-3 mb-3 gap-2">
                {!isEventMode ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPvpTab('logs')}
                      className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all border rounded-sm ${pvpTab === 'logs'
                        ? 'bg-oro text-black border-oro shadow-sm'
                        : 'bg-black/40 text-oro/60 border-oro/10 hover:text-oro'
                        }`}
                    >
                      Registro
                    </button>
                    <button
                      type="button"
                      onClick={() => setPvpTab('grid')}
                      className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all border rounded-sm flex items-center gap-1.5 ${pvpTab === 'grid'
                        ? 'bg-oro text-black border-oro shadow-sm'
                        : 'bg-black/40 text-oro/60 border-oro/10 hover:text-oro'
                        }`}
                    >
                      <span>Área de Combate</span>
                      {gridElements.length > 0 && (
                        <span className="bg-naranja-naruto text-white text-[9px] font-mono px-1.5 py-0.2 rounded-full">
                          {gridElements.length}
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <h3 className="font-black text-sm uppercase tracking-[0.2em]">
                    REGISTRO DE COMBATE
                  </h3>
                )}

                {!isEventMode && pvpTab === 'grid' && gridConfig && (
                  <button
                    type="button"
                    onClick={async () => {
                      const isConfirmed = await confirm({
                        title: "Reiniciar Tablero",
                        message: "¿Deseas limpiar y reiniciar la cuadrícula del terreno de combate?",
                        confirmLabel: "Reiniciar",
                        cancelLabel: "Cancelar",
                        variant: "danger"
                      });
                      if (isConfirmed) {
                        setGridConfig(null);
                        setGridElements([]);
                        setSelectedCells([]);
                        broadcastGridState(null, []);
                        addLog(`**[TERRENO]** El terreno de combate ha sido reiniciado.`);
                      }
                    }}
                    className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-wider bg-red-950/30 border border-red-500/20 px-2.5 py-1 rounded-sm transition-all"
                  >
                    Reiniciar Tablero
                  </button>
                )}
              </div>

              {/* VIEW 1: REGISTRO DE COMBATE (Default for PvE and when tab is 'logs') */}
              {(isEventMode || pvpTab === 'logs') && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Form to insert image (ONLY in PVE / Event mode AND for Admin / Narrator) */}
                  {isEventMode && isAdminOrNarrator && (
                    <div className="flex flex-col sm:flex-row gap-2 mb-3 p-2 bg-black/40 border border-oro/15 rounded-sm shrink-0">
                      <input
                        type="text"
                        placeholder="URL de la imagen..."
                        value={logImageUrl}
                        onChange={(e) => setLogImageUrl(e.target.value)}
                        className="flex-1 bg-black/60 border border-oro/20 text-oro text-xs font-mono px-3 py-1.5 outline-none focus:border-oro transition-all rounded-sm min-w-0"
                      />
                      <input
                        type="text"
                        placeholder="Descripción (opcional)..."
                        value={logImageCaption}
                        onChange={(e) => setLogImageCaption(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendImageToLog();
                        }}
                        className="sm:w-36 bg-black/60 border border-oro/20 text-oro text-xs px-3 py-1.5 outline-none focus:border-oro transition-all rounded-sm min-w-0"
                      />
                      <button
                        type="button"
                        onClick={handleSendImageToLog}
                        className="ninja-btn-oro px-3 py-1.5 text-xs font-black shrink-0 flex items-center justify-center gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Enviar Imagen
                      </button>
                    </div>
                  )}

                  <div
                    className="flex-1 overflow-y-auto space-y-3.5 pr-2 font-mono text-xs text-oro/75 custom-scrollbar"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'IMG' && target.dataset.imgUrl) {
                        setExpandedImage(target.dataset.imgUrl);
                      }
                    }}
                  >
                    {[...logs].reverse().map((log, i) => (
                      <div
                        key={i}
                        className="border-b border-oro/5 pb-2 last:border-0 leading-relaxed animate-fade-in"
                        dangerouslySetInnerHTML={{
                          __html: log
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-oro font-black">$1</strong>')
                            .replace(
                              /\[IMG:(.*?)\]/g,
                              '<div class="mt-2 mb-1"><img src="$1" alt="Ilustración" class="combat-log-img h-20 max-w-[180px] object-cover rounded border border-oro/30 cursor-pointer hover:border-oro hover:scale-[1.03] transition-all shadow-md" data-img-url="$1" title="Haz clic para ampliar imagen" /></div>'
                            )
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
              )}

              {/* VIEW 2: AREA DE COMBATE GRID (PvP Mode Only) */}
              {!isEventMode && pvpTab === 'grid' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                  {!gridConfig ? (
                    /* Setup Grid Configuration Form */
                    <div className="p-6 bg-black/40 border border-oro/15 rounded-sm flex flex-col items-center justify-center space-y-5 my-auto">
                      <h4 className="ninja-title text-base font-black text-oro uppercase tracking-[0.2em] text-center">
                        CONFIGURACIÓN DEL TABLERO DE COMBATE
                      </h4>
                      <p className="text-xs text-oro/60 text-center max-w-md">
                        Indica las dimensiones de casillas (ancho x alto) para crear la cuadrícula del terreno de combate.
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <label className="text-[10px] font-black text-oro/50 uppercase mb-1">Ancho (Cols)</label>
                          <input
                            type="number"
                            min="3"
                            max="100"
                            value={gridWidthInput}
                            onChange={(e) => setGridWidthInput(Math.max(3, Math.min(100, Number(e.target.value) || 3)))}
                            className="w-20 bg-black/60 border border-oro/20 text-center text-white font-mono text-sm font-black p-2 outline-none focus:border-oro rounded-sm"
                          />
                        </div>
                        <span className="text-oro font-black text-lg pt-4">×</span>
                        <div className="flex flex-col items-center">
                          <label className="text-[10px] font-black text-oro/50 uppercase mb-1">Alto (Filas)</label>
                          <input
                            type="number"
                            min="3"
                            max="100"
                            value={gridHeightInput}
                            onChange={(e) => setGridHeightInput(Math.max(3, Math.min(100, Number(e.target.value) || 3)))}
                            className="w-20 bg-black/60 border border-oro/20 text-center text-white font-mono text-sm font-black p-2 outline-none focus:border-oro rounded-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const config = { width: gridWidthInput, height: gridHeightInput };
                          setGridConfig(config);
                          broadcastGridState(config, gridElements);
                          addLog(`**[TABLERO]** **${currentActorName}** crea un tablero de combate de **${gridWidthInput}x${gridHeightInput}** casillas.`);
                        }}
                        className="ninja-btn-oro px-6 py-2.5 text-xs font-black uppercase tracking-wider"
                      >
                        Crear Tablero de Combate
                      </button>
                    </div>
                  ) : (
                    /* Active Grid Display & Interaction */
                    <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

                      {/* Left / Top: Interactive Grid Canvas */}
                      <div
                        className="flex-1 flex flex-col items-center justify-start overflow-auto p-3 bg-black/50 border border-oro/15 rounded-sm min-h-[320px] max-h-[480px] custom-scrollbar select-none relative"
                        onWheel={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            if (e.deltaY < 0) {
                              handleZoomIn();
                            } else {
                              handleZoomOut();
                            }
                          }
                        }}
                      >
                        {/* Zoom Bar */}
                        <div className="flex items-center justify-between w-full mb-2 shrink-0 px-1 border-b border-oro/10 pb-1.5 z-30">
                          <span className="text-[10px] font-mono font-black text-oro/60 uppercase">
                            Zoom: <span className="text-oro font-bold">{Math.round(gridZoom * 100)}%</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleZoomOut}
                              className="px-2 py-0.5 bg-black/60 border border-oro/20 text-oro text-xs font-black hover:border-oro rounded-sm"
                              title="Alejar (Zoom Out)"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={handleResetZoom}
                              className="px-2 py-0.5 bg-black/60 border border-oro/20 text-oro text-[9px] font-mono hover:border-oro rounded-sm"
                              title="Restablecer Zoom (100%)"
                            >
                              100%
                            </button>
                            <button
                              type="button"
                              onClick={handleZoomIn}
                              className="px-2 py-0.5 bg-black/60 border border-oro/20 text-oro text-xs font-black hover:border-oro rounded-sm"
                              title="Acercar (Zoom In)"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div
                          className="inline-block select-none transition-transform duration-150 origin-top"
                          style={{ transform: `scale(${gridZoom})` }}
                        >
                          {/* Column Labels Header */}
                          <div className="flex select-none">
                            <div className="w-6 h-6 shrink-0" />
                            {Array.from({ length: gridConfig.width }, (_, colIdx) => (
                              <div key={colIdx} className="w-7 sm:w-7.5 h-6 flex items-center justify-center text-[10px] font-mono font-black text-oro/60 shrink-0 select-none">
                                {colIdx + 1}
                              </div>
                            ))}
                          </div>

                          {/* Grid Rows */}
                          {Array.from({ length: gridConfig.height }, (_, rowIdx) => (
                            <div key={rowIdx} className="flex items-center select-none">
                              {/* Row Label */}
                              <div className="w-6 h-7 sm:h-7.5 flex items-center justify-center text-[10px] font-mono font-black text-oro/60 shrink-0 select-none">
                                {getCellLabel(rowIdx, 0).replace(/\d+$/, '')}
                              </div>

                              {/* Row Cells */}
                              {Array.from({ length: gridConfig.width }, (_, colIdx) => {
                                const cellKey = getCellLabel(rowIdx, colIdx);
                                const isSelected = selectedCells.includes(cellKey);
                                const matchingEls = gridElements.filter(el => el.cells.includes(cellKey));
                                const topElement = matchingEls[0];

                                return (
                                  <button
                                    key={colIdx}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleCellMouseDown(cellKey);
                                    }}
                                    onMouseEnter={() => handleCellMouseEnter(cellKey)}
                                    className={`w-7 h-7 sm:w-7.5 sm:h-7.5 m-[1px] rounded-xs border-2 select-none flex flex-col items-center justify-center relative cursor-pointer group ${isSelected
                                      ? 'border-oro bg-oro/40 text-white font-black z-20 shadow-md shadow-oro/20'
                                      : topElement
                                        ? 'border-transparent shadow-sm'
                                        : 'border-oro/15 bg-black/60 hover:border-oro/50 hover:bg-oro/10 text-oro/30'
                                      }`}
                                    style={{
                                      backgroundColor: topElement ? `${topElement.color}45` : undefined,
                                      borderColor: topElement ? topElement.color : undefined
                                    }}
                                    title={topElement ? `${cellKey}: ${topElement.name} (Por: ${topElement.createdByName} | ⏳ ${topElement.durationValue} ${topElement.durationUnit})` : cellKey}
                                  >
                                    {topElement ? (
                                      <span className="text-[10px] font-black uppercase text-white drop-shadow-md select-none">
                                        {topElement.name.charAt(0)}
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-mono text-oro/30 group-hover:text-oro/80 select-none">
                                        {cellKey}
                                      </span>
                                    )}

                                    {/* Tooltip on hover */}
                                    {topElement && (
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col bg-black/95 border border-oro/40 text-[9px] font-mono p-1.5 rounded shadow-2xl z-30 whitespace-nowrap pointer-events-none">
                                        <span className="font-bold text-white">{topElement.name}</span>
                                        <span className="text-oro/60">Casilla: {cellKey}</span>
                                        <span className="text-amber-400">⏳ {topElement.durationValue} {topElement.durationUnit}</span>
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right / Bottom: Controls & Active Elements Panel */}
                      <div className="w-full lg:w-72 flex flex-col gap-3 shrink-0">

                        {/* Form to Add Element */}
                        <div className="p-3 bg-black/40 border border-oro/15 rounded-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-oro/60 uppercase">NUEVO ELEMENTO:</span>
                            {selectedCells.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedCells([])}
                                className="text-[9px] font-black text-oro/40 hover:text-oro underline"
                              >
                                Limpiar ({selectedCells.length})
                              </button>
                            )}
                          </div>

                          <div className="text-[10px] font-mono text-oro font-black bg-black/60 border border-oro/10 p-1.5 rounded-sm min-h-[28px] truncate">
                            {selectedCells.length > 0 ? `Casillas: ${selectedCells.join(', ')}` : <span className="text-oro/30 italic">Haz clic en casillas del tablero</span>}
                          </div>

                          <input
                            type="text"
                            placeholder="Nombre (Ej: Muro de Tierra)..."
                            value={elementNameInput}
                            onChange={(e) => setElementNameInput(e.target.value)}
                            className="w-full bg-black/60 border border-oro/20 text-oro text-xs font-sans px-2.5 py-1.5 outline-none focus:border-oro transition-all rounded-sm"
                          />

                          <div className="flex gap-2">
                            <div className="flex-1 flex flex-col">
                              <label className="text-[9px] font-black text-oro/40 uppercase mb-0.5">Duración</label>
                              <input
                                type="number"
                                min="1"
                                value={elementDurationVal}
                                onChange={(e) => setElementDurationVal(Math.max(1, Number(e.target.value) || 1))}
                                className="bg-black/60 border border-oro/20 text-white text-xs font-mono px-2 py-1 outline-none focus:border-oro rounded-sm"
                              />
                            </div>
                            <div className="flex-1 flex flex-col">
                              <label className="text-[9px] font-black text-oro/40 uppercase mb-0.5">Unidad</label>
                              <select
                                value={elementDurationUnit}
                                onChange={(e) => setElementDurationUnit(e.target.value as 'rondas' | 'acciones')}
                                className="bg-black/60 border border-oro/20 text-oro text-xs font-black px-2 py-1 outline-none focus:border-oro rounded-sm"
                              >
                                <option value="rondas">Rondas</option>
                                <option value="acciones">Acciones</option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (selectedCells.length === 0) {
                                addToast("Selecciona al menos una casilla en el tablero.", "error");
                                return;
                              }
                              if (!elementNameInput.trim()) {
                                addToast("Ingresa un nombre para el elemento del terreno.", "error");
                                return;
                              }
                              const color = getRandomElementColor();
                              const newEl: GridElement = {
                                id: `el_${Date.now()}_${Math.random()}`,
                                name: elementNameInput.trim(),
                                color,
                                cells: [...selectedCells],
                                durationUnit: elementDurationUnit,
                                durationValue: elementDurationVal,
                                createdByName: currentActorName,
                                createdById: currentActorId,
                                createdInTurnKey: `${rondaActual}_${currentTurnIndex}`
                              };
                              const updated = [...gridElements, newEl];
                              setGridElements(updated);
                              setSelectedCells([]);
                              setElementNameInput('');
                              broadcastGridState(gridConfig, updated);
                              addLog(`**[TERRENO]** **${currentActorName}** coloca **${newEl.name}** en ${newEl.cells.join(', ')} (${newEl.durationValue} ${newEl.durationUnit}).`);
                            }}
                            className="w-full ninja-btn-oro py-2 text-xs font-black uppercase tracking-wider"
                          >
                            Colocar Elemento
                          </button>
                        </div>

                        {/* Active Elements Legend / List */}
                        <div className="flex-1 bg-black/40 border border-oro/15 rounded-sm p-3 flex flex-col min-h-[140px] max-h-[220px]">
                          <span className="text-[10px] font-black text-oro/60 uppercase mb-2 block border-b border-oro/10 pb-1">
                            ELEMENTOS EN TERRENO ({gridElements.length})
                          </span>

                          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {gridElements.map((el) => {
                              const isAdminOrMod = userRoles.some(r => ['admin', 'moderador'].includes(r));
                              const isCreator = (el.createdById && el.createdById === currentActorId) || (el.createdByName && el.createdByName === currentActorName);
                              const canDeleteElement = isCreator || isAdminOrMod;

                              return (
                                <div
                                  key={el.id}
                                  className="bg-black/60 border border-oro/10 p-2 rounded-sm flex items-center justify-between text-xs gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-3 h-3 rounded-xs shrink-0"
                                      style={{ backgroundColor: el.color }}
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-white truncate text-[11px]">{el.name}</span>
                                      <span className="text-[9px] font-mono text-oro/50 truncate">
                                        {el.cells.join(', ')} | {el.durationValue} {el.durationUnit} ({el.createdByName})
                                      </span>
                                    </div>
                                  </div>
                                  {canDeleteElement ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = gridElements.filter(e => e.id !== el.id);
                                        setGridElements(updated);
                                        broadcastGridState(gridConfig, updated);
                                        addLog(`**[TERRENO]** Elemento **${el.name}** retirado por **${currentActorName}**.`);
                                      }}
                                      className="text-red-400/60 hover:text-red-400 p-1 shrink-0 transition-all"
                                      title="Eliminar elemento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span
                                      className="text-oro/20 p-1 shrink-0 cursor-not-allowed"
                                      title={`Solo ${el.createdByName} puede eliminar este elemento`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 opacity-25" />
                                    </span>
                                  )}
                                </div>
                              );
                            })}

                            {gridElements.length === 0 && (
                              <div className="text-[10px] text-oro/30 italic text-center py-4">
                                Sin elementos en el terreno
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* COLUMN 4: BANDO B */}
          <div className="lg:col-span-1 flex flex-col gap-4 ninja-card-oro p-6 relative overflow-hidden h-full min-h-0">
            <div className="flex items-center justify-between border-b border-oro/10 pb-4 mb-2 gap-2 shrink-0">
              <h2 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2 shrink-0">
                BANDO B
              </h2>
              {/* Bando Selector for Self */}
              {myIsInCombat && myBando !== 'B' && (
                <button
                  onClick={() => selectBando('B')}
                  className="ninja-btn-oro py-1.5 px-4 text-xs text-center"
                >
                  Unirse
                </button>
              )}
              <span className="text-caption font-black bg-oro/10 border border-oro/30 text-oro px-2.5 py-0.5 rounded-sm shrink-0">
                {bandoBParticipants.length} ninjas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 mt-2 min-h-0 border-t border-oro/5 pt-2">
              {bandoBParticipants.map(p => {
                const isTemp = !!tempCharacters[p.user_id];
                const canControlTemp = isTemp && isAdminOrNarrator;
                return (
                  <div key={p.user_id} className={`border p-4 rounded-sm hover:border-oro/80 transition-all ${isTemp ? 'bg-purple-950/20 border-purple-500/40' : 'bg-black/40 border-oro/60'}`}>
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
                            {p.isInCombat && !isTemp && (
                              <span className="text-[9px] font-black uppercase text-naranja-naruto bg-naranja-naruto/20 border border-naranja-naruto/40 px-1 rounded-sm">JUGADOR</span>
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
                            onClick={() => openEditTempModal(p.user_id)}
                            className="p-1 text-oro/40 hover:text-oro hover:bg-oro/10 rounded-sm transition-all"
                            title="Editar NPC"
                          >
                            <Pencil className="w-3.5 h-3.5" />
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
                      {(!p.ocultar_vit || isAdminOrNarrator) && (
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-black mb-1">
                            <span className="text-red-400">
                              VIT {p.ocultar_vit && <span className="text-purple-400 text-[8px] font-black uppercase tracking-wider">(Oculta)</span>}
                            </span>
                            <div className="flex items-center gap-1">
                              {canControlTemp && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isHidden = !!p.ocultar_vit;
                                    updateTempCharacter(p.user_id, { ocultar_vit: !isHidden });
                                    addLog(`**[NPC] ${p.nombre}** ahora tiene su vitalidad **${!isHidden ? 'oculta' : 'visible'}**.`);
                                  }}
                                  className={`p-0.5 rounded-sm transition-all hover:bg-oro/10 ${p.ocultar_vit ? 'text-amber-500 hover:text-amber-400' : 'text-oro/40 hover:text-oro'}`}
                                  title={p.ocultar_vit ? "Mostrar vitalidad" : "Ocultar vitalidad"}
                                >
                                  {p.ocultar_vit ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              <span>{p.estado?.vit} / {p.estado?.maxVit}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(p.estado?.vit / p.estado?.maxVit) * 100}%` }} />
                          </div>
                        </div>
                      )}
                      {!isEventMode && (() => {
                        const chVal = String(activeCharacter?.id) === p.user_id ? (localState?.ch ?? p.estado?.ch ?? 0) : (p.estado?.ch ?? 0);
                        const maxChVal = String(activeCharacter?.id) === p.user_id ? (localState?.maxCh ?? p.estado?.maxCh ?? 0) : (p.estado?.maxCh ?? 0);
                        const chPct = maxChVal > 0 ? Math.round((chVal / maxChVal) * 100) : 0;
                        return (
                          <div>
                            <div className="flex justify-between text-[10px] font-black mb-1">
                              <span className="text-blue-400">CH</span>
                              <span>
                                {chVal} / {maxChVal} <span className="text-blue-300/80 font-mono font-bold text-[9px]">({chPct}%)</span>
                              </span>
                            </div>
                            <div className="h-2 bg-black/60 border border-oro/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${maxChVal > 0 ? (chVal / maxChVal) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}

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
                                if (p.ocultar_vit) {
                                  addLog(`**[NPC] ${p.nombre}** recibe **${val}** de daño.`);
                                } else {
                                  addLog(`**[NPC] ${p.nombre}** recibe **${val}** de daño. VIT: **${newVit}**/**${p.estado?.maxVit}**.`);
                                }
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
                                if (p.ocultar_vit) {
                                  addLog(`**[NPC] ${p.nombre}** se cura **+${val}** VIT.`);
                                } else {
                                  addLog(`**[NPC] ${p.nombre}** se cura **+${val}** VIT. VIT: **${newVit}**/**${p.estado?.maxVit}**.`);
                                }
                                el.value = '';
                              }
                            }}
                            className="flex-1 py-1 text-[9px] font-black bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/60 transition-all rounded-sm"
                          >Sanar</button>
                        </div>
                      )}

                      {!isTemp && (
                        <div className="flex flex-col gap-2 text-[10px] font-black pt-2 border-t border-oro/10 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500 uppercase tracking-wider">VEL:</span>
                            {String(activeCharacter?.id) === p.user_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentVel = localState?.vel ?? p.estado?.vel ?? 0;
                                    const newVel = Math.max(0, currentVel - 1);
                                    if (localState) setLocalState(prev => prev ? { ...prev, vel: newVel } : null);
                                    addLog(`**${p.nombre}** reduce su velocidad a **${newVel}**.`);
                                  }}
                                  className="w-4 h-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-[10px] active:scale-95 cursor-pointer"
                                  title="Bajar velocidad"
                                >
                                  -
                                </button>
                                <span className="text-white min-w-[16px] text-center">{localState?.vel ?? p.estado?.vel ?? 0}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentVel = localState?.vel ?? p.estado?.vel ?? 0;
                                    const newVel = currentVel + 1;
                                    if (localState) setLocalState(prev => prev ? { ...prev, vel: newVel } : null);
                                    addLog(`**${p.nombre}** aumenta su velocidad a **${newVel}**.`);
                                  }}
                                  className="w-4 h-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-[10px] active:scale-95 cursor-pointer"
                                  title="Subir velocidad"
                                >
                                  +
                                </button>
                              </div>
                            ) : isTemp ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentVel = p.estado?.vel ?? 0;
                                    const newVel = Math.max(0, currentVel - 1);
                                    updateTempCharacter(p.user_id, { estado: { ...p.estado, vel: newVel } });
                                    addLog(`**${p.nombre}** ajusta su velocidad a **${newVel}**.`);
                                  }}
                                  className="w-4 h-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-[10px] active:scale-95 cursor-pointer"
                                  title="Bajar velocidad"
                                >
                                  -
                                </button>
                                <span className="text-white min-w-[16px] text-center">{p.estado?.vel ?? 0}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentVel = p.estado?.vel ?? 0;
                                    const newVel = currentVel + 1;
                                    updateTempCharacter(p.user_id, { estado: { ...p.estado, vel: newVel } });
                                    addLog(`**${p.nombre}** ajusta su velocidad a **${newVel}**.`);
                                  }}
                                  className="w-4 h-4 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-[10px] active:scale-95 cursor-pointer"
                                  title="Subir velocidad"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="text-white">{p.estado?.vel ?? 0}</span>
                            )}
                          </div>
                          {!isEventMode && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-400 uppercase tracking-wider">KAWARIMI:</span>
                              <div className="flex gap-1">
                                {Array.from({ length: String(activeCharacter?.id) === p.user_id ? (localState?.maxKawarimi ?? p.estado?.maxKawarimi ?? 1) : (p.estado?.maxKawarimi || 1) }, (_, i) => i + 1).map((num) => {
                                  const effectiveKawarimi = String(activeCharacter?.id) === p.user_id ? (localState?.kawarimi ?? p.estado?.kawarimi ?? 0) : (p.estado?.kawarimi ?? 0);
                                  const isUsed = effectiveKawarimi >= num;
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
                                        addLog(`**${activeCharacter?.nombre_ninja || p.nombre}** marca Kawarimi ${newKawarimi >= num ? 'usado' : 'recuperado'} (${newKawarimi}/${localState.maxKawarimi}).`);
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
                          {!isEventMode && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black">
                              <span className="text-blue-400 uppercase tracking-wider">CH CONSTANTE:</span>
                              <button
                                type="button"
                                disabled={String(activeCharacter?.id) !== p.user_id}
                                onClick={() => {
                                  const isSelf = String(activeCharacter?.id) === p.user_id;
                                  if (!isSelf || !localState) return;
                                  toggleConstantCh(!localState.chConstanteActive);
                                }}
                                className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center text-[8px] transition-all font-black ${String(activeCharacter?.id) === p.user_id
                                  ? (localState?.chConstanteActive
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'
                                    : 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30')
                                  : (p.estado?.chConstanteActive
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                    : 'bg-red-500/20 border-red-500 text-red-500')
                                  } ${String(activeCharacter?.id) === p.user_id ? 'cursor-pointer' : 'cursor-default'}`}
                                title={String(activeCharacter?.id) === p.user_id ? (localState?.chConstanteActive ? 'Desactivar CH constante' : 'Activar CH constante') : (p.estado?.chConstanteActive ? 'CH constante activo' : 'CH constante inactivo')}
                              >
                                {String(activeCharacter?.id) === p.user_id ? (localState?.chConstanteActive ? '✕' : '✓') : (p.estado?.chConstanteActive ? '✕' : '✓')}
                              </button>
                              <span className={`font-mono font-black text-[9px] uppercase tracking-wider ${String(activeCharacter?.id) === p.user_id ? 'text-blue-100' : 'text-blue-200/80'}`}>
                                {String(activeCharacter?.id) === p.user_id ? (localState?.chConstanteActive ? 'Activo' : 'Inactivo') : (p.estado?.chConstanteActive ? 'Activo' : 'Inactivo')}
                              </span>
                              <span className="font-mono text-[9px] font-black text-blue-100 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-sm">
                                -{String(activeCharacter?.id) === p.user_id ? (localState?.chConstanteCost ?? 0) : (p.estado?.chConstanteCost ?? 0)} CH/Ronda
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {isEventMode && (
                        <div className="space-y-2.5 pt-2 border-t border-oro/10 mt-1 animate-in fade-in duration-300">
                          {/* Traits (Rasgos) */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-oro/60 uppercase font-black block tracking-wider">Rasgos:</span>
                            {p.rasgos && p.rasgos.length > 0 ? (
                              <div className="grid grid-cols-3 gap-1.5">
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
                                          addLog(`**${activeCharacter?.nombre_ninja || p.nombre}** marca el rasgo **${r.nombre}** como ${updatedUsed[r.id] ? 'usado' : 'disponible'}.`);
                                        }
                                      }}
                                      className={`px-2 py-1 border text-xs font-black transition-all flex items-center justify-between gap-1 rounded-sm ${r.usado ? 'bg-red-500/10 border-red-500/30 text-red-400 line-through' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'} ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
                                      title={canToggle ? `Haga clic para cambiar estado de ${r.nombre}` : r.nombre}
                                    >
                                      <span className="truncate">{r.nombre}</span>
                                      <span className="shrink-0">{r.usado ? '✕' : '✓'}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[10px] text-oro/20 italic block">Sin rasgos</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-oro/60 uppercase font-black block tracking-wider">Equipo Equipado:</span>
                            {p.equipo && p.equipo.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.equipo.map((eq: any) => (
                                  <span key={eq.id} className="px-2 py-1 bg-black/40 border border-oro/10 text-xs font-black text-oro/80 rounded-sm">{eq.nombre}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-oro/20 italic block">Sin equipo equipado</span>
                            )}
                          </div>

                          {/* Equipo Sin Hueco (Desplegable - Abierto por defecto) */}
                          <div className="space-y-1 pt-1">
                            <details open className="group border border-oro/10 rounded-sm bg-black/30 p-2">
                              <summary className="text-[10px] text-oro/70 hover:text-oro uppercase font-black tracking-wider cursor-pointer flex items-center justify-between select-none">
                                <span>Equipo Sin Hueco ({p.equipoSinHueco?.length || 0})</span>
                                <span className="text-[9px] text-oro/40 group-open:rotate-180 transition-transform">▼</span>
                              </summary>
                              <div className="pt-2">
                                {p.equipoSinHueco && p.equipoSinHueco.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {p.equipoSinHueco.map((eq: any) => {
                                      const isSelf = String(activeCharacter?.id) === p.user_id;
                                      const canToggle = isSelf || canControlTemp;
                                      return (
                                        <button
                                          key={eq.id}
                                          disabled={!canToggle}
                                          onClick={() => {
                                            if (!canToggle) return;
                                            if (isTemp) {
                                              const newSinHueco = (p.equipoSinHueco || []).map((item: any) => item.id === eq.id ? { ...item, usado: !item.usado } : item);
                                              updateTempCharacter(p.user_id, { equipoSinHueco: newSinHueco });
                                              addLog(`**[NPC] ${p.nombre}** marca el objeto **${eq.nombre}** como ${!eq.usado ? 'usado' : 'disponible'}.`);
                                            } else if (localState) {
                                              const currentUsedItems = localState.usedItems || {};
                                              const updatedUsedItems = { ...currentUsedItems, [eq.id]: !currentUsedItems[eq.id] };
                                              const updated = { ...localState, usedItems: updatedUsedItems };
                                              setLocalState(updated);
                                              addLog(`**${activeCharacter?.nombre_ninja || p.nombre}** marca el objeto **${eq.nombre}** como ${updatedUsedItems[eq.id] ? 'usado' : 'disponible'}.`);
                                            }
                                          }}
                                          className={`px-2 py-1 border text-xs font-black transition-all flex items-center justify-between gap-1 rounded-sm ${eq.usado
                                            ? 'bg-red-500/10 border-red-500/30 text-red-400 line-through'
                                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                            } ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
                                          title={canToggle ? `Clic para cambiar estado de ${eq.nombre}` : eq.nombre}
                                        >
                                          <span className="truncate">{eq.nombre}</span>
                                          <span className="shrink-0">{eq.usado ? '✕' : '✓'}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-oro/20 italic block">Sin equipo sin hueco</span>
                                )}
                              </div>
                            </details>
                          </div>
                        </div>
                      )}

                      {/* Active & Cooldown Techniques */}
                      {((p.tecnicasActivas && p.tecnicasActivas.length > 0) || (p.cooldowns && p.cooldowns.length > 0 && p.cooldowns.some((c: any) => (c.reusableAtRound - rondaActual - 1) > 0))) && (
                        <div className="space-y-2 pt-2 border-t border-oro/10 mt-1.5 animate-in fade-in duration-300">
                          {p.tecnicasActivas && p.tecnicasActivas.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] text-emerald-400 uppercase font-black block tracking-wider">Técnicas Activas:</span>
                              <div className="flex flex-wrap gap-1">
                                {p.tecnicasActivas.map((ta: any) => (
                                  <span
                                    key={ta.id}
                                    className="px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-500/30 text-[9px] font-black text-emerald-300 rounded-sm"
                                  >
                                    {ta.nombre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {p.cooldowns && p.cooldowns.length > 0 && p.cooldowns.some((c: any) => (c.reusableAtRound - rondaActual - 1) > 0) && (
                            <div className="space-y-1">
                              <span className="text-[9px] text-red-400 uppercase font-black block tracking-wider">Técnicas en CD:</span>
                              <div className="flex flex-wrap gap-1">
                                {p.cooldowns.map((c: any) => {
                                  const remaining = c.reusableAtRound - rondaActual - 1;
                                  if (remaining <= 0) return null;
                                  const isActive = p.tecnicasActivas?.some((ta: any) => ta.id === c.id);
                                  return (
                                    <span
                                      key={c.id}
                                      className="px-1.5 py-0.5 bg-red-950/40 border border-red-500/30 text-[9px] font-black text-red-400 rounded-sm flex items-center gap-1"
                                    >
                                      <span>{c.nombre}</span>
                                      <span className="text-[8px] font-mono opacity-80">
                                        ({isActive ? 'Pausado' : `${remaining} R`})
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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

        {/* BOTTOM PANEL: CONSOLE CONTROLS */}
        {!activeCharacter && !(isAdminOrNarrator && isEventMode) ? (
          <div className="ninja-card-oro p-6 text-center text-oro/40 text-xs font-black uppercase tracking-widest">
            Modo Espectador / Staff — Sin personaje activo seleccionado
          </div>
        ) : (
          <section className="ninja-card-oro p-6 md:p-8 relative animate-in fade-in duration-300" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
            
            {/* CONSOLE MODE SELECTOR (Only in Event Mode for Staff) */}
            {isAdminOrNarrator && isEventMode && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-oro/15 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-oro/60 uppercase tracking-widest">Modo Consola:</span>
                  {activeCharacter && (
                    <button
                      type="button"
                      onClick={() => setActiveConsoleMode('jugador')}
                      className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-sm transition-all border ${activeConsoleMode === 'jugador'
                        ? 'bg-naranja-naruto text-black border-naranja-naruto shadow-md'
                        : 'bg-black/40 text-oro/60 border-oro/20 hover:text-oro'}`}
                    >
                      Jugador
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveConsoleMode('narrador');
                      const firstNpc = Object.values(tempCharacters)[0];
                      if (firstNpc && (rollTargetId === 'self' || rollTargetId === 'narrator')) {
                        setRollTargetId(firstNpc.user_id);
                      }
                    }}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-sm transition-all border ${activeConsoleMode === 'narrador'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                      : 'bg-black/40 text-oro/60 border-oro/20 hover:text-oro'}`}
                  >
                    Narrador
                  </button>
                </div>

                {activeConsoleMode === 'narrador' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-purple-300 uppercase tracking-wider">Tirar / Controlar como:</span>
                    <NinjaSelect
                      value={rollTargetId}
                      onChange={(val) => setRollTargetId(val)}
                      placeholder="SELECCIONAR NPC..."
                      options={Object.values(tempCharacters).map(tc => ({
                        label: `[NPC] ${tc.nombre}`,
                        value: tc.user_id
                      }))}
                      variant="inline"
                      className="max-w-[220px]"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

              {/* 1. STATUS & TRAITS/ITEMS PANEL */}
              <div className={`space-y-5 ${isEventMode && activeConsoleMode === 'narrador' ? 'xl:col-span-5' : 'xl:col-span-3'}`}>
                <h3 className="font-black text-sm uppercase tracking-[0.2em] border-b border-oro/10 pb-3 flex items-center gap-2.5">
                  {isEventMode && activeConsoleMode === 'narrador' ? 'ESTADO DEL NPC / EMISOR' : 'TU ESTADO EN COMBATE'}
                </h3>

                {isEventMode && activeConsoleMode === 'narrador' ? (
                  selectedNpc ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black border border-purple-500/40 overflow-hidden flex items-center justify-center shrink-0">
                          {selectedNpc.url_img ? (
                            <img src={selectedNpc.url_img} alt="Avatar" className="w-full h-full object-cover object-top" />
                          ) : (
                            <span className="text-purple-400 font-black text-sm">{selectedNpc.nombre.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm text-purple-300 uppercase tracking-wider">{selectedNpc.nombre}</div>
                          <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-950/40 border border-purple-500/20 px-1 rounded-sm">NPC</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-black mb-1.5">
                          <span className="text-red-400">VITALIDAD (VIT)</span>
                          <span>{selectedNpc.estado?.vit ?? (selectedNpc.estado?.maxVit ?? 30)} / {selectedNpc.estado?.maxVit ?? 30}</span>
                        </div>
                        <div className="h-4 bg-black/60 border border-oro/15 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300" style={{ width: `${((selectedNpc.estado?.vit ?? (selectedNpc.estado?.maxVit ?? 30)) / (selectedNpc.estado?.maxVit ?? 30)) * 100}%` }} />
                        </div>
                      </div>

                      {/* NPC RASGOS */}
                      <div className="space-y-1.5 pt-3 border-t border-oro/10">
                        <span className="text-[10px] text-oro/60 uppercase font-black block tracking-wider">Rasgos:</span>
                        {selectedNpc.rasgos && selectedNpc.rasgos.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            {selectedNpc.rasgos.map((r: any) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  const newRasgos = (selectedNpc.rasgos || []).map((rr: any) => rr.id === r.id ? { ...rr, usado: !rr.usado } : rr);
                                  updateTempCharacter(selectedNpc.user_id, { rasgos: newRasgos });
                                  addLog(`**[NPC] ${selectedNpc.nombre}** marca el rasgo **${r.nombre}** como ${!r.usado ? 'usado' : 'disponible'}.`);
                                }}
                                className={`px-2 py-1 border text-xs font-black transition-all flex items-center justify-between gap-1 rounded-sm cursor-pointer ${r.usado
                                  ? 'bg-red-500/10 border-red-500/30 text-red-400 line-through'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}
                              >
                                <span className="truncate">{r.nombre}</span>
                                <span className="shrink-0">{r.usado ? '✕' : '✓'}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-oro/20 italic block">Sin rasgos</span>
                        )}
                      </div>

                      {/* NPC EQUIPO EQUIPADO */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] text-oro/60 uppercase font-black block tracking-wider">Equipo Equipado:</span>
                        {selectedNpc.equipo && selectedNpc.equipo.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedNpc.equipo.map((eq: any) => (
                              <span key={eq.id} className="px-2 py-1 bg-black/40 border border-oro/10 text-xs font-black text-oro/80 rounded-sm">
                                {eq.nombre}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-oro/20 italic block">Sin equipo equipado</span>
                        )}
                      </div>

                      {/* NPC EQUIPO SIN HUECO */}
                      <div className="space-y-1 pt-1">
                        <details open className="group border border-oro/10 rounded-sm bg-black/30 p-2">
                          <summary className="text-[10px] text-oro/70 hover:text-oro uppercase font-black tracking-wider cursor-pointer flex items-center justify-between select-none">
                            <span>Equipo Sin Hueco ({selectedNpc.equipoSinHueco?.length || 0})</span>
                            <span className="text-[9px] text-oro/40 group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="pt-2">
                            {selectedNpc.equipoSinHueco && selectedNpc.equipoSinHueco.length > 0 ? (
                              <div className="space-y-1">
                                {selectedNpc.equipoSinHueco.map((sh: any) => (
                                  <div key={sh.id} className="flex items-center justify-between gap-1 text-xs font-black p-1 bg-black/40 border border-oro/5 rounded-sm">
                                    <span className={sh.usado ? 'text-red-400 line-through' : 'text-emerald-400'}>{sh.nombre}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSinHueco = (selectedNpc.equipoSinHueco || []).map((item: any) => item.id === sh.id ? { ...item, usado: !item.usado } : item);
                                        updateTempCharacter(selectedNpc.user_id, { equipoSinHueco: newSinHueco });
                                        addLog(`**[NPC] ${selectedNpc.nombre}** marca **${sh.nombre}** como ${!sh.usado ? 'usado' : 'disponible'}.`);
                                      }}
                                      className={`w-4 h-4 border rounded-sm flex items-center justify-center text-[9px] font-black ${sh.usado ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'}`}
                                    >
                                      {sh.usado ? '✕' : '✓'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-oro/20 italic block">Sin equipo sin hueco</span>
                            )}
                          </div>
                        </details>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-black/40 border border-oro/10 text-center text-xs font-black text-oro/50 uppercase tracking-widest rounded-sm">
                      Modo Narrador Activo — Tiradas sin ficha ligada
                    </div>
                  )
                ) : (
                  localState && (
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
                            <span>
                              {localState.ch} / {localState.maxCh}{' '}
                              <span className="text-blue-300/80 font-mono font-bold text-xs">
                                ({localState.maxCh > 0 ? Math.round((localState.ch / localState.maxCh) * 100) : 0}%)
                              </span>
                            </span>
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
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentVel = localState.vel || 0;
                                const newVel = Math.max(0, currentVel - 1);
                                const updated = { ...localState, vel: newVel };
                                setLocalState(updated);
                                addLog(`**${activeCharacter?.nombre_ninja}** disminuye su velocidad a **${newVel}**.`);
                              }}
                              className="w-5 h-5 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-xs active:scale-95 cursor-pointer"
                              title="Disminuir velocidad (-1)"
                            >
                              -
                            </button>
                            <span className="text-white text-sm font-bold min-w-[20px] text-center">{localState.vel}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentVel = localState.vel || 0;
                                const newVel = currentVel + 1;
                                const updated = { ...localState, vel: newVel };
                                setLocalState(updated);
                                addLog(`**${activeCharacter?.nombre_ninja}** aumenta su velocidad a **${newVel}**.`);
                              }}
                              className="w-5 h-5 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 font-black flex items-center justify-center rounded-sm transition-all text-xs active:scale-95 cursor-pointer"
                              title="Aumentar velocidad (+1)"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {!isEventMode && (
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
                                      addLog(`**${activeCharacter?.nombre_ninja}** marca Kawarimi ${newKawarimi >= num ? 'usado' : 'recuperado'} (${newKawarimi}/${localState.maxKawarimi}).`);
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
                        )}
                      </div>

                      {/* PLAYER RASGOS */}
                      <div className="space-y-1.5 pt-3 border-t border-oro/10">
                        <span className="text-[10px] text-oro/60 uppercase font-black block tracking-wider">Rasgos:</span>
                        {activeCharacter?.personajes_rasgos && activeCharacter.personajes_rasgos.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            {(activeCharacter.personajes_rasgos || []).map((r: any) => {
                              const traitId = r.info_rasgos?.id || r.rasgo_id;
                              const traitName = r.info_rasgos?.nombre || 'Rasgo';
                              const isUsed = localState.usedTraits?.[traitId] ?? false;
                              return (
                                <button
                                  key={traitId}
                                  type="button"
                                  onClick={() => {
                                    const currentUsed = localState.usedTraits || {};
                                    const updatedUsed = { ...currentUsed, [traitId]: !currentUsed[traitId] };
                                    const updated = { ...localState, usedTraits: updatedUsed };
                                    setLocalState(updated);
                                    addLog(`**${activeCharacter?.nombre_ninja}** marca el rasgo **${traitName}** como ${updatedUsed[traitId] ? 'usado' : 'disponible'}.`);
                                  }}
                                  className={`px-2 py-1 border text-xs font-black transition-all flex items-center justify-between gap-1 rounded-sm cursor-pointer ${isUsed
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400 line-through'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}
                                >
                                  <span className="truncate">{traitName}</span>
                                  <span className="shrink-0">{isUsed ? '✕' : '✓'}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-oro/20 italic block">Sin rasgos</span>
                        )}
                      </div>

                      {/* PLAYER EQUIPO EQUIPADO */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] text-oro/60 uppercase font-black block tracking-wider">Equipo Equipado:</span>
                        {activeCharacter?.personajes_inventario && activeCharacter.personajes_inventario.filter(i => i.equipado).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(activeCharacter.personajes_inventario || []).filter(i => i.equipado).map((eq: any) => (
                              <span key={eq.id || eq.item_id} className="px-2 py-1 bg-black/40 border border-oro/10 text-xs font-black text-oro/80 rounded-sm">
                                {eq.info_glosario?.nombre_es || eq.info_glosario?.nombre_jp || 'Objeto'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-oro/20 italic block">Sin equipo equipado</span>
                        )}
                      </div>

                      {/* PLAYER EQUIPO SIN HUECO */}
                      <div className="space-y-1 pt-1">
                        {(() => {
                          const sinHueco = activeCharacter?.personajes_inventario?.filter(pi => pi.info_glosario?.ocupa_espacio === false) || [];
                          return (
                            <details open className="group border border-oro/10 rounded-sm bg-black/30 p-2">
                              <summary className="text-[10px] text-oro/70 hover:text-oro uppercase font-black tracking-wider cursor-pointer flex items-center justify-between select-none">
                                <span>Equipo Sin Hueco ({sinHueco.length})</span>
                                <span className="text-[9px] text-oro/40 group-open:rotate-180 transition-transform">▼</span>
                              </summary>
                              <div className="pt-2">
                                {sinHueco.length > 0 ? (
                                  <div className="space-y-1">
                                    {sinHueco.map((sh: any) => {
                                      const itemId = sh.info_glosario?.id || sh.item_id || sh.id;
                                      const itemName = sh.info_glosario?.nombre_es || sh.info_glosario?.nombre_jp || 'Objeto';
                                      const isUsed = localState.usedItems?.[itemId] ?? false;
                                      return (
                                        <div key={sh.id || itemId} className="flex items-center justify-between gap-1 text-xs font-black p-1 bg-black/40 border border-oro/5 rounded-sm">
                                          <span className={isUsed ? 'text-red-400 line-through' : 'text-emerald-400'}>{itemName}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const currentUsed = localState.usedItems || {};
                                              const updatedUsed = { ...currentUsed, [itemId]: !currentUsed[itemId] };
                                              const updated = { ...localState, usedItems: updatedUsed };
                                              setLocalState(updated);
                                              addLog(`**${activeCharacter?.nombre_ninja}** marca **${itemName}** como ${updatedUsed[itemId] ? 'usado' : 'disponible'}.`);
                                            }}
                                            className={`w-4 h-4 border rounded-sm flex items-center justify-center text-[9px] font-black ${isUsed ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30'}`}
                                          >
                                            {isUsed ? '✕' : '✓'}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-oro/20 italic block">Sin equipo sin hueco</span>
                                )}
                              </div>
                            </details>
                          );
                        })()}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* 2. STAT ADJUSTMENTS & DICE ROLLS */}
              <div className={`space-y-5 border-l border-oro/10 px-0 xl:px-8 ${isEventMode && activeConsoleMode === 'narrador' ? 'xl:col-span-7 border-r-0' : 'xl:border-r xl:col-span-3'}`}>
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
                      <Dices className="w-4 h-4 text-naranja-naruto" /> Tirar
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

                      <div className="pt-3 border-t border-oro/10 space-y-2 animate-in fade-in duration-300">
                        <span className="text-[10px] font-black text-oro/40 block uppercase ml-1">Tiradas de Atributos (d20)</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {['NIN', 'TAI', 'GEN', 'INT', 'FUE', 'AGI', 'EST', 'SM'].map((s) => {
                            const sender = getActiveSenderInfo();
                            const val = sender.stats ? (Number((sender.stats as any)[s]) ?? 3) : (activeCharacter?.stats_base?.[s as keyof CharacterStats] ?? 3);
                            const mod = getStatModifier(val);
                            const modSign = mod >= 0 ? `+${mod}` : `${mod}`;
                            return (
                              <button
                                key={s}
                                onClick={() => rollStat(s)}
                                className="bg-black/40 border border-oro/15 hover:border-oro py-1 text-[10px] font-black text-oro hover:bg-oro/10 transition-all flex flex-col items-center justify-center rounded-sm"
                                title={`Tirar D20 + Modificador de ${s} (Valor: ${val}, Mod: ${modSign})`}
                              >
                                <div className="flex items-center gap-1 text-white/80">
                                  <span>{s}</span>
                                  <span className="text-[8px] text-oro/40 font-normal">({val})</span>
                                </div>
                                <span className="text-[9px] text-oro/70 font-bold">{modSign}</span>
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
              {(!isEventMode || activeConsoleMode === 'jugador') && (
                <div className="space-y-5 xl:col-span-6">
                <h3 className="font-black text-sm uppercase tracking-[0.2em] border-b border-oro/10 pb-3 flex items-center gap-2.5">
                  USO DE TÉCNICAS
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        setIsActiveDropdownOpen(false);
                      }}
                      className="w-full bg-black/60 border border-oro/20 text-oro px-4 py-2.5 text-xs font-black flex justify-between items-center cursor-pointer hover:border-oro transition-all relative z-40"
                    >
                      <span className="truncate pr-4">
                        {selectedTecnicaId && !(myCooldowns[selectedTecnicaId] && getRemainingCD(myCooldowns[selectedTecnicaId], customCdRounds) > 0)
                          ? (activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === selectedTecnicaId)?.info_glosario?.nombre_jp || activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === selectedTecnicaId)?.info_glosario?.nombre_es)
                          : 'BUSCAR TÉCNICA'}
                      </span>
                      <span className="text-[10px] text-oro/60 shrink-0">▼</span>
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-black/95 border border-oro/30 shadow-2xl max-h-[300px] overflow-hidden flex flex-col backdrop-blur-md">
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
                              {(activeCharacter?.personajes_tecnicas || [])
                                .filter(pt => {
                                  const nameEs = pt.info_glosario?.nombre_es || '';
                                  const nameJp = pt.info_glosario?.nombre_jp || '';
                                  const isMatch = searchIncludes(nameEs, tecnicaSearch) || searchIncludes(nameJp, tecnicaSearch);
                                  const isCD = myCooldowns[pt.tecnica_id] && getRemainingCD(myCooldowns[pt.tecnica_id], customCdRounds) > 0;
                                  return isMatch && !isCD; // Ready techniques only
                                })
                                .map(pt => {
                                  const isSelected = selectedTecnicaId === pt.tecnica_id;

                                  const handleSelect = () => {
                                    setSelectedTecnicaId(pt.tecnica_id);
                                    setIsDropdownOpen(false);
                                    setTecnicaSearch('');
                                    setCustomChCost(0);
                                    setCustomCdRounds(1);
                                    setIsConstantCh(false);
                                    setConstantChCost(0);
                                    setIsTechActive(false);
                                  };

                                  return (
                                    <div
                                      key={pt.tecnica_id}
                                      onClick={handleSelect}
                                      className={`px-4 py-2.5 text-xs font-black border-b border-oro/5 last:border-b-0 flex justify-between items-center transition-all text-white/80 hover:bg-oro/10 hover:text-oro cursor-pointer ${isSelected ? 'bg-oro/20 text-oro border-l-2 border-oro' : ''
                                        }`}
                                    >
                                      <span className="truncate pr-2">
                                        {pt.info_glosario?.nombre_jp || pt.info_glosario?.nombre_es}
                                        {pt.info_glosario?.nombre_jp && pt.info_glosario?.nombre_es && (
                                          <span className="text-oro/50 font-medium italic ml-1">
                                            ({pt.info_glosario.nombre_es})
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-[9px] text-oro/40 font-mono shrink-0">Disponible</span>
                                    </div>
                                  );
                                })}

                              {/* No results */}
                              {(activeCharacter?.personajes_tecnicas || []).filter(pt => {
                                const nameEs = pt.info_glosario?.nombre_es || '';
                                const nameJp = pt.info_glosario?.nombre_jp || '';
                                const isMatch = searchIncludes(nameEs, tecnicaSearch) || searchIncludes(nameJp, tecnicaSearch);
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

                  {/* Center Column: Techniques in CD Dropdown */}
                  <div className="relative">
                    {/* Transparent overlay to close on outside click */}
                    {isCdDropdownOpen && (
                      <div className="fixed inset-0 z-40" onClick={() => setIsCdDropdownOpen(false)} />
                    )}

                    <div
                      onClick={() => {
                        setIsCdDropdownOpen(prev => !prev);
                        setIsDropdownOpen(false);
                        setIsActiveDropdownOpen(false);
                      }}
                      className="w-full bg-black/60 border border-red-500/20 text-red-400 px-4 py-2.5 text-xs font-black flex justify-between items-center cursor-pointer hover:border-red-500 transition-all relative z-40"
                    >
                      <span className="truncate pr-4">
                        {`TÉCNICAS EN CD (${(activeCharacter?.personajes_tecnicas || []).filter(pt => {
                          const cd = myCooldowns[pt.tecnica_id] ? getRemainingCD(myCooldowns[pt.tecnica_id], customCdRounds) : 0;
                          return cd > 0;
                        }).length})`}
                      </span>
                      <span className="text-[10px] text-red-500/60 shrink-0">▼</span>
                    </div>

                    {isCdDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-black/95 border border-red-500/30 shadow-2xl max-h-[300px] overflow-y-auto flex flex-col backdrop-blur-md">
                        {(activeCharacter?.personajes_tecnicas || [])
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
                                <span className="truncate pr-2">
                                  {pt.info_glosario?.nombre_jp || pt.info_glosario?.nombre_es}
                                  {pt.info_glosario?.nombre_jp && pt.info_glosario?.nombre_es && (
                                    <span className="text-red-400/50 font-medium italic ml-1">
                                      ({pt.info_glosario.nombre_es})
                                    </span>
                                  )}
                                </span>
                                <span className="text-[9px] font-black uppercase text-red-500 bg-red-950 border border-red-500/30 px-1.5 py-0.5 rounded-sm shrink-0">
                                  CD: {cd} rondas
                                </span>
                              </div>
                            );
                          })}

                        {/* No results */}
                        {(activeCharacter?.personajes_tecnicas || []).filter(pt => {
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

                  {/* Right Column: Active Techniques Dropdown */}
                  <div className="relative">
                    {/* Transparent overlay to close on outside click */}
                    {isActiveDropdownOpen && (
                      <div className="fixed inset-0 z-40" onClick={() => setIsActiveDropdownOpen(false)} />
                    )}

                    <div
                      onClick={() => {
                        setIsActiveDropdownOpen(prev => !prev);
                        setIsDropdownOpen(false);
                        setIsCdDropdownOpen(false);
                      }}
                      className="w-full bg-black/60 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 text-xs font-black flex justify-between items-center cursor-pointer hover:border-emerald-500 transition-all relative z-40"
                    >
                      <span className="truncate pr-4">
                        {`TÉCNICAS ACTIVAS (${Object.keys(myActiveTecnicas).length})`}
                      </span>
                      <span className="text-[10px] text-emerald-500/60 shrink-0">▼</span>
                    </div>

                    {isActiveDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-black/95 border border-emerald-500/30 shadow-2xl max-h-[300px] overflow-y-auto flex flex-col backdrop-blur-md">
                        {Object.keys(myActiveTecnicas).map(Number).map(techId => {
                          const pt = activeCharacter?.personajes_tecnicas?.find(t => t.tecnica_id === techId);
                          if (!pt) return null;
                          const cd = myCooldowns[techId] ? getRemainingCD(myCooldowns[techId], myActiveTecnicas[techId].cdRounds) : 0;

                          return (
                            <div
                              key={techId}
                              className="px-4 py-2.5 text-xs font-black border-b border-emerald-500/5 last:border-b-0 flex justify-between items-center bg-emerald-950/20 text-emerald-400 border-l-2 border-emerald-500"
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="truncate text-white">
                                  {pt.info_glosario?.nombre_jp || pt.info_glosario?.nombre_es}
                                </span>
                                <span className="text-[9px] text-oro/40 font-mono">
                                  CD Pausado: {cd} rondas
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeactivateTecnica(techId)}
                                className="text-[9px] font-black uppercase text-red-400 bg-red-950/40 border border-red-500/30 px-2 py-1 rounded-sm shrink-0 hover:bg-red-500 hover:text-white transition-all"
                              >
                                Desactivar
                              </button>
                            </div>
                          );
                        })}

                        {Object.keys(myActiveTecnicas).length === 0 && (
                          <div className="px-4 py-4 text-xs text-emerald-400/40 italic text-center">
                            Ninguna técnica activa
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {selectedTecnicaId !== null && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className={isEventMode ? "grid grid-cols-1" : "grid grid-cols-2 gap-4"}>
                      {!isEventMode && (
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
                      )}
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

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-oro/10">
                      <div className="flex flex-col gap-2">
                        {!isEventMode && (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="is-constant-ch"
                              checked={isConstantCh}
                              onChange={(e) => {
                                setIsConstantCh(e.target.checked);
                                if (!e.target.checked) setConstantChCost(0);
                              }}
                              className="accent-oro cursor-pointer w-4 h-4"
                            />
                            <label htmlFor="is-constant-ch" className="text-[10px] font-black text-oro/40 uppercase cursor-pointer select-none">
                              Chakra Constante
                            </label>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="is-tech-active"
                            checked={isTechActive}
                            onChange={(e) => setIsTechActive(e.target.checked)}
                            className="accent-oro cursor-pointer w-4 h-4"
                          />
                          <label htmlFor="is-tech-active" className="text-[10px] font-black text-oro/40 uppercase cursor-pointer select-none">
                            Técnica Activa (Pausar CD)
                          </label>
                        </div>
                      </div>
                      {!isEventMode && isConstantCh && (
                        <div>
                          <label className="text-[10px] font-black text-oro/40 block mb-1 uppercase">COST CH CONSTANTE / RONDA</label>
                          <input
                            type="number"
                            min="0"
                            value={constantChCost}
                            onChange={(e) => setConstantChCost(Number(e.target.value))}
                            className="w-full bg-black/50 border border-oro/20 text-oro px-4 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleUseTecnica}
                      className="w-full ninja-btn-oro py-3 px-6 text-xs flex items-center justify-center gap-2"
                    >
                      Ejecutar Técnica
                    </button>
                  </div>
                )}
                {/* 4. DAMAGE CALCULATOR (Solo en salas PvP, no en Eventos) */}
                {!isEventMode && (
                  <div className="pt-5 border-t border-oro/10 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-oro/10 pb-3">
                      <h3 className="font-black text-sm uppercase tracking-[0.2em] text-oro">
                        CALCULADORA DE DAÑO
                      </h3>
                      {/* Add-on Toggles */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={addCalcStat}
                          className="ninja-btn-ghost px-3 py-1 text-xs font-black uppercase"
                        >
                          + Stat Extra
                        </button>
                        <button
                          type="button"
                          onClick={addCalcWeapon}
                          className="ninja-btn-ghost px-3 py-1 text-xs font-black uppercase"
                        >
                          + Arma
                        </button>
                        <button
                          type="button"
                          onClick={addCalcPercent}
                          className="ninja-btn-ghost px-3 py-1 text-xs font-black uppercase"
                        >
                          + Modificador %
                        </button>
                      </div>
                    </div>

                    {/* Calculator Input Rows */}
                    <div className="space-y-4 bg-black/40 p-4 border border-oro/10">
                      {/* Dynamic Stats List */}
                      {calcStats.map((item, index) => {
                        const numericMult = parseFloat(item.multInput.replace(',', '.')) || 0;
                        return (
                          <div
                            key={item.id}
                            className={`flex flex-wrap items-center gap-3 ${index > 0 ? 'pt-3 border-t border-oro/10 animate-in fade-in duration-200' : ''}`}
                          >
                            <span className="text-xs font-black text-oro/40 uppercase w-16 shrink-0">
                              Stat {index + 1}:
                            </span>

                            <NinjaSelect
                              value={item.stat}
                              options={['NIN', 'TAI', 'GEN', 'INT', 'FUE', 'AGI', 'EST', 'SM']}
                              onChange={(val) => updateCalcStatName(item.id, val)}
                              placeholder=""
                              variant="compact"
                              className="w-20"
                            />

                            {/* Stat Value Input */}
                            <div className="flex items-center bg-black/50 border border-oro/20 w-28 px-2 focus-within:border-oro transition-all">
                              <button
                                type="button"
                                onClick={() => updateCalcStatVal(item.id, Math.max(1, item.val - 1))}
                                className="text-oro hover:text-white font-black px-1.5 py-1 text-xs select-none"
                              >-</button>
                              <input
                                type="number"
                                value={item.val}
                                onChange={(e) => updateCalcStatVal(item.id, Number(e.target.value) || 0)}
                                className="bg-transparent text-center text-white text-xs font-black w-full outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateCalcStatVal(item.id, item.val + 1)}
                                className="text-oro hover:text-white font-black px-1.5 py-1 text-xs select-none"
                              >+</button>
                            </div>

                            <span className="text-oro/40 font-black text-xs">×</span>

                            {/* Multiplier Input */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-oro/40 uppercase">Mult:</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.multInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || new RegExp('^[0-9]*[.,]?[0-9]*$').test(val)) {
                                    updateCalcStatMult(item.id, val);
                                  }
                                }}
                                className="w-20 bg-black/50 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro text-center transition-all"
                              />
                            </div>

                            <div className="ml-auto flex items-center gap-3">
                              <span className="text-xs font-mono text-oro font-black">
                                = {item.val * numericMult}
                              </span>
                              {calcStats.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeCalcStat(item.id)}
                                  className="text-naranja-naruto hover:text-red-400 text-xs font-black uppercase tracking-wider"
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Dynamic Weapons List */}
                      {calcWeapons.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center gap-3 pt-3 border-t border-oro/10 animate-in fade-in duration-200"
                        >
                          <span className="text-xs font-black text-oro/40 uppercase w-16 shrink-0">
                            {calcWeapons.length > 1 ? `Arma ${index + 1}:` : 'Daño Arma:'}
                          </span>
                          <input
                            type="number"
                            placeholder="Daño de arma..."
                            value={item.damage}
                            onChange={(e) => updateCalcWeapon(item.id, Number(e.target.value) || 0)}
                            className="w-36 bg-black/50 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                          />
                          <div className="ml-auto flex items-center gap-3">
                            <span className="text-xs font-mono text-oro font-black">
                              + {item.damage}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCalcWeapon(item.id)}
                              className="text-naranja-naruto hover:text-red-400 text-xs font-black uppercase tracking-wider"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Dynamic Percentage Modifiers List */}
                      {calcPercents.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center gap-3 pt-3 border-t border-oro/10 animate-in fade-in duration-200"
                        >
                          <span className="text-xs font-black text-oro/40 uppercase w-16 shrink-0">
                            {calcPercents.length > 1 ? `Mod % ${index + 1}:` : 'Mod %:'}
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="+10 o -20..."
                              value={item.percent}
                              onChange={(e) => updateCalcPercent(item.id, Number(e.target.value) || 0)}
                              className="w-32 bg-black/50 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all"
                            />
                            <span className="text-xs font-black text-oro">%</span>
                          </div>
                          <div className="ml-auto flex items-center gap-3">
                            <span className="text-xs font-mono text-oro font-black">
                              {item.percent >= 0 ? `+${item.percent}%` : `${item.percent}%`}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCalcPercent(item.id)}
                              className="text-naranja-naruto hover:text-red-400 text-xs font-black uppercase tracking-wider"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Final Result Card */}
                      <div className="pt-4 border-t border-oro/10 flex items-center justify-between flex-wrap gap-4">
                        <div className="text-xs font-mono text-oro/60 truncate max-w-[70%]">
                          Fórmula: {calcStats.map(s => '(' + s.stat + ': ' + s.val + ' × ' + (s.multInput || '0') + ')').join(' + ')}
                          {calcWeapons.length > 0 && ' + ' + calcWeapons.map(w => w.damage + ' Arma').join(' + ')}
                          {calcPercents.length > 0 && ' (' + calcPercents.map(p => (p.percent >= 0 ? '+' : '') + p.percent + '%').join(' ') + ')'}
                        </div>
                        <div className="flex items-center gap-3 bg-black/60 border border-oro/20 px-5 py-2">
                          <span className="text-xs font-black text-oro/60 uppercase">DAÑO TOTAL:</span>
                          <span className="text-xl font-black text-oro font-mono">{calculateTotalDamage()}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

        {/* CREATE NPC MODAL */}
        {showCreateTempModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
            <div
              className="w-full max-w-2xl bg-[#0d0e12] border border-oro/30 shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
              style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
            >
              <h2 className="ninja-title text-xl font-black text-oro uppercase tracking-[0.2em] mb-6 pb-3 border-b border-oro/20 flex items-center gap-2">
                {editingNpcId ? 'EDITAR NPC TEMPORAL' : 'CREAR NPC TEMPORAL'}
              </h2>

              <div className="space-y-6">
                {/* Basic Details: Name, Image URL, Bando, VIT */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">URL Imagen (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. https://url.com/img.png"
                      value={npcUrlImg}
                      onChange={(e) => setNpcUrlImg(e.target.value)}
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
                            .filter(t => searchIncludes(t.nombre, traitSearch) && !npcRasgos.some(nr => nr.id === t.id))
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
                            .filter(i => {
                              const subData = i.info_glosario_subcategorias;
                              const subSlug = (Array.isArray(subData) ? subData[0]?.slug : subData?.slug) || '';
                              const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || '';
                              const isEquipment = !!i.zona_equipable || subSlug === 'equipo' || subName.toLowerCase().includes('equipo');
                              return isEquipment && searchIncludes(i.nombre_es, itemSearch) && !npcEquipo.some(ne => ne.id === i.id);
                            })
                            .slice(0, 10)
                            .map(i => (
                              <div
                                key={i.id}
                                onClick={() => {
                                  setNpcEquipo(prev => [...prev, { id: i.id, nombre: i.nombre_es }]);
                                  setItemSearch('');
                                }}
                                className="px-3 py-2 text-xs font-black text-white/80 hover:bg-oro/10 hover:text-oro cursor-pointer border-b border-oro/5 last:border-0 flex justify-between items-center"
                              >
                                <span>{i.nombre_es}</span>
                                {i.zona_equipable && <span className="text-[9px] text-oro/40 uppercase font-mono">{i.zona_equipable}</span>}
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
                      setEditingNpcId(null);
                      setNpcName('');
                      setNpcUrlImg('');
                      setNpcBando('A');
                      setNpcVit(30);
                      setNpcStats({ NIN: 3, TAI: 3, GEN: 3, INT: 3, FUE: 3, AGI: 3, EST: 3, SM: 3 });
                      setNpcRasgos([]);
                      setNpcEquipo([]);
                      setNpcEquipoSinHueco([]);
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

                      if (editingNpcId) {
                        const currentTemp = tempCharacters[editingNpcId];
                        if (currentTemp) {
                          const updatedNpc: Partial<Participant> = {
                            nombre: npcName.trim(),
                            url_img: npcUrlImg.trim() || undefined,
                            bando: npcBando,
                            estado: {
                              ...currentTemp.estado,
                              maxVit: npcVit,
                              vit: Math.min(currentTemp.estado?.vit ?? npcVit, npcVit)
                            },
                            rasgos: npcRasgos as any,
                            equipo: npcEquipo as any,
                            equipoSinHueco: npcEquipoSinHueco as any,
                            stats_base: npcStats
                          };
                          updateTempCharacter(editingNpcId, updatedNpc);
                          addLog(`**[NPC] ${npcName.trim()}** ha sido actualizado.`);
                        }
                      } else {
                        const id = `temp_${Date.now()}`;
                        const tempChar: Participant = {
                          user_id: id,
                          nombre: npcName.trim(),
                          url_img: npcUrlImg.trim() || undefined,
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
                          equipoSinHueco: npcEquipoSinHueco as any,
                          stats_base: npcStats,
                          ocultar_vit: true
                        };
                        createTempCharacter(tempChar);
                        setRollTargetId(id);
                      }

                      setShowCreateTempModal(false);
                      setEditingNpcId(null);

                      // Reset values
                      setNpcName('');
                      setNpcUrlImg('');
                      setNpcBando('A');
                      setNpcVit(30);
                      setNpcStats({ NIN: 3, TAI: 3, GEN: 3, INT: 3, FUE: 3, AGI: 3, EST: 3, SM: 3 });
                      setNpcRasgos([]);
                      setNpcEquipo([]);
                      setNpcEquipoSinHueco([]);
                      setTraitSearch('');
                      setItemSearch('');
                      setCustomTrait('');
                      setCustomItem('');
                    }}
                    className="ninja-btn-oro px-6 py-2 text-xs flex items-center gap-1.5"
                  >
                    {editingNpcId ? 'Guardar Cambios' : 'Crear NPC'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* EXPANDED IMAGE LIGHTBOX MODAL */}
        {expandedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
            onClick={() => setExpandedImage(null)}
          >
            <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-10 right-0 text-oro/80 hover:text-white font-black text-xs bg-black/80 border border-oro/30 px-3 py-1 rounded-sm tracking-wider uppercase"
              >
                ✕ CERRAR (ESC)
              </button>
              <img
                src={expandedImage}
                alt="Ilustración ampliada"
                className="max-w-full max-h-[85vh] object-contain rounded border border-oro/40 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


