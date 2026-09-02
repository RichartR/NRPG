'use client';

import { useState, useMemo, useEffect } from 'react';
import { Eye, Lock, Unlock, Sparkles, Trash2, Link as LinkIcon, Calendar, Check, AlertCircle, ShieldAlert, Swords } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { NinjaSelect, SearchableSelect } from '@/components/ui/Fields';
import { Character, Glosario, PersonajeUchihaData, UchihaCopiaSlot } from '@/domain/types';
import { CharacterService } from '@/services/supabase/character.service';

interface UchihaSectionProps {
  character: Character;
  masters: any;
  glosarioFiltrado: Glosario[];
  isEditing: boolean;
  canEdit: boolean;
  isNew: boolean;
  onUpdateField: (field: keyof Character, value: any) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

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
  isEditing,
  canEdit,
  isNew,
  onUpdateField,
  addToast
}: UchihaSectionProps) {
  // Estado local para los datos Uchiha
  const [uchihaData, setUchihaData] = useState<PersonajeUchihaData>({
    personaje_id: character.id,
    rama_combate: (character as any).personaje_uchiha?.rama_combate || null,
    slots_desbloqueados: (character as any).personaje_uchiha?.slots_desbloqueados || ['D_1', 'D_2'],
    copias: (character as any).personaje_uchiha?.copias || {}
  });
  const [loading, setLoading] = useState(false);

  // Carga perezosa si no vienen en character y personaje ya existe
  useEffect(() => {
    if (character.id && !(character as any).personaje_uchiha) {
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
  }, [character.id]);

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

  // 2. Calcular Tomoes (Requisitos acumulados de EXP, PA y Rango)
  // 1 tomoe: Rango D, 100 EXP acum, 10 PA acum
  // 2 tomoe: Rango C, 450 EXP acum, 120 PA acum
  // 3 tomoe: Rango B, 980 EXP acum, 320 PA acum
  const rankPriority: Record<string, number> = { 'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };
  const currentRankVal = rankPriority[character.rango] || 1;

  // Tomamos EXP y PA acumulados históricos (si existen masters/totalExp, o valores actuales)
  const totalExp = character.xp || 0;
  const totalPa = character.puntos_aprendizaje || 0;

  const tomoesInfo = useMemo(() => {
    if (currentRankVal >= 3 && totalExp >= 980 && totalPa >= 320) {
      return { level: 3, label: '3 TOMOES (3 ASPAS)', color: 'text-red-500', bg: 'bg-red-950/40 border-red-500/50', desc: 'Percepción máxima y anticipación avanzada.' };
    }
    if (currentRankVal >= 2 && totalExp >= 450 && totalPa >= 120) {
      return { level: 2, label: '2 TOMOES (2 ASPAS)', color: 'text-red-400', bg: 'bg-red-950/30 border-red-400/40', desc: 'Reflejos mejorados y fluidez en combate.' };
    }
    if (currentRankVal >= 1 && totalExp >= 100 && totalPa >= 10) {
      return { level: 1, label: '1 TOMOE (1 ASPA)', color: 'text-red-300', bg: 'bg-red-950/20 border-red-300/30', desc: 'Despertar inicial del Dōjutsu.' };
    }
    return { level: 0, label: 'BLOQUEADO', color: 'text-oro/40', bg: 'bg-black/40 border-oro/10', desc: 'Requiere despertar el Sharingan (Rango D, 100 EXP, 10 PA).' };
  }, [currentRankVal, totalExp, totalPa]);

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
    const tecObj = (glosarioFiltrado || []).find((t: any) => t.id === Number(tecnicaId));
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

    addToast(`Técnica "${tecObj.nombre_jp || tecObj.nombre_es}" asignada a ${slotKey}.`, 'success');
  };

  // 5. Eliminar/Liberar técnica de un slot
  const handleRemoveTechnique = (slotKey: string) => {
    const currentCopias = { ...(uchihaData.copias || {}) };
    const removedSlot = currentCopias[slotKey];
    if (!removedSlot) return;

    delete currentCopias[slotKey];
    updateUchiha({ copias: currentCopias });

    // Quitar de personajes_tecnicas si fue agregada por esta copia
    const currentTecs = character.personajes_tecnicas || [];
    const remainingCopiedIds = Object.values(currentCopias).map(c => c.tecnica_id);
    
    // Solo se remueve si ninguna otra ranura la está copiando
    if (!remainingCopiedIds.includes(removedSlot.tecnica_id)) {
      const filteredTecs = currentTecs.filter((t: any) => Number(t.tecnica_id) !== Number(removedSlot.tecnica_id));
      onUpdateField('personajes_tecnicas', filteredTecs);
    }

    addToast(`Técnica retirada del hueco ${slotKey}.`, 'info');
  };

  // 6. Actualizar evidencia o fecha del slot
  const handleUpdateSlotMeta = (slotKey: string, field: 'fecha_copia' | 'evidencia_url', value: string) => {
    const currentCopias = { ...(uchihaData.copias || {}) };
    if (!currentCopias[slotKey]) return;

    currentCopias[slotKey] = {
      ...currentCopias[slotKey],
      [field]: value
    };
    updateUchiha({ copias: currentCopias });
  };

  // 7. Filtrar catálogo de técnicas válidas por cada rango de slot
  // Ramas válidas: Ninjutsu (4), Taijutsu (8), Genjutsu (10), Bukijutsu/Bujutsu (12) o rama general (null)
  const getOptionsForSlot = (slotRank: string) => {
    return (glosarioFiltrado || [])
      .filter((t: any) => {
        // Categoría 1 = Técnicas
        if (t.categoria_id !== 1) return false;
        // Rango igual al slot
        if (t.rango !== slotRank) return false;
        // Pertenecer a ramas básicas o generales
        const validBranchIds = [4, 8, 10, 12, null];
        const isBasic = validBranchIds.includes(t.rama_clan_id);
        return isBasic;
      })
      .map((t: any) => ({
        label: `${t.nombre_jp ? `${t.nombre_jp} - ` : ''}${t.nombre_es} (Rango ${t.rango || 'D'})`,
        value: String(t.id)
      }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SECCIÓN 1: CABECERA Y DŌJUTSU */}
      <SectionCard title="CLAN UCHIHA — KEKKEI GENKAI: SHARINGAN" icon={Eye} color="naranja-naruto">
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
              onChange={(val) => updateUchiha({ rama_combate: val as any })}
            />
            <p className="text-[11px] text-oro/40 italic ml-1">
              Define los efectos adicionales en las técnicas clan (ej. Shishi Rendan, Ryūka, Gōkakyū).
            </p>
          </div>

          {/* Indicador Visual de Nivel de Tomoes */}
          <div className={`p-6 border ninja-clip-sm flex items-center justify-between gap-6 ${tomoesInfo.bg}`}>
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-black tracking-widest text-oro/50">
                Estado del Dōjutsu
              </div>
              <div className={`text-lg font-black tracking-widest ${tomoesInfo.color} flex items-center gap-2`}>
                <Eye className="w-5 h-5 inline-block animate-pulse" />
                {tomoesInfo.label}
              </div>
              <div className="text-xs text-oro/60">
                {tomoesInfo.desc}
              </div>
            </div>

            {/* Aspas / Tomoes visuales */}
            <div className="flex items-center gap-2 bg-black/50 px-4 py-3 rounded-full border border-red-500/20">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className={`w-4 h-4 rounded-full border transition-all duration-500 ${
                    tomoesInfo.level >= num
                      ? 'bg-red-600 border-red-400 shadow-[0_0_10px_#ef4444]'
                      : 'bg-zinc-900 border-zinc-700 opacity-40'
                  }`}
                  title={`Tomoe ${num}`}
                />
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* SECCIÓN 2: RAMA SECUNDARIA: COPIA (HASEI: KOPĪ) */}
      <SectionCard title="RAMA SECUNDARIA: COPIA (HASEI: KOPĪ)" icon={Swords} color="oro">
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
                    {rangoGroup === 'C' && '(3 bloqueados [30 EXP / 35 PA c/u])'}
                    {rangoGroup === 'B' && '(2 bloqueados [60 EXP / 45 PA c/u])'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {slotsInGroup.map((slot) => {
                    const isUnlocked = slot.desbloqueadoInicial || (uchihaData.slots_desbloqueados || []).includes(slot.key);
                    const copia = uchihaData.copias?.[slot.key];
                    const tecObj = copia?.info_glosario || (glosarioFiltrado || []).find((t: any) => t.id === Number(copia?.tecnica_id));

                    return (
                      <div
                        key={slot.key}
                        className={`p-5 border ninja-clip-sm transition-all flex flex-col justify-between ${
                          isUnlocked
                            ? 'bg-black/50 border-oro/20 hover:border-oro/40'
                            : 'bg-black/30 border-oro/5 opacity-70'
                        }`}
                      >
                        {/* Cabecera del Slot */}
                        <div className="flex items-center justify-between pb-3 border-b border-oro/10">
                          <span className="text-xs font-black tracking-wider text-oro flex items-center gap-2">
                            {isUnlocked ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-oro/40" />}
                            {slot.nombre}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 border border-oro/10 text-oro/60">
                            Rango {slot.rango}
                          </span>
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
                              <div className="p-3 bg-oro/5 border border-oro/20 rounded">
                                <div className="text-xs font-black text-oro">
                                  {tecObj.nombre_jp || tecObj.nombre_es}
                                </div>
                                {tecObj.nombre_jp && (
                                  <div className="text-[11px] text-oro/60">{tecObj.nombre_es}</div>
                                )}
                              </div>

                              {/* Metadatos: Fecha y Enlace Evidencia */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-oro/40 shrink-0" />
                                  <input
                                    type="date"
                                    value={copia?.fecha_copia || ''}
                                    disabled={!isEditing && !isNew}
                                    onChange={(e) => handleUpdateSlotMeta(slot.key, 'fecha_copia', e.target.value)}
                                    className="w-full bg-black/60 border border-oro/10 px-2 py-1 text-xs text-oro outline-none focus:border-oro/40"
                                    title="Fecha de copiado"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <LinkIcon className="w-3.5 h-3.5 text-oro/40 shrink-0" />
                                  <input
                                    type="url"
                                    placeholder="URL Pantallazo combate..."
                                    value={copia?.evidencia_url || ''}
                                    disabled={!isEditing && !isNew}
                                    onChange={(e) => handleUpdateSlotMeta(slot.key, 'evidencia_url', e.target.value)}
                                    className="w-full bg-black/60 border border-oro/10 px-2 py-1 text-xs text-oro outline-none focus:border-oro/40 placeholder:text-oro/20"
                                    title="Enlace a la evidencia del combate"
                                  />
                                </div>
                              </div>
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
                        {isUnlocked && tecObj && (isEditing || isNew) && (
                          <div className="pt-2 border-t border-oro/10">
                            <button
                              type="button"
                              onClick={() => handleRemoveTechnique(slot.key)}
                              className="w-full flex items-center justify-center gap-2 py-1.5 text-[11px] font-black uppercase text-red-400/80 hover:text-red-400 hover:bg-red-950/20 border border-red-500/20 transition-all rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Quitar Técnica
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
