'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RegistrosService } from '@/services/supabase/registros.service';
import { MasterService } from '@/services/supabase/master.service';
import { Registro, MisionMaster } from '@/domain/types';
import { useCharacterStore } from '@/store/useCharacterStore';
import { useToastStore } from '@/components/ui/Toast';
import { X, Search, UserPlus, User, Info, HeartPulse, Swords, Link as LinkIcon, Check, ScrollText, ArrowLeftRight, Sparkles, Coins, ShieldAlert } from 'lucide-react';
import { NinjaSelect } from '@/components/ui/Fields';

interface CharacterResult {
  id: number;
  nombre_ninja: string;
  hobba_name?: string | null;
  rango?: string;
}

function AsyncCharacterSearch({
  placeholder,
  onSelectCharacter,
  emerald = false,
  excludeIds = []
}: {
  placeholder: string;
  onSelectCharacter: (p: CharacterResult) => void;
  emerald?: boolean;
  excludeIds?: number[];
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CharacterResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 99999
    });
  }, []);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    try {
      const data = await RegistrosService.searchCharacters(val);
      const filtered = data.filter(r => !excludeIds.includes(Number(r.id)));
      setResults(filtered);
      if (filtered.length > 0) {
        updatePosition();
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updatePosition();
    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, updatePosition]);

  const borderColor = emerald ? 'border-emerald-500/30' : 'border-oro/20';
  const textColor = emerald ? 'text-emerald-300/90 hover:bg-emerald-500/10 hover:text-emerald-300 border-emerald-500/10' : 'text-oro/70 hover:bg-oro/10 hover:text-oro border-oro/5';
  const iconColor = emerald ? 'text-emerald-400/40' : 'text-oro/20';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className={`absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColor}`} />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (results.length > 0) { updatePosition(); setIsOpen(true); } }}
          className={`w-full ninja-input pl-14 py-4 text-xs ${emerald ? 'border-emerald-500/20 focus:border-emerald-400/50' : ''}`}
        />
      </div>

      {mounted && isOpen && results.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          style={{
            ...dropdownStyle,
            clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)'
          }}
          className={`bg-[#171717] border ${borderColor} shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {results.map(p => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectCharacter(p);
                  setQuery('');
                  setResults([]);
                  setIsOpen(false);
                }}
                className={`w-full px-6 py-4 text-left text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b last:border-0 ${textColor}`}
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>{p.nombre_ninja} {p.hobba_name ? `(${p.hobba_name})` : ''}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface CombatFormProps {
  onCreated: () => void;
  initialData?: Registro | null;
  initialSubtype?: 'combate' | 'intervencion' | 'sanacion';
}

export default function CombatForm({
  onCreated,
  initialData = null,
  initialSubtype
}: CombatFormProps) {
  const { activeCharacter, fetchActiveCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    if (!activeCharacter) {
      fetchActiveCharacter();
    }
  }, []);

  const [recordSubtype, setRecordSubtype] = useState<'combate' | 'intervencion' | 'sanacion'>(
    initialSubtype ||
    ((initialData?.subtipo === 'sanacion' || initialData?.data?.subtipo === 'sanacion') ? 'sanacion'
      : (initialData?.subtipo === 'intervencion' || initialData?.data?.subtipo === 'intervencion' || initialData?.data?.es_intervencion) ? 'intervencion'
      : 'combate')
  );

  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>(initialData?.data?.urls_imagenes || ['']);
  const [winner, setWinner] = useState<'A' | 'B' | 'Empate'>(initialData?.data?.ganador || 'Empate');
  const [combatConfig, setCombatConfig] = useState<any | null>(null);
  const [paConfig, setPaConfig] = useState<any | null>(null);
  const [estados, setEstados] = useState<{ id: number; nombre: string }[]>([]);

  // State for Intervención (Misión intervenida - Reglas 6.1 a 6.16)
  const [misionRango, setMisionRango] = useState<'B' | 'A' | 'S'>(
    (initialData?.data?.mision_rango as any) || 'B'
  );
  const [misiones, setMisiones] = useState<MisionMaster[]>([]);
  const [loadingMisiones, setLoadingMisiones] = useState(false);
  const [selectedMision, setSelectedMision] = useState<string>(
    initialData?.data?.codigo_mision || ''
  );
  const [bandoMision, setBandoMision] = useState<'A' | 'B'>(
    initialData?.data?.bando_mision || 'A'
  );

  // State for Combate
  const [teamA, setTeamA] = useState<{ id: number; nombre_ninja: string; rango?: string; estado_nombre?: string; has_estado_alterado?: boolean; descripcion_estado?: string; has_cds?: boolean; descripcion_cds?: string; huye?: boolean; huye_gana_exp?: boolean }[]>([]);
  const [teamB, setTeamB] = useState<{ id: number; nombre_ninja: string; rango?: string; estado_nombre?: string; has_estado_alterado?: boolean; descripcion_estado?: string; has_cds?: boolean; descripcion_cds?: string; huye?: boolean; huye_gana_exp?: boolean }[]>([]);

  // State for Sanación
  const [sanado, setSanado] = useState<{ id: number; nombre_ninja: string } | null>(
    initialData?.data?.sanado || null
  );
  const [medicos, setMedicos] = useState<{ id: number; nombre_ninja: string }[]>(
    initialData?.data?.medicos || []
  );

  useEffect(() => {
    if (initialData) {
      const bA = initialData.data?.equipo_a || [];
      const bB = initialData.data?.equipo_b || [];
      setTeamA(bA);
      setTeamB(bB);
      if (initialData.subtipo === 'sanacion' || initialData.data?.subtipo === 'sanacion') {
        if (initialData.data?.sanado) setSanado(initialData.data.sanado);
        if (initialData.data?.medicos) setMedicos(initialData.data.medicos);
      }
      if (initialData.subtipo === 'intervencion' || initialData.data?.subtipo === 'intervencion' || initialData.data?.es_intervencion) {
        if (initialData.data?.codigo_mision) setSelectedMision(initialData.data.codigo_mision);
        if (initialData.data?.mision_rango) setMisionRango(initialData.data.mision_rango);
        if (initialData.data?.bando_mision) setBandoMision(initialData.data.bando_mision);
      }
    } else if (activeCharacter) {
      setTeamA([{ id: Number(activeCharacter.id), nombre_ninja: activeCharacter.nombre_ninja, rango: activeCharacter.rango || 'D' }]);
      setMedicos([]);
    }
  }, [activeCharacter, initialData]);

  useEffect(() => {
    if (recordSubtype === 'intervencion') {
      fetchMisiones();
    }
  }, [recordSubtype, misionRango]);

  const fetchMisiones = async () => {
    setLoadingMisiones(true);
    try {
      const data = await RegistrosService.getMisionesByRango(misionRango);
      setMisiones(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMisiones(false);
    }
  };

  useEffect(() => {
    fetchCombatConfig();
    fetchEstados();
  }, []);

  const fetchCombatConfig = async () => {
    try {
      const config = await MasterService.getSystemConfig('experiencia_combates');
      if (config) setCombatConfig(config);
      const paConf = await MasterService.getSystemConfig('puntos_aprendizaje_combates');
      if (paConf) setPaConfig(paConf);
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

  const addParticipant = (team: 'A' | 'B', p: CharacterResult) => {
    if (team === 'A') setTeamA([...teamA, { ...p, rango: p.rango || 'D', estado_nombre: '' }]);
    else setTeamB([...teamB, { ...p, rango: p.rango || 'D', estado_nombre: '' }]);
  };

  const updateParticipantState = (id: number, team: 'A' | 'B', updates: Partial<{ estado_nombre: string, has_estado_alterado: boolean, descripcion_estado: string, has_cds: boolean, descripcion_cds: string, huye: boolean, huye_gana_exp: boolean }>) => {
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

  const calculateXP = (team: 'A' | 'B', huye?: boolean, huyeGanaExp?: boolean) => {
    if (!combatConfig) return 0;
    if (huye && !huyeGanaExp) return 0;
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

    let baseXp = 0;
    if (diff >= 2) baseXp = Number(section.mas_2) || 0;
    else if (diff === 1) baseXp = Number(section.mas_1) || 0;
    else if (diff === 0) baseXp = Number(section.igual) || 0;
    else if (diff === -1) baseXp = Number(section.menos_1) || 0;
    else baseXp = Number(section.menos_2) || 0;

    if (baseXp === 0) return 0;

    if (isWinner) {
      const ownTeamCount = team === 'A' ? teamA.length : teamB.length;
      const oppTeamCount = team === 'A' ? teamB.length : teamA.length;

      if (ownTeamCount < oppTeamCount) {
        const playerDiff = oppTeamCount - ownTeamCount;
        return Math.ceil(baseXp * (1 + 0.5 * playerDiff));
      } else if (ownTeamCount > oppTeamCount) {
        const playerDiff = ownTeamCount - oppTeamCount;
        return Math.ceil(baseXp / (1 + playerDiff));
      }
    }

    return baseXp;
  };

  const calculatePA = (_team?: 'A' | 'B', _huye?: boolean) => 0;

  const selectedMisionObj = misiones.find(m => m.codigo_mision === selectedMision) || (
    initialData?.data?.codigo_mision === selectedMision ? {
      codigo_mision: initialData.data.codigo_mision,
      titulo: initialData.data.mision_titulo,
      exp: initialData.data.mision_exp,
      ryous: initialData.data.mision_ryous,
      pa_recompensa: initialData.data.mision_pa,
      se_puede_fallar: initialData.data.mision_se_puede_fallar,
      exp_fallida: initialData.data.mision_exp_fallida,
      ryous_fallida: initialData.data.mision_ryous_fallida,
      pa_recompensa_fallida: initialData.data.mision_pa_fallida,
    } as any : null
  );

  const calculateIntervencionXP = (team: 'A' | 'B', huye?: boolean, huyeGanaExp?: boolean) => {
    if (huye && !huyeGanaExp) return 0;
    const combatXp = calculateXP(team, huye, huyeGanaExp);
    if (winner === 'Empate') {
      return selectedMisionObj?.se_puede_fallar ? Number(selectedMisionObj.exp_fallida || 0) : 0;
    }
    const isWinner = winner === team;
    if (isWinner) {
      return combatXp + Number(selectedMisionObj?.exp || 0);
    } else {
      return combatXp + (selectedMisionObj?.se_puede_fallar ? Number(selectedMisionObj.exp_fallida || 0) : 0);
    }
  };

  const calculateIntervencionPA = (team: 'A' | 'B', huye?: boolean) => {
    if (huye) return 0;
    if (winner === 'Empate') {
      return selectedMisionObj?.se_puede_fallar ? Number(selectedMisionObj.pa_recompensa_fallida || 0) : 0;
    }
    const isWinner = winner === team;
    if (isWinner) {
      return Number(selectedMisionObj?.pa_recompensa || 0);
    } else {
      return selectedMisionObj?.se_puede_fallar ? Number(selectedMisionObj.pa_recompensa_fallida || 0) : 0;
    }
  };

  const calculateIntervencionRyous = (team: 'A' | 'B', huye?: boolean) => {
    if (huye) return 0;
    if (winner === 'Empate') {
      return selectedMisionObj?.se_puede_fallar ? Number(selectedMisionObj.ryous_fallida || 0) : 0;
    }
    const isWinner = winner === team;
    if (isWinner) {
      return Number(selectedMisionObj?.ryous || 0);
    } else {
      return selectedMisionObj?.se_puede_fallar ? Number(selectedMisionObj.ryous_fallida || 0) : 0;
    }
  };

  const handleSubmit = async () => {
    if (!activeCharacter) {
      addToast('No se ha detectado un personaje activo.', 'error');
      return;
    }

    if (recordSubtype === 'sanacion') {
      if (!sanado) {
        addToast('Debe seleccionar el jugador sanado', 'error');
        return;
      }
      const validImages = images.filter(img => img.trim() !== '');
      if (validImages.length === 0) {
        addToast('Añade al menos una prueba (URL)', 'error');
        return;
      }

      const existingD10 = initialData?.data?.tirada_d10;
      const d10Val = (existingD10 !== undefined && existingD10 !== null)
        ? Number(existingD10)
        : (Math.floor(Math.random() * 10) + 1);
      const horasBase = 2 + (medicos.length * 2);
      const horasTotales = horasBase + d10Val;

      const payload: any = {
        tipo: 'combate',
        subtipo: 'sanacion',
        autor_id: activeCharacter.id,
        participantes_ids: Array.from(new Set([sanado.id, ...medicos.map(m => m.id)])),
        data: {
          subtipo: 'sanacion',
          sanado: { id: sanado.id, nombre_ninja: sanado.nombre_ninja },
          medicos: medicos.map(m => ({ id: m.id, nombre_ninja: m.nombre_ninja })),
          tirada_d10: d10Val,
          horas_base: horasBase,
          horas_restadas: horasTotales,
          urls_imagenes: validImages,
          participantes_historicos: [
            { id: sanado.id, nombre_ninja: sanado.nombre_ninja },
            ...medicos.map(m => ({ id: m.id, nombre_ninja: m.nombre_ninja }))
          ]
        }
      };

      setLoading(true);
      try {
        if (initialData && initialData.id) {
          await RegistrosService.updateRegistro(initialData.id, payload);
          addToast('Registro de sanación actualizado correctamente', 'success');
        } else {
          await RegistrosService.createRegistro(payload);
          addToast('Registro de sanación publicado correctamente', 'success');
        }
        onCreated();
      } catch (err: any) {
        addToast(err.message || 'Error al procesar el registro', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (teamA.length === 0 || teamB.length === 0) {
      addToast('Debe haber al menos un participante por bando', 'error');
      return;
    }

    if (recordSubtype === 'intervencion') {
      if (!selectedMisionObj) {
        addToast('Debes seleccionar una misión para la intervención', 'error');
        return;
      }
      const validImages = images.filter(img => img.trim() !== '');
      if (validImages.length === 0) {
        addToast('Añade al menos una prueba (URL de Discord / Captura)', 'error');
        return;
      }
    }

    const authorInA = teamA.find(p => Number(p.id) === Number(activeCharacter.id));
    const authorInB = teamB.find(p => Number(p.id) === Number(activeCharacter.id));
    const authorTeam = authorInA ? 'A' : 'B';
    const authorParticipant = authorInA || authorInB;

    let finalXP = calculateXP(authorTeam, authorParticipant?.huye, authorParticipant?.huye_gana_exp);
    let finalPA = calculatePA(authorTeam, authorParticipant?.huye);
    let finalRyous = 0;

    let finalResult = 'retirarse';
    if (winner === 'A') finalResult = authorInA ? 'ganar' : 'perder';
    else if (winner === 'B') finalResult = authorInB ? 'ganar' : 'perder';

    if (recordSubtype === 'intervencion') {
      finalXP = calculateIntervencionXP(authorTeam, authorParticipant?.huye, authorParticipant?.huye_gana_exp);
      finalPA = calculateIntervencionPA(authorTeam, authorParticipant?.huye);
      finalRyous = calculateIntervencionRyous(authorTeam, authorParticipant?.huye);
    }

    const validImages = images.filter(img => img.trim() !== '');

    const payload: any = {
      tipo: 'combate',
      subtipo: recordSubtype === 'intervencion' ? 'intervencion' : 'combate',
      autor_id: activeCharacter.id,
      participantes_ids: [...teamA.map(p => p.id), ...teamB.map(p => p.id)],
      data: {
        subtipo: recordSubtype === 'intervencion' ? 'intervencion' : 'combate',
        ...(recordSubtype === 'intervencion' && selectedMisionObj ? {
          es_intervencion: true,
          bando_mision: bandoMision,
          bando_interventor: bandoMision === 'A' ? 'B' : 'A',
          codigo_mision: selectedMisionObj.codigo_mision,
          mision_rango: misionRango,
          mision_titulo: selectedMisionObj.titulo || `Misión ${selectedMisionObj.codigo_mision}`,
          mision_exp: selectedMisionObj.exp || 0,
          mision_ryous: selectedMisionObj.ryous || 0,
          mision_pa: selectedMisionObj.pa_recompensa || 0,
          mision_se_puede_fallar: !!selectedMisionObj.se_puede_fallar,
          mision_exp_fallida: selectedMisionObj.exp_fallida || 0,
          mision_ryous_fallida: selectedMisionObj.ryous_fallida || 0,
          mision_pa_fallida: selectedMisionObj.pa_recompensa_fallida || 0,
          urls_imagenes: validImages,
        } : {}),
        ganador: winner,
        equipo_a: teamA,
        equipo_b: teamB,
        resultado: finalResult,
        recompensa_xp: finalXP,
        recompensa_pa: finalPA,
        recompensa_ryous: finalRyous,
        config_xp: combatConfig,
        config_pa: null,
        participantes_historicos: [
          { id: activeCharacter.id, nombre_ninja: activeCharacter.nombre_ninja },
          ...teamA.map(p => ({ id: p.id, nombre_ninja: p.nombre_ninja })),
          ...teamB.map(p => ({ id: p.id, nombre_ninja: p.nombre_ninja }))
        ]
      }
    };

    setLoading(true);
    try {
      if (initialData && initialData.id) {
        await RegistrosService.updateRegistro(initialData.id, payload);
        addToast('Registro actualizado correctamente', 'success');
      } else {
        await RegistrosService.createRegistro(payload);
        addToast(recordSubtype === 'intervencion' ? 'Intervención registrada y sellada correctamente' : 'Registro publicado correctamente', 'success');
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
          <img src="/assets/icons/shuriken.webp" className="w-64 h-64 rotate-12" alt="bg" />
        </div>

        <div className="relative z-10 space-y-12 sm:space-y-16">
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-oro/10 pb-10 gap-6">
            <div className="space-y-2">
              <h3 className="ninja-title text-2xl sm:text-4xl md:text-5xl xl:text-6xl text-oro">
                {initialData ? 'EDITAR REGISTRO' : (recordSubtype === 'sanacion' ? 'REGISTRAR SANACIÓN' : recordSubtype === 'intervencion' ? 'REGISTRO DE INTERVENCIÓN' : 'REGISTRO DE COMBATE')}
              </h3>
              <p className="text-xs sm:text-sm font-black text-oro/40 uppercase tracking-[0.4em]">
                {recordSubtype === 'intervencion' ? 'Se añadirá también la misión para ambos bandos' : recordSubtype === 'sanacion' ? 'Tratamiento médico y reducción de horas de herido grave' : 'Sincronizando con el archivo histórico de combate'}
              </p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {/* Type Switcher */}
              {!initialData && (
                <div className="flex items-center gap-2 p-1.5 bg-black/60 border border-oro/20 ninja-clip-xs">
                  <button
                    type="button"
                    onClick={() => setRecordSubtype('combate')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${recordSubtype === 'combate' ? 'bg-oro text-naranja-naruto' : 'text-oro/40 hover:text-oro'}`}
                  >
                    COMBATE
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordSubtype('intervencion')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${recordSubtype === 'intervencion' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'text-oro/40 hover:text-red-400'}`}
                  >
                    INTERVENCIÓN
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordSubtype('sanacion')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${recordSubtype === 'sanacion' ? 'bg-emerald-500 text-black' : 'text-oro/40 hover:text-oro'}`}
                  >
                    SANACIÓN
                  </button>
                </div>
              )}
              <button
                onClick={() => onCreated()}
                className="group p-4 bg-black/40 border border-oro/10 hover:border-oro/40 transition-all ninja-clip-xs"
              >
                <X className="w-8 h-8 text-oro/40 group-hover:text-oro" />
              </button>
            </div>
          </div>

          {recordSubtype === 'sanacion' ? (
            /* ================= FORMULARIO DE SANACIÓN ================= */
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
              {/* Columna Izquierda: Jugador Sanado y Médicos */}
              <div className="space-y-6">
                {/* Jugador Sanado */}
                <div className="space-y-3 p-5 sm:p-6 bg-black/40 border border-emerald-500/20 ninja-clip-md">
                  <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3">
                    <h4 className="text-base font-black uppercase tracking-[0.3em] text-emerald-400">
                      JUGADOR SANADO
                    </h4>
                  </div>

                  {sanado ? (
                    <div className="py-3 px-4 bg-black/40 border border-emerald-500/30 ninja-clip-xs flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-300 uppercase tracking-widest">
                        {sanado.nombre_ninja}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSanado(null)}
                        className="p-1 text-emerald-400/50 hover:text-emerald-300 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <AsyncCharacterSearch
                      emerald
                      placeholder="BUSCAR PERSONAJE SANADO POR NOMBRE..."
                      onSelectCharacter={(p) => setSanado({ id: p.id, nombre_ninja: p.nombre_ninja })}
                    />
                  )}
                </div>

                {/* Médicos Participantes */}
                <div className="space-y-4 p-5 sm:p-6 bg-black/40 border border-oro/20 ninja-clip-md">
                  <div className="flex items-center justify-between border-b border-oro/10 pb-3">
                    <h4 className="text-base font-black uppercase tracking-[0.3em] text-oro">
                      MÉDICOS PARTICIPANTES
                    </h4>
                    <span className="text-xs font-bold text-oro/40 uppercase">{medicos.length} MÉDICOS</span>
                  </div>

                  <AsyncCharacterSearch
                    placeholder="BUSCAR Y AÑADIR MÉDICO PARTICIPANTE..."
                    excludeIds={medicos.map(m => m.id)}
                    onSelectCharacter={(p) => setMedicos([...medicos, { id: p.id, nombre_ninja: p.nombre_ninja }])}
                  />

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {medicos.map(m => (
                      <div key={m.id} className="p-3 bg-black/40 border border-oro/10 ninja-clip-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-oro/40" />
                          <span className="text-xs font-black text-oro uppercase tracking-widest">
                            {m.nombre_ninja} {Number(m.id) === Number(activeCharacter?.id) && <span className="text-oro/40 ml-1">(TÚ)</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-oro/10 border border-oro/20 text-caption font-black text-oro ninja-clip-xs">+1 EXP</span>
                          <button
                            type="button"
                            onClick={() => setMedicos(medicos.filter(item => item.id !== m.id))}
                            className="p-1 text-oro/20 hover:text-naranja-naruto transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Pruebas y Cálculo del Efecto */}
              <div className="space-y-6">
                {/* Desglose de Herido Grave y Recompensas */}
                <div className="p-5 sm:p-6 bg-black/40 border border-oro/20 ninja-clip-md space-y-4">
                  <div className="flex items-center gap-3 border-b border-oro/10 pb-3">
                    <h4 className="text-sm font-black uppercase tracking-[0.3em] text-oro">HORAS DE REDUCCIÓN DE HERIDO GRAVE</h4>
                  </div>

                  <div className="space-y-3 text-xs font-bold uppercase tracking-wider">
                    {(() => {
                      const cantMedicosExtra = medicos.length;
                      const horasBase = 2 + (cantMedicosExtra * 2);
                      return (
                        <>
                          <div className="flex justify-between items-center p-3 bg-black/40 border border-oro/10 ninja-clip-xs">
                            <span className="text-oro/60 text-caption">REDUCCIÓN BASE Y MÉDICOS</span>
                            <span className="text-oro font-black text-caption sm:text-xs">
                              2h base {cantMedicosExtra > 0 ? `+ ${cantMedicosExtra} ${cantMedicosExtra === 1 ? 'médico' : 'médicos'} (×2h)` : ''} = <span className="text-emerald-400">{horasBase} horas</span>
                            </span>
                          </div>

                          <div className="flex justify-between items-center p-3 bg-black/40 border border-oro/10 ninja-clip-xs">
                            <span className="text-oro/60 text-caption">TIRADA DADO D10</span>
                            <span className="text-oro font-black text-caption sm:text-xs">
                              {initialData?.data?.tirada_d10 ? `${initialData.data.tirada_d10}` : 'Tirada aleatoria al publicar (1 a 10)'}
                            </span>
                          </div>

                          <div className="p-3.5 bg-oro/10 border border-oro/30 ninja-clip-xs space-y-0.5 text-center">
                            <span className="text-caption font-black text-oro/60 block tracking-[0.3em]">HORAS TOTALES RESTADAS</span>
                            <span className="text-xl sm:text-2xl font-black text-oro tracking-widest">
                              {initialData?.data?.horas_restadas ? `${initialData.data.horas_restadas} HORAS` : `${horasBase}h + (d10) HORAS`}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Pruebas (URLs) */}
                <div className="space-y-6">
                  <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">PRUEBAS DE LA SANACIÓN (URLs)</label>
                  <div className="space-y-4">
                    {images.map((img, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-oro/20" />
                          <input
                            value={img}
                            onChange={(e) => {
                              const newImgs = [...images];
                              newImgs[i] = e.target.value;
                              setImages(newImgs);
                            }}
                            placeholder="HTTPS://..."
                            className="w-full ninja-input pl-16 py-5 text-xs font-bold"
                          />
                        </div>
                        {images.length > 1 && (
                          <button
                            onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                            className="p-4 text-oro/20 hover:text-naranja-naruto transition-all"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setImages([...images, ''])}
                      className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-oro/40 hover:text-oro transition-all ml-2 group"
                    >
                      <div className="w-6 h-[1px] bg-oro/20 group-hover:bg-oro transition-all" />
                      AÑADIR OTRO REGISTRO VISUAL
                    </button>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`w-full py-8 sm:py-10 ninja-btn-oro text-xl sm:text-2xl ${loading ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'REGISTRANDO SANACIÓN...' : initialData ? 'ACTUALIZAR SANACIÓN' : 'PUBLICAR SANACIÓN'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ================= FORMULARIO DE COMBATE / INTERVENCIÓN ================= */
            <>
              {/* Panel de Misión Intervenida */}
              {recordSubtype === 'intervencion' && (
                <div className="p-6 sm:p-8 bg-black/60 border border-red-500/30 ninja-clip-md space-y-6 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-red-500/20 pb-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="text-base sm:text-lg font-black uppercase tracking-[0.25em] text-red-400">
                          MISIÓN INTERVENIDA
                        </h4>
                      </div>
                    </div>

                    {/* Rango Selector */}
                    <div className="flex items-center gap-2 p-1 bg-black/80 border border-red-500/30 ninja-clip-xs self-start sm:self-auto">
                      {(['B', 'A', 'S'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setMisionRango(r);
                            setSelectedMision('');
                          }}
                          className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all ${
                            misionRango === r
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'text-oro/40 hover:text-oro'
                          }`}
                        >
                          RANGO {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dropdown de Selección de Misión */}
                  <div className="space-y-2">
                    <label className="text-caption font-black uppercase tracking-[0.25em] text-oro/60">
                      SELECCIONAR MISIÓN DE RANGO {misionRango} {loadingMisiones && '(Cargando...)'}
                    </label>
                    <NinjaSelect
                      value={selectedMision}
                      onChange={(val) => setSelectedMision(val)}
                      placeholder="SELECCIONA UNA MISIÓN..."
                      options={misiones.map(m => ({
                        label: `${m.codigo_mision} (+${m.exp} EXP${m.pa_recompensa ? ` / +${m.pa_recompensa} PA` : ''})`,
                        value: m.codigo_mision
                      }))}
                    />
                  </div>

                  {/* Resumen de la Misión Seleccionada */}
                  {selectedMisionObj ? (
                    <div className="p-4 bg-black/40 border border-red-500/20 ninja-clip-sm space-y-3 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-red-500/10 pb-2.5">
                        <div>
                          <span className="text-caption font-black text-red-400 uppercase tracking-widest mr-2">
                            [{selectedMisionObj.codigo_mision}]
                          </span>
                          <span className="text-sm font-black text-white uppercase tracking-wider">
                            Misión {selectedMisionObj.codigo_mision} (Rango {selectedMisionObj.rango})
                          </span>
                        </div>
                        <span className="text-caption font-black px-2.5 py-0.5 bg-red-950/60 border border-red-500/40 text-red-300 ninja-clip-xs">
                          RANGO {misionRango}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        {/* Recompensas Éxito */}
                        <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 ninja-clip-xs space-y-1">
                          <span className="text-caption font-black text-emerald-400 uppercase tracking-widest block">
                            RECOMPENSAS POR COMPLETARLA (VICTORIA):
                          </span>
                          <div className="flex flex-wrap items-center gap-3 font-bold text-white">
                            <span>+{selectedMisionObj.exp || 0} EXP</span>
                            <span>+{selectedMisionObj.ryous || 0} RYOUS</span>
                            {Number(selectedMisionObj.pa_recompensa) > 0 && (
                              <span className="text-emerald-300">+{selectedMisionObj.pa_recompensa} PA</span>
                            )}
                          </div>
                        </div>

                        {/* Recompensas Fallo */}
                        <div className="p-3 bg-black/40 border border-oro/10 ninja-clip-xs space-y-1">
                          <span className="text-caption font-black text-oro/60 uppercase tracking-widest block">
                            CONSECUENCIAS DE FALLO (DERROTA):
                          </span>
                          {selectedMisionObj.se_puede_fallar ? (
                            <div className="flex flex-wrap items-center gap-3 font-bold text-white/80">
                              <span>+{selectedMisionObj.exp_fallida || 0} EXP</span>
                              <span>+{selectedMisionObj.ryous_fallida || 0} RYOUS</span>
                              {Number(selectedMisionObj.pa_recompensa_fallida) > 0 && (
                                <span className="text-emerald-300">+{selectedMisionObj.pa_recompensa_fallida} PA</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-caption text-oro/40 italic">
                              Esta misión no otorga recompensas si se falla.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-black/40 border border-dashed border-red-500/20 ninja-clip-sm text-center">
                      <p className="text-caption font-bold text-red-300/60 uppercase tracking-widest">
                        Selecciona la misión intervenida
                      </p>
                    </div>
                  )}

                  {/* Selector de Asignación de Roles de Bando */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-3 border-t border-red-500/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black uppercase tracking-wider text-oro/80">
                        ROLES:
                      </span>
                      <span className="text-xs font-black text-white">
                        Bando A = <span className={bandoMision === 'A' ? 'text-amber-400' : 'text-red-400'}>{bandoMision === 'A' ? 'Realiza Misión' : 'Interventor'}</span>
                        {' • '}
                        Bando B = <span className={bandoMision === 'B' ? 'text-amber-400' : 'text-red-400'}>{bandoMision === 'B' ? 'Realiza Misión' : 'Interventor'}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBandoMision(bandoMision === 'A' ? 'B' : 'A')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-950/40 border border-red-500/40 hover:bg-red-900/40 text-red-300 text-caption font-black uppercase tracking-wider ninja-clip-xs transition-all"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" /> INVERTIR ROLES DE BANDO
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16">
                {/* Bando A */}
                <div className="space-y-8 p-8 bg-black/40 border border-oro/20 ninja-clip-md">
                  <div className="flex items-center justify-between border-b border-oro/10 pb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-black uppercase tracking-[0.3em] text-oro">BANDO A</h4>
                      {recordSubtype === 'intervencion' && (
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ninja-clip-xs border ${
                          bandoMision === 'A'
                            ? 'bg-amber-500/10 border-amber-400/40 text-amber-300'
                            : 'bg-red-500/10 border-red-400/40 text-red-300'
                        }`}>
                          {bandoMision === 'A' ? 'REALIZADOR (MISIÓN)' : 'INTERVENTOR'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-oro/40 uppercase">{teamA.length} NINJAS</span>
                  </div>

                  <div className="space-y-6">
                    <AsyncCharacterSearch
                      placeholder="BUSCAR POR PERSONAJE O HOBBA (BANDO A)..."
                      excludeIds={[...teamA, ...teamB].map(p => p.id)}
                      onSelectCharacter={(p) => addParticipant('A', p)}
                    />

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
                              {recordSubtype === 'intervencion' ? (
                                <>
                                  <div className="flex items-center gap-2 px-3 py-1 bg-oro/10 border border-oro/20 ninja-clip-xs">
                                    <span className="text-caption font-black text-oro">+{calculateIntervencionXP('A', p.huye, p.huye_gana_exp)} EXP</span>
                                  </div>
                                  {calculateIntervencionRyous('A', p.huye) > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-400/20 ninja-clip-xs">
                                      <span className="text-caption font-black text-amber-300">+{calculateIntervencionRyous('A', p.huye)} R</span>
                                    </div>
                                  )}
                                  {calculateIntervencionPA('A', p.huye) > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-success-text/20 ninja-clip-xs">
                                      <span className="text-caption font-black text-emerald-400">+{calculateIntervencionPA('A', p.huye)} PA</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1 bg-oro/10 border border-oro/20 ninja-clip-xs">
                                  <span className="text-caption font-black text-oro">+{calculateXP('A', p.huye, p.huye_gana_exp)} EXP</span>
                                </div>
                              )}
                              <button onClick={() => removeParticipant(p.id, 'A')} className="opacity-0 group-hover/item:opacity-100 p-2 text-oro/20 hover:text-naranja-naruto transition-all">
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
                                className={`px-4 py-2 border text-caption font-black uppercase tracking-widest transition-all ${p.has_estado_alterado ? 'bg-oro/20 border-oro/40 text-oro' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                              >
                                ESTADO ALTERADO
                              </button>
                              <button
                                onClick={() => updateParticipantState(p.id, 'A', { has_cds: !p.has_cds })}
                                className={`px-4 py-2 border text-caption font-black uppercase tracking-widest transition-all ${p.has_cds ? 'bg-blue-500/20 border-blue-400/40 text-blue-300' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                              >
                                CDs
                              </button>
                              <button
                                onClick={() => {
                                  const nextHuye = !p.huye;
                                  updateParticipantState(p.id, 'A', { huye: nextHuye, huye_gana_exp: false });
                                }}
                                className={`px-4 py-2 border text-caption font-black uppercase tracking-widest transition-all ${p.huye ? 'bg-naranja-naruto/20 border-naranja-naruto/40 text-naranja-naruto' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                              >
                                HUYE
                              </button>

                              {p.huye && (
                                <button
                                  type="button"
                                  onClick={() => updateParticipantState(p.id, 'A', { huye_gana_exp: !p.huye_gana_exp })}
                                  className={`flex items-center gap-2.5 px-3.5 py-2 border text-caption font-black uppercase tracking-widest transition-all duration-200 select-none animate-in fade-in zoom-in-95 ${
                                    p.huye_gana_exp
                                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                                      : 'bg-black/40 border-oro/10 text-oro/40 hover:border-oro/30 hover:text-oro/70'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 border flex items-center justify-center transition-all ${
                                      p.huye_gana_exp
                                        ? 'bg-emerald-500 border-emerald-400 text-black shadow-sm'
                                        : 'bg-black/60 border-oro/20'
                                    }`}
                                  >
                                    {p.huye_gana_exp && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span>Gana EXP</span>
                                </button>
                              )}
                            </div>

                            {p.has_estado_alterado && (
                              <textarea
                                value={p.descripcion_estado || ''}
                                onChange={(e) => updateParticipantState(p.id, 'A', { descripcion_estado: e.target.value })}
                                placeholder="Describe el estado..."
                                className="w-full ninja-input p-4 text-xs min-h-[80px] resize-none animate-in slide-in-from-top-2"
                              />
                            )}

                            {p.has_cds && (
                              <textarea
                                value={p.descripcion_cds || ''}
                                onChange={(e) => updateParticipantState(p.id, 'A', { descripcion_cds: e.target.value })}
                                placeholder="Lista de CDs activos..."
                                className="w-full ninja-input p-4 text-xs min-h-[80px] resize-none animate-in slide-in-from-top-2 border-blue-500/20 focus:border-blue-400/40"
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
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-black uppercase tracking-[0.3em] text-oro">BANDO B</h4>
                      {recordSubtype === 'intervencion' && (
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ninja-clip-xs border ${
                          bandoMision === 'B'
                            ? 'bg-amber-500/10 border-amber-400/40 text-amber-300'
                            : 'bg-red-500/10 border-red-400/40 text-red-300'
                        }`}>
                          {bandoMision === 'B' ? 'REALIZADOR (MISIÓN)' : 'INTERVENTOR'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-oro/40 uppercase">{teamB.length} NINJAS</span>
                  </div>

                  <div className="space-y-6">
                    <AsyncCharacterSearch
                      placeholder="BUSCAR POR PERSONAJE O HOBBA (BANDO B)..."
                      excludeIds={[...teamA, ...teamB].map(p => p.id)}
                      onSelectCharacter={(p) => addParticipant('B', p)}
                    />

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
                              {recordSubtype === 'intervencion' ? (
                                <>
                                  <div className="flex items-center gap-2 px-3 py-1 bg-oro/10 border border-oro/20 ninja-clip-xs">
                                    <span className="text-caption font-black text-oro">+{calculateIntervencionXP('B', p.huye, p.huye_gana_exp)} EXP</span>
                                  </div>
                                  {calculateIntervencionRyous('B', p.huye) > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-400/20 ninja-clip-xs">
                                      <span className="text-caption font-black text-amber-300">+{calculateIntervencionRyous('B', p.huye)} R</span>
                                    </div>
                                  )}
                                  {calculateIntervencionPA('B', p.huye) > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-success-text/20 ninja-clip-xs">
                                      <span className="text-caption font-black text-emerald-400">+{calculateIntervencionPA('B', p.huye)} PA</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1 bg-oro/10 border border-oro/20 ninja-clip-xs">
                                  <span className="text-caption font-black text-oro">+{calculateXP('B', p.huye, p.huye_gana_exp)} EXP</span>
                                </div>
                              )}
                              <button onClick={() => removeParticipant(p.id, 'B')} className="opacity-0 group-hover/item:opacity-100 p-2 text-oro/20 hover:text-naranja-naruto transition-all">
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
                                className={`px-4 py-2 border text-caption font-black uppercase tracking-widest transition-all ${p.has_estado_alterado ? 'bg-oro/20 border-oro/40 text-oro' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                              >
                                ESTADO ALTERADO
                              </button>
                              <button
                                onClick={() => updateParticipantState(p.id, 'B', { has_cds: !p.has_cds })}
                                className={`px-4 py-2 border text-caption font-black uppercase tracking-widest transition-all ${p.has_cds ? 'bg-blue-500/20 border-blue-400/40 text-blue-300' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                              >
                                CDs
                              </button>
                              <button
                                onClick={() => {
                                  const nextHuye = !p.huye;
                                  updateParticipantState(p.id, 'B', { huye: nextHuye, huye_gana_exp: false });
                                }}
                                className={`px-4 py-2 border text-caption font-black uppercase tracking-widest transition-all ${p.huye ? 'bg-naranja-naruto/20 border-naranja-naruto/40 text-naranja-naruto' : 'bg-black/20 border-oro/5 text-oro/20'}`}
                              >
                                HUYE
                              </button>

                              {p.huye && (
                                <button
                                  type="button"
                                  onClick={() => updateParticipantState(p.id, 'B', { huye_gana_exp: !p.huye_gana_exp })}
                                  className={`flex items-center gap-2.5 px-3.5 py-2 border text-caption font-black uppercase tracking-widest transition-all duration-200 select-none animate-in fade-in zoom-in-95 ${
                                    p.huye_gana_exp
                                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                                      : 'bg-black/40 border-oro/10 text-oro/40 hover:border-oro/30 hover:text-oro/70'
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 border flex items-center justify-center transition-all ${
                                      p.huye_gana_exp
                                        ? 'bg-emerald-500 border-emerald-400 text-black shadow-sm'
                                        : 'bg-black/60 border-oro/20'
                                    }`}
                                  >
                                    {p.huye_gana_exp && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span>Gana EXP</span>
                                </button>
                              )}
                            </div>

                            {p.has_estado_alterado && (
                              <textarea
                                value={p.descripcion_estado || ''}
                                onChange={(e) => updateParticipantState(p.id, 'B', { descripcion_estado: e.target.value })}
                                placeholder="Describe el estado..."
                                className="w-full ninja-input p-4 text-xs min-h-[80px] resize-none animate-in slide-in-from-top-2"
                              />
                            )}

                            {p.has_cds && (
                              <textarea
                                value={p.descripcion_cds || ''}
                                onChange={(e) => updateParticipantState(p.id, 'B', { descripcion_cds: e.target.value })}
                                placeholder="Lista de CDs activos..."
                                className="w-full ninja-input p-4 text-xs min-h-[80px] resize-none animate-in slide-in-from-top-2 border-blue-500/20 focus:border-blue-400/40"
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
                <div className="flex flex-col xl:flex-row gap-12 items-start">
                  <div className="flex-1 w-full space-y-6">
                    <div className="flex items-center gap-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.4em] text-oro/40"> ELEGIR RESULTADO FINAL</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {[
                        { id: 'A', label: 'VICTORIA A', color: 'bg-oro text-naranja-naruto border-oro' },
                        { id: 'Empate', label: 'EMPATE', color: 'bg-white/10 text-white/60 border-white/20' },
                        { id: 'B', label: 'VICTORIA B', color: 'bg-oro text-naranja-naruto border-oro' }
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

                    {/* Explicación de Resolución para Intervención */}
                    {recordSubtype === 'intervencion' && (
                      <div className="p-4 bg-black/60 border border-red-500/20 ninja-clip-sm space-y-1 text-xs">
                        <span className="text-caption font-black uppercase tracking-widest text-red-400 block">
                          RESOLUCIÓN DE LA INTERVENCIÓN (REGLA 6.15):
                        </span>
                        <p className="text-oro/80 font-medium">
                          {winner === 'A'
                            ? `Victoria para el BANDO A (${bandoMision === 'A' ? 'Realizador' : 'Interventor'}): Completa la misión ${selectedMisionObj?.codigo_mision || ''} y recibe EXP/PA de victoria + recompensas de misión completada. El Bando B falla la misión.`
                            : winner === 'B'
                              ? `Victoria para el BANDO B (${bandoMision === 'B' ? 'Realizador' : 'Interventor'}): Completa la misión ${selectedMisionObj?.codigo_mision || ''} y recibe EXP/PA de victoria + recompensas de misión completada. El Bando A falla la misión.`
                              : 'Empate: Ningún bando completa la misión ni se otorga experiencia de combate.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 w-full xl:w-auto shrink-0">
                    {combatConfig && (
                      <div className="w-full md:w-[320px] p-6 bg-black/40 border border-oro/10 ninja-clip-md text-xs font-black uppercase tracking-widest space-y-4">
                        <div className="flex items-center gap-4 border-b border-oro/10 pb-3 opacity-60">
                          <Info className="w-4 h-4 text-oro" />
                          <span>TABLA DE EXP</span>
                        </div>
                        {combatConfig.victoria ? (
                          <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-center text-caption">
                            <div className="text-left text-oro/40">Diferencia</div>
                            <div className="text-green-500">Victoria</div>
                            <div className="text-red-500">Derrota</div>

                            <div className="text-left text-oro/30">+2 Sup</div>
                            <div className="text-oro">+{combatConfig.victoria.mas_2}</div>
                            <div className="text-oro">+{combatConfig.derrota.mas_2}</div>

                            <div className="text-left text-oro/30">+1 Sup</div>
                            <div className="text-oro">+{combatConfig.victoria.mas_1}</div>
                            <div className="text-oro">+{combatConfig.derrota.mas_1}</div>

                            <div className="text-left text-oro/30">= Rango</div>
                            <div className="text-oro">+{combatConfig.victoria.igual}</div>
                            <div className="text-oro">+{combatConfig.derrota.igual}</div>

                            <div className="text-left text-oro/30">-1 Inf</div>
                            <div className="text-oro">+{combatConfig.victoria.menos_1}</div>
                            <div className="text-oro">+{combatConfig.derrota.menos_1}</div>

                            <div className="text-left text-oro/30">-2 Inf</div>
                            <div className="text-oro">+{combatConfig.victoria.menos_2}</div>
                            <div className="text-oro">+{combatConfig.derrota.menos_2}</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between"><span>Victoria</span><span className="text-oro">+{combatConfig.ganar} EXP</span></div>
                            <div className="flex justify-between"><span>Derrota</span><span className="text-oro">+{combatConfig.perder} EXP</span></div>
                          </div>
                        )}
                        <div className="text-caption text-oro/30 border-t border-oro/5 pt-2 text-center normal-case font-bold">
                          El empate siempre otorga 0 EXP.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pruebas de la Intervención */}
              {recordSubtype === 'intervencion' && (
                <div className="space-y-6 pt-8 border-t border-oro/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-[0.3em] text-oro/40 ml-2">
                      PRUEBAS DE LA INTERVENCIÓN (URLs DE DISCORD / CAPTURAS)
                    </label>
                    <span className="text-caption text-oro/40 font-bold uppercase">Mínimo 1 prueba requerida</span>
                  </div>
                  <div className="space-y-4">
                    {images.map((img, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-oro/20" />
                          <input
                            value={img}
                            onChange={(e) => {
                              const newImgs = [...images];
                              newImgs[i] = e.target.value;
                              setImages(newImgs);
                            }}
                            placeholder="HTTPS://..."
                            className="w-full ninja-input pl-16 py-5 text-xs font-bold"
                          />
                        </div>
                        {images.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                            className="p-4 text-oro/20 hover:text-naranja-naruto transition-all"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setImages([...images, ''])}
                      className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-oro/40 hover:text-oro transition-all ml-2 group"
                    >
                      <div className="w-6 h-[1px] bg-oro/20 group-hover:bg-oro transition-all" />
                      AÑADIR OTRO REGISTRO VISUAL
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-10">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`w-full py-8 sm:py-10 ${recordSubtype === 'intervencion' ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)]' : 'ninja-btn-oro'} text-xl sm:text-2xl transition-all font-black uppercase tracking-widest ${loading ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                  {loading
                    ? (recordSubtype === 'intervencion' ? 'SELLANDO INTERVENCIÓN...' : 'SELLANDO ARCHIVO DE GUERRA...')
                    : initialData
                      ? (recordSubtype === 'intervencion' ? 'ACTUALIZAR INTERVENCIÓN' : 'ACTUALIZAR CRÓNICA')
                      : (recordSubtype === 'intervencion' ? 'PUBLICAR INTERVENCIÓN' : 'PUBLICAR CRÓNICA')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
