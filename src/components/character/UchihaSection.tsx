'use client';

import { useState, useMemo, useEffect } from 'react';
import { Trash2, Link as LinkIcon, Calendar } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { NinjaSelect, SearchableSelect } from '@/components/ui/Fields';
import { Character, Glosario, PersonajeUchihaData, UchihaCopiaSlot } from '@/domain/types';
import { CharacterService } from '@/services/supabase/character.service';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';

interface UchihaSectionProps {
  character: Character;
  masters: any;
  glosarioFiltrado: Glosario[];
  derivedElements?: any[];
  isEditing: boolean;
  canEdit: boolean;
  isAdmin?: boolean;
  isNew: boolean;
  onUpdateField: (field: keyof Character, value: any) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Comprobar si ha pasado al menos 1 mes desde la fecha de copia
export const checkCanDeleteUchihaCopy = (fechaCopiaStr?: string) => {
  if (!fechaCopiaStr) {
    const defaultUnlock = new Date();
    defaultUnlock.setMonth(defaultUnlock.getMonth() + 1);
    return { canDelete: false, availableDateStr: defaultUnlock.toLocaleDateString('es-ES') };
  }

  const parts = fechaCopiaStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const defaultUnlock = new Date();
    defaultUnlock.setMonth(defaultUnlock.getMonth() + 1);
    return { canDelete: false, availableDateStr: defaultUnlock.toLocaleDateString('es-ES') };
  }

  const [year, month, day] = parts;
  // month en JS Date(year, monthIndex, day) es 0-index.
  // parts[1] (1-12) equivale automáticamente al mes siguiente en 0-index:
  const unlockDate = new Date(year, month, day);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const canDelete = now.getTime() >= unlockDate.getTime();
  const availableDateStr = unlockDate.toLocaleDateString('es-ES');

  return { canDelete, availableDateStr };
};

// Configuración de los 8 slots de Hasei: Kopī
export const UCHIHA_SLOTS_CONFIG = [
  { key: 'D_1', rango: 'D', nombre: 'Hueco D #1', costeExp: 0, costePa: 0, desbloqueadoInicial: true },
  { key: 'D_2', rango: 'D', nombre: 'Hueco D #2', costeExp: 0, costePa: 0, desbloqueadoInicial: true },
  { key: 'D_3', rango: 'D', nombre: 'Hueco D #3', costeExp: 20, costePa: 25, desbloqueadoInicial: false },
  { key: 'C_1', rango: 'C', nombre: 'Hueco C #1', costeExp: 30, costePa: 35, desbloqueadoInicial: false },
  { key: 'C_2', rango: 'C', nombre: 'Hueco C #2', costeExp: 30, costePa: 35, desbloqueadoInicial: false },
  { key: 'C_3', rango: 'C', nombre: 'Hueco C #3', costeExp: 30, costePa: 35, desbloqueadoInicial: false },
  { key: 'B_1', rango: 'B', nombre: 'Hueco B #1', costeExp: 60, costePa: 45, desbloqueadoInicial: false },
  { key: 'B_2', rango: 'B', nombre: 'Hueco B #2', costeExp: 60, costePa: 45, desbloqueadoInicial: false },
];

const RAMA_COMBATE_OPTIONS = [
  { label: 'Ninjutsu', value: 'Ninjutsu' },
  { label: 'Taijutsu', value: 'Taijutsu' },
  { label: 'Genjutsu', value: 'Genjutsu' },
  { label: 'Shurikenjutsu', value: 'Shurikenjutsu' },
  { label: 'Bujutsu', value: 'Bujutsu' },
];

export default function UchihaSection({
  character,
  masters,
  glosarioFiltrado,
  derivedElements,
  isEditing,
  canEdit,
  isAdmin = false,
  isNew,
  onUpdateField,
  addToast
}: UchihaSectionProps) {
  const { confirm: confirmAction } = useConfirmStore();

  // Estado local para los datos Uchiha
  const [uchihaData, setUchihaData] = useState<PersonajeUchihaData>({
    personaje_id: character.id,
    rama_combate: (character as any).personaje_uchiha?.rama_combate || null,
    slots_desbloqueados: (character as any).personaje_uchiha?.slots_desbloqueados || ['D_1', 'D_2'],
    copias: (character as any).personaje_uchiha?.copias || {}
  });
  const [loading, setLoading] = useState(false);

  // Sincronizar uchihaData cuando character.personaje_uchiha se actualiza externamente (ej. tras guardar o recargar)
  useEffect(() => {
    if (character.personaje_uchiha) {
      setUchihaData(character.personaje_uchiha);
    }
  }, [character.personaje_uchiha]);

  // Carga perezosa si no vienen en character y personaje ya existe
  useEffect(() => {
    if (character.id && !character.personaje_uchiha) {
      setLoading(true);
      CharacterService.getUchihaData(character.id)
        .then(data => {
          if (data) {
            setUchihaData(data);
            onUpdateField('personaje_uchiha', data);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [character.id, character.personaje_uchiha]);

  // 1. Sincronizar cambios en el estado general del personaje
  const updateUchiha = (partial: Partial<PersonajeUchihaData>) => {
    const updated: PersonajeUchihaData = {
      ...uchihaData,
      ...partial,
      personaje_id: character.id
    };
    setUchihaData(updated);
    onUpdateField('personaje_uchiha', updated);
  };

  // 2. Calcular Tomoes (Desbloqueo por Rango: 1 aspa al entrar al clan, 2 aspas en C, 3 aspas en B)
  const rankPriority: Record<string, number> = { 'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };
  const currentRankVal = rankPriority[character.rango] ?? 1;

  const tomoesInfo = useMemo(() => {
    if (currentRankVal >= 3) {
      return {
        level: 3,
        label: '3 TOMOES (3 ASPAS)',
        color: 'text-red-500',
        bg: 'bg-red-950/40 border-red-500/50',
        image: '/assets/uchiha/3.webp'
      };
    }
    if (currentRankVal >= 2) {
      return {
        level: 2,
        label: '2 TOMOES (2 ASPAS)',
        color: 'text-red-400',
        bg: 'bg-red-950/30 border-red-400/40',
        image: '/assets/uchiha/2.webp'
      };
    }
    return {
      level: 1,
      label: '1 TOMOE (1 ASPA)',
      color: 'text-red-300',
      bg: 'bg-red-950/20 border-red-300/30',
      image: '/assets/uchiha/1.webp'
    };
  }, [currentRankVal]);

  // 3. Desbloquear Slot con coste de EXP y PA
  const handleUnlockSlot = (slot: typeof UCHIHA_SLOTS_CONFIG[0]) => {
    if (!isEditing && !isNew) {
      addToast('Debes estar en modo edición para desbloquear huecos', 'info');
      return;
    }

    // Verificar rango mínimo para el slot
    const slotRankVal = rankPriority[slot.rango] || 1;
    if (currentRankVal < slotRankVal) {
      addToast(`Tu rango actual (${character.rango}) no permite desbloquear huecos de Rango ${slot.rango}`, 'error');
      return;
    }

    const currentExp = character.xp || 0;
    const currentPa = character.puntos_aprendizaje || 0;

    if (currentExp < slot.costeExp || currentPa < slot.costePa) {
      addToast(`Recursos insuficientes. Requiere ${slot.costeExp} EXP y ${slot.costePa} PA.`, 'error');
      return;
    }

    // Descontar coste y registrar slot desbloqueado
    const newUnlocked = Array.from(new Set([...(uchihaData.slots_desbloqueados || []), slot.key]));
    updateUchiha({ slots_desbloqueados: newUnlocked });

    if (slot.costeExp > 0) onUpdateField('xp', currentExp - slot.costeExp);
    if (slot.costePa > 0) onUpdateField('puntos_aprendizaje', currentPa - slot.costePa);

    addToast(`Hueco ${slot.nombre} desbloqueado exitosamente.`, 'success');
  };

  // 4. Copiar técnica a un slot
  const handleAssignTechnique = (slotKey: string, tecnicaId: number) => {
    const catalog = (masters?.glosario && masters.glosario.length > 0) ? masters.glosario : glosarioFiltrado;
    const tecObj = (catalog || []).find((t: any) => t.id === Number(tecnicaId));
    if (!tecObj) return;

    const currentCopias = { ...(uchihaData.copias || {}) };
    currentCopias[slotKey] = {
      tecnica_id: tecObj.id,
      fecha_copia: currentCopias[slotKey]?.fecha_copia || new Date().toISOString().split('T')[0],
      evidencia_url: currentCopias[slotKey]?.evidencia_url || '',
      info_glosario: tecObj
    };

    updateUchiha({ copias: currentCopias });

    // Sincronizar con personajes_tecnicas si no está ya
    const currentTecs = character.personajes_tecnicas || [];
    if (!currentTecs.some((t: any) => Number(t.tecnica_id) === tecObj.id)) {
      onUpdateField('personajes_tecnicas', [
        ...currentTecs,
        { tecnica_id: tecObj.id, info_glosario: tecObj, origen: `uchiha_${slotKey}` }
      ]);
    }

    addToast(`Técnica "${tecObj.nombre_jp || tecObj.nombre_es}" copiada en ${slotKey}.`, 'success');
  };

  // 5. Eliminar/Liberar técnica de un slot
  const handleRemoveTechnique = async (slotKey: string) => {
    const currentCopias = { ...(uchihaData.copias || {}) };
    const removedSlot = currentCopias[slotKey];
    if (!removedSlot) return;

    const { canDelete, availableDateStr } = checkCanDeleteUchihaCopy(removedSlot.fecha_copia);
    if (!canDelete) {
      if (!isAdmin) {
        addToast(`No se puede eliminar la técnica hasta pasado 1 mes desde su copiado (disponible el ${availableDateStr}).`, 'error');
        return;
      }

      const catalog = (masters?.glosario && masters.glosario.length > 0) ? masters.glosario : glosarioFiltrado;
      const tecObj = (removedSlot as any).info_glosario || (catalog || []).find((t: any) => t.id === Number(removedSlot.tecnica_id));
      const tecName = tecObj ? (tecObj.nombre_jp || tecObj.nombre_es) : `Técnica #${removedSlot.tecnica_id}`;

      const confirmed = await confirmAction({
        title: 'Forzar retirada de técnica (Admin)',
        message: `Aún no ha transcurrido 1 mes desde la copia de "${tecName}" (disponible normalmente el ${availableDateStr}). Como administrador, ¿deseas forzar su retirada ahora?`,
        variant: 'danger',
        confirmLabel: 'Forzar Retirada'
      });

      if (!confirmed) return;
    }

    delete currentCopias[slotKey];
    updateUchiha({ copias: currentCopias });

    // Quitar de personajes_tecnicas si fue agregada por esta copia
    const currentTecs = character.personajes_tecnicas || [];
    const remainingCopiedIds = Object.values(currentCopias).map(c => Number(c.tecnica_id));
    
    // Solo se remueve si ninguna otra ranura la está copiando
    if (!remainingCopiedIds.includes(Number(removedSlot.tecnica_id))) {
      const filteredTecs = currentTecs.filter((t: any) => Number(t.tecnica_id) !== Number(removedSlot.tecnica_id));
      onUpdateField('personajes_tecnicas', filteredTecs);
    }

    addToast(`Técnica olvidada del hueco ${slotKey}.`, 'info');
  };

  // 6. Actualizar evidencia o fecha del slot
  const handleUpdateSlotMeta = (slotKey: string, field: 'fecha_copia' | 'evidencia_url', value: string) => {
    if (field === 'fecha_copia' && !isAdmin) {
      addToast('La fecha de copiado no se puede modificar posteriormente.', 'error');
      return;
    }
    const currentCopias = { ...(uchihaData.copias || {}) };
    if (!currentCopias[slotKey]) return;

    currentCopias[slotKey] = {
      ...currentCopias[slotKey],
      [field]: value
    };
    updateUchiha({ copias: currentCopias });
  };

  // Obtener IDs de elementos que posee el personaje
  const characterElementIds = useMemo(() => {
    if (derivedElements && derivedElements.length > 0) {
      return derivedElements.map((e: any) => Number(e.id));
    }
    const fijosSet = new Set<number>();
    const charRamas = character.personajes_ramas || [];
    charRamas.forEach((pr: any) => {
      if (pr.elemento_principal_id) fijosSet.add(Number(pr.elemento_principal_id));
      if (pr.elemento_secundario_id) fijosSet.add(Number(pr.elemento_secundario_id));
      if (pr.elemento_terciario_id) fijosSet.add(Number(pr.elemento_terciario_id));
      if (masters?.ramaElementos && pr.rama_id) {
        masters.ramaElementos
          .filter((re: any) => Number(re.rama_id) === Number(pr.rama_id) && re.tipo === 'fijo')
          .forEach((re: any) => {
            if (re.elemento_id) fijosSet.add(Number(re.elemento_id));
          });
      }
    });
    return Array.from(fijosSet);
  }, [derivedElements, character.personajes_ramas, masters?.ramaElementos]);

  // 7. Filtrar catálogo de técnicas válidas por cada rango de slot
  // Ramas básicas permitidas: Ninjutsu (4), Taijutsu (8), Genjutsu (10), Bukijutsu (12)
  // Requisitos:
  // - Deben estar asociadas a una rama básica (NO técnicas generales con rama_clan_id = null ni clanes).
  // - En caso de Ninjutsu (rama 4), debe pertenecer a los elementos que posea el personaje.
  const getOptionsForSlot = (slotRank: string) => {
    const validBasicBranchIds = [4, 8, 10, 12];
    const catalog = (masters?.glosario && masters.glosario.length > 0) ? masters.glosario : glosarioFiltrado;

    // IDs de técnicas que el usuario ya posee (aprendidas o copiadas en otros slots)
    const possessedIds = new Set<number>([
      ...(character.personajes_tecnicas || []).map((pt: any) => Number(pt.tecnica_id)).filter(Boolean),
      ...Object.values(uchihaData.copias || {}).map((c: any) => Number(c?.tecnica_id)).filter(Boolean)
    ]);

    return (catalog || [])
      .filter((t: any) => {
        // Categoría 1 = Técnicas
        if (t.categoria_id !== 1) return false;

        // Excluir técnicas que el personaje ya posee
        if (possessedIds.has(Number(t.id))) return false;

        // Rango igual al slot
        if (t.rango !== slotRank) return false;

        // Debe pertenecer obligatoriamente a una rama básica (se excluyen generales null y clanes)
        if (!t.rama_clan_id || !validBasicBranchIds.includes(Number(t.rama_clan_id))) {
          return false;
        }

        // Si es Ninjutsu (4), debe ser de los elementos que posea el personaje
        if (Number(t.rama_clan_id) === 4) {
          if (!t.elemento_id) return false;
          if (!characterElementIds.includes(Number(t.elemento_id))) {
            return false;
          }
        }

        return true;
      })
      .map((t: any) => ({
        label: `${t.nombre_jp ? `${t.nombre_jp} - ` : ''}${t.nombre_es} (Rango ${t.rango || 'D'})`,
        value: String(t.id)
      }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* TARJETA CONTENEDORA PRINCIPAL */}
      <SectionCard title="RAMA SECUNDARIA: COPIA (HASEI: KOPĪ)" color="oro">
        <div className="space-y-10">
          {/* SECCIÓN CABECERA: KEKKEI GENKAI SHARINGAN & RAMA DE COMBATE */}
          <div className="border-b border-oro/10 pb-8 space-y-6">
            <div className="text-xl sm:text-2xl font-black text-oro uppercase tracking-[0.2em]">
              CLAN UCHIHA — KEKKEI GENKAI: SHARINGAN
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Selector de Rama de Combate */}
              <div className="space-y-3">
                <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">
                  Rama de Combate Principal
                </label>
                <NinjaSelect
                  value={uchihaData.rama_combate || ''}
                  options={RAMA_COMBATE_OPTIONS}
                  disabled={!isEditing && !isNew}
                  placeholder="SELECCIONAR RAMA DE COMBATE..."
                  onChange={(val) => updateUchiha({ rama_combate: val ? (val as any) : null })}
                />
                <p className="text-[11px] text-oro/40 italic ml-1">
                  Define los efectos adicionales en las técnicas clan (ej. Shishi Rendan, Ryūka, Gōkakyū).
                </p>
              </div>

              {/* Indicador Visual de Nivel de Tomoes */}
              <div className={`p-6 ninja-clip-sm flex items-center justify-between gap-6`}>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-black tracking-widest text-oro/50">
                    Estado del Dōjutsu
                  </div>
                  <div className={`text-lg font-black tracking-widest ${tomoesInfo.color}`}>
                    {tomoesInfo.label}
                  </div>
                </div>

                {/* Imagen Sharingan */}
                <div className="shrink-0">
                  <img
                    src={tomoesInfo.image}
                    alt={tomoesInfo.label}
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 sm:w-18 sm:h-18 object-cover border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN COPIA (HASEI: KOPĪ) DENTRO DEL MISMO CONTENEDOR */}
          <div className="space-y-6">
            <div className="text-xs text-oro/60 leading-relaxed border-b border-oro/10 pb-4">
              Los Uchiha poseen la capacidad única de personalizar su rama secundaria mediante la copia de técnicas básicas de Ninjutsu, Taijutsu, Genjutsu, Shurikenjutsu y Bujutsu.
            </div>

          {/* Grupos de Slots por Rango */}
          {['D', 'C', 'B'].map((rangoGroup) => {
            const slotsInGroup = UCHIHA_SLOTS_CONFIG.filter(s => s.rango === rangoGroup);
            const options = getOptionsForSlot(rangoGroup);

            return (
              <div key={rangoGroup} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-oro/10 pb-2">
                  <span className="text-sm font-black text-oro tracking-widest uppercase">
                    Huecos de Rango {rangoGroup}
                  </span>
                  <span className="text-[10px] text-oro/40 uppercase tracking-wider">
                    {rangoGroup === 'D' && '(2 libres iniciales + 1 bloqueado [20 EXP / 25 PA])'}
                    {rangoGroup === 'C' && '(3 bloqueados [30 EXP / 35 PA cada una])'}
                    {rangoGroup === 'B' && '(2 bloqueados [60 EXP / 45 PA cada una])'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {slotsInGroup.map((slot) => {
                    const isUnlocked = slot.desbloqueadoInicial || (uchihaData.slots_desbloqueados || []).includes(slot.key);
                    const copia = uchihaData.copias?.[slot.key];
                    const catalog = (masters?.glosario && masters.glosario.length > 0) ? masters.glosario : glosarioFiltrado;
                    const tecObj = copia?.info_glosario || (catalog || []).find((t: any) => t.id === Number(copia?.tecnica_id));

                    return (
                      <div
                        key={slot.key}
                        className={`p-5 border border-oro/5 ninja-clip-sm transition-all flex flex-col justify-between ${
                          isUnlocked
                            ? 'bg-black/50'
                            : 'bg-black/30 opacity-70'
                        }`}
                      >
                        {/* Cabecera del Slot */}
                        <div className="flex items-center justify-between pb-3 border-b border-oro/10">
                          <span className="text-xs font-black tracking-wider text-oro">
                            {slot.nombre}
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider ${
                                isUnlocked
                                  ? 'bg-white text-naranja-naruto border border-black shadow-sm'
                                  : 'bg-naranja-naruto text-black border border-black'
                              }`}
                            >
                              {isUnlocked ? 'DESBLOQUEADO' : 'BLOQUEADO'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 border border-oro/10 text-oro/60">
                              Rango {slot.rango}
                            </span>
                          </div>
                        </div>

                        {/* Contenido del Slot */}
                        <div className="py-4 space-y-4">
                          {!isUnlocked ? (
                            <div className="space-y-3 text-center py-2">
                              <p className="text-xs text-oro/40">
                                Bloqueado — Coste: {slot.costeExp} EXP / {slot.costePa} PA
                              </p>
                              {(isEditing || isNew) && (
                                <button
                                  type="button"
                                  onClick={() => handleUnlockSlot(slot)}
                                  className="w-full py-2 bg-oro/10 border border-oro/30 text-oro text-xs font-black uppercase tracking-wider hover:bg-oro hover:text-black transition-all ninja-clip-sm"
                                >
                                  Desbloquear Hueco
                                </button>
                              )}
                            </div>
                          ) : tecObj ? (
                            <div className="space-y-3">
                              {/* Técnica Asignada */}
                              <div className="p-3 bg-oro/5 border border-oro/5 rounded">
                                <div className="text-xs font-black text-oro">
                                  {tecObj.nombre_jp || tecObj.nombre_es}
                                </div>
                                {tecObj.nombre_jp && (
                                  <div className="text-[11px] text-oro/60">{tecObj.nombre_es}</div>
                                )}
                              </div>

                              {/* Metadatos: Fecha y Enlace Evidencia */}
                              {!isEditing && !isNew ? (
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-oro/5">
                                  <span className="text-xs text-oro/70 font-bold tracking-wider">
                                    Fecha copia: {copia?.fecha_copia
                                      ? (copia.fecha_copia.includes('-') ? copia.fecha_copia.split('-').reverse().join('/') : copia.fecha_copia)
                                      : 'Sin fecha'}
                                  </span>
                                  {copia?.evidencia_url ? (
                                    <a
                                      href={copia.evidencia_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1 bg-oro/10 border border-oro/30 text-oro text-[11px] font-black uppercase tracking-wider hover:bg-oro hover:text-black transition-all ninja-clip-xs"
                                    >
                                      Ver prueba
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="px-3 py-1 bg-black/40 border border-oro/10 text-oro/30 text-[11px] font-bold uppercase tracking-wider cursor-not-allowed ninja-clip-xs"
                                    >
                                      Sin enlace
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-oro/40 shrink-0" />
                                    <input
                                      type="date"
                                      value={copia?.fecha_copia || ''}
                                      disabled={!isAdmin && !!copia?.fecha_copia}
                                      onChange={(e) => handleUpdateSlotMeta(slot.key, 'fecha_copia', e.target.value)}
                                      className={`w-full bg-black/60 border border-oro/10 px-2 py-1 text-xs text-oro outline-none focus:border-oro/40 ${
                                        !isAdmin && copia?.fecha_copia ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                      title={!isAdmin && copia?.fecha_copia ? 'La fecha de copiado no se puede modificar posteriormente' : 'Fecha de copiado'}
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <LinkIcon className="w-3.5 h-3.5 text-oro/40 shrink-0" />
                                    <input
                                      type="url"
                                      placeholder="URL Pantallazo combate..."
                                      value={copia?.evidencia_url || ''}
                                      onChange={(e) => handleUpdateSlotMeta(slot.key, 'evidencia_url', e.target.value)}
                                      className="w-full bg-black/60 border border-oro/10 px-2 py-1 text-xs text-oro outline-none focus:border-oro/40 placeholder:text-oro/20"
                                      title="Enlace a la evidencia del combate"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-xs text-oro/40 italic">Hueco disponible para copiar técnica.</p>
                              {(isEditing || isNew) && (
                                <SearchableSelect
                                  label=""
                                  placeholder="SELECCIONAR TÉCNICA..."
                                  options={options}
                                  onChange={(val) => handleAssignTechnique(slot.key, Number(val))}
                                />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Botón de Quitar Técnica */}
                        {isUnlocked && tecObj && (isEditing || isNew) && (() => {
                          const { canDelete, availableDateStr } = checkCanDeleteUchihaCopy(copia?.fecha_copia);
                          const isDeleteAllowed = canDelete || isAdmin;

                          return (
                            <div className="pt-2 border-t border-oro/10">
                              <button
                                type="button"
                                onClick={() => handleRemoveTechnique(slot.key)}
                                disabled={!isDeleteAllowed}
                                title={
                                  !canDelete
                                    ? isAdmin
                                      ? `Aún no pasa 1 mes (disponible el ${availableDateStr}). Como admin puedes forzar la retirada.`
                                      : `Bloqueado hasta el ${availableDateStr} (1 mes desde su copiado)`
                                    : 'Quitar Técnica'
                                }
                                className={`w-full flex items-center justify-center gap-2 py-1.5 text-[11px] font-black uppercase transition-all rounded ${
                                  isDeleteAllowed
                                    ? isAdmin && !canDelete
                                      ? 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-950/20 border border-amber-500/30'
                                      : 'text-red-400/80 hover:text-red-400 hover:bg-red-950/20 border border-red-500/20'
                                    : 'text-oro/30 bg-black/40 border border-oro/10 cursor-not-allowed opacity-50'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>
                                  {isDeleteAllowed
                                    ? isAdmin && !canDelete
                                      ? `Forzar Retirada (Hasta ${availableDateStr})`
                                      : 'Quitar Técnica'
                                    : `Bloqueado (Hasta ${availableDateStr})`}
                                </span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
