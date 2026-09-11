'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Copy,
  Check,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Sliders,
  Shield,
  Zap,
  Package
} from 'lucide-react';
import { Character, CombatPresetItem, CombatPresetOption } from '@/domain/types';
import { syncCombatPresets, generatePresetCopyText } from '@/utils/combatPresets';
import { useToastStore } from '@/components/ui/Toast';
import { CharacterService } from '@/services/supabase/character.service';

interface CombatPresetsManagerProps {
  character: Character;
  canEdit: boolean;
  isAdmin: boolean;
  isEditing?: boolean;
  onUpdatePresets?: (presets: CombatPresetItem[]) => void;
}

export function CombatPresetsManager({
  character,
  canEdit,
  isAdmin,
  isEditing = false,
  onUpdatePresets
}: CombatPresetsManagerProps) {
  const addToast = useToastStore(state => state.addToast);
  const [items, setItems] = useState<CombatPresetItem[]>(() => syncCombatPresets(character));
  const [activeCategory, setActiveCategory] = useState<'all' | 'tecnica' | 'objeto' | 'pasiva'>('all');
  const [search, setSearch] = useState('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<Record<string, number>>({});
  const [copiedPresetId, setCopiedPresetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isLocalUpdateRef = useRef(false);

  // Firma única de técnicas, inventario, rasgos y sentidos para detectar cambios externos
  const tecsSignature = useMemo(() => {
    const tecIds = (character.personajes_tecnicas || []).map(t => t.tecnica_id).join(',');
    const invIds = (character.personajes_inventario || []).map(i => i.item_id).join(',');
    const rasgoIds = (character.personajes_rasgos || []).map(r => r.rasgo_id).join(',');
    const sentidoIds = (character.personajes_sentidos || []).map(s => s.sentido_id).join(',');
    return `${character.id}:${tecIds}:${invIds}:${rasgoIds}:${sentidoIds}`;
  }, [
    character.id,
    character.personajes_tecnicas,
    character.personajes_inventario,
    character.personajes_rasgos,
    character.personajes_sentidos
  ]);

  // Sincronizar SOLO cuando cambia la lista de técnicas/objetos externos o el personaje
  useEffect(() => {
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      return;
    }
    const synced = syncCombatPresets(character);
    setItems(synced);
  }, [tecsSignature]);

  // Filtrar elementos
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCategory = activeCategory === 'all' || item.tipo === activeCategory;
      const matchSearch =
        search.trim() === '' ||
        item.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (item.subtipo && item.subtipo.toLowerCase().includes(search.toLowerCase())) ||
        item.presets.some(
          p =>
            p.nombre_preset.toLowerCase().includes(search.toLowerCase()) ||
            (p.roleo && p.roleo.toLowerCase().includes(search.toLowerCase())) ||
            (p.efectos && p.efectos.toLowerCase().includes(search.toLowerCase()))
        );
      return matchCategory && matchSearch;
    });
  }, [items, activeCategory, search]);

  const getItemKey = (item: CombatPresetItem) => `${item.tipo}-${item.id}`;

  const toggleExpand = (itemKey: string) => {
    setExpandedItemId(prev => (prev === itemKey ? null : itemKey));
  };

  // Manejar cambios en un preset de manera síncrona
  const handleUpdatePreset = (
    itemKey: string,
    presetIdx: number,
    field: keyof CombatPresetOption,
    value: any
  ) => {
    if (!isEditing) return;
    isLocalUpdateRef.current = true;
    setItems(prev => {
      const updated = prev.map(item => {
        if (getItemKey(item) !== itemKey) return item;
        const newPresets = [...item.presets];
        const currentP = { ...newPresets[presetIdx], [field]: value };
        newPresets[presetIdx] = currentP;
        return { ...item, presets: newPresets };
      });
      if (onUpdatePresets) {
        onUpdatePresets(updated);
      }
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Regenerar texto automático
  const handleRegenerateText = (itemKey: string, presetIdx: number, itemNombre: string) => {
    if (!isEditing) return;
    isLocalUpdateRef.current = true;
    setItems(prev => {
      const updated = prev.map(item => {
        if (getItemKey(item) !== itemKey) return item;
        const newPresets = [...item.presets];
        const p = newPresets[presetIdx];
        const generated = generatePresetCopyText(p, itemNombre);
        newPresets[presetIdx] = { ...p, texto_copiar: generated };
        return { ...item, presets: newPresets };
      });
      if (onUpdatePresets) {
        onUpdatePresets(updated);
      }
      return updated;
    });
    setHasUnsavedChanges(true);
    addToast('Texto para copiar regenerado desde los campos.', 'info');
  };

  // Añadir una nueva variante de preset
  const handleAddPresetVariant = (itemKey: string, itemNombre: string) => {
    if (!isEditing) return;
    isLocalUpdateRef.current = true;
    setItems(prev => {
      const updated = prev.map(item => {
        if (getItemKey(item) !== itemKey) return item;
        const count = item.presets.length + 1;
        const basePreset = item.presets[0] || {};
        const newPreset: CombatPresetOption = {
          id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          nombre_preset: `Preset ${count}`,
          roleo: basePreset.roleo || '',
          dano: basePreset.dano || '',
          dano_xa: basePreset.dano_xa || '',
          coste_ch: basePreset.coste_ch ?? 0,
          cd_rondas: basePreset.cd_rondas ?? 1,
          alcance: basePreset.alcance || '',
          tipo_accion: basePreset.tipo_accion || '',
          sellos: basePreset.sellos || 'No',
          efectos: basePreset.efectos || '',
          texto_copiar: generatePresetCopyText(
            {
              ...basePreset,
              nombre_preset: `Preset ${count}`
            },
            itemNombre
          )
        };
        return {
          ...item,
          presets: [...item.presets, newPreset]
        };
      });
      if (onUpdatePresets) {
        onUpdatePresets(updated);
      }
      return updated;
    });
    setSelectedPresetIndex(prev => ({
      ...prev,
      [itemKey]: (items.find(i => getItemKey(i) === itemKey)?.presets.length || 1)
    }));
    setHasUnsavedChanges(true);
    addToast('Nueva variante añadida.', 'success');
  };

  // Eliminar una variante de preset
  const handleDeletePresetVariant = (itemKey: string, presetIdx: number) => {
    if (!isEditing) return;
    const item = items.find(i => getItemKey(i) === itemKey);
    if (!item || item.presets.length <= 1) {
      addToast('Cada técnica debe mantener al menos un preset.', 'info');
      return;
    }
    isLocalUpdateRef.current = true;
    setItems(prev => {
      const updated = prev.map(it => {
        if (getItemKey(it) !== itemKey) return it;
        return {
          ...it,
          presets: it.presets.filter((_, idx) => idx !== presetIdx)
        };
      });
      if (onUpdatePresets) {
        onUpdatePresets(updated);
      }
      return updated;
    });
    setSelectedPresetIndex(prev => ({
      ...prev,
      [itemKey]: Math.max(0, presetIdx - 1)
    }));
    setHasUnsavedChanges(true);
    addToast('Preset eliminado.', 'info');
  };

  // Copiar al portapapeles
  const handleCopyText = (presetId: string, text: string) => {
    if (!text) {
      addToast('No hay texto configurado para copiar.', 'info');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedPresetId(presetId);
    setTimeout(() => {
      setCopiedPresetId(null);
    }, 2000);
    addToast('¡Copiado al portapapeles!', 'success');
  };

  // Guardar en Supabase
  const handleSave = async () => {
    if (!isEditing || (!canEdit && !isAdmin)) {
      addToast('No tienes permisos o no estás en modo edición para guardar presets.', 'error');
      return;
    }
    setSaving(true);
    try {
      await CharacterService.saveCombatPresets(character.id, items);
      if (onUpdatePresets) {
        onUpdatePresets(items);
      }
      setHasUnsavedChanges(false);
      addToast('Presets de combate guardados correctamente.', 'success');
    } catch (err: any) {
      console.error('Error guardando presets:', err);
      addToast(err?.message || 'Error al guardar presets de combate.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Barra de cabecera con acciones y estadísticas */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-black/60 border border-oro/20 p-5 backdrop-blur-md ninja-clip-sm shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-oro" />
            <h3 className="text-lg xl:text-xl font-black text-oro uppercase tracking-[0.2em]">
              PRESETS Y MACROS DE COMBATE
            </h3>
          </div>
          <p className="text-xs text-oro/60 mt-1">
            Personaliza el roleo, costes, daño y efectos de tus jutsus, armas y pasivas. Estos presets aparecerán listos para copiar en la Combat Room de PvP.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isEditing ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!canEdit && !isAdmin)}
              className="ninja-btn-oro py-3 px-6 text-xs flex items-center justify-center gap-2 font-black uppercase tracking-wider w-full md:w-auto shadow-[0_0_20px_rgba(255,230,159,0.3)] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>GUARDANDO...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>GUARDAR PRESETS</span>
                </>
              )}
            </button>
          ) : (
            <span className="px-4 py-2 bg-black/80 border border-oro/20 text-oro/50 text-xs font-black uppercase tracking-widest rounded-sm">
              MODO LECTURA
            </span>
          )}
        </div>
      </div>

      {/* Filtros por Categoría y Buscador */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Filtros de pestaña */}
        <div className="md:col-span-7 flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'TODAS', count: items.length, icon: Sparkles },
            {
              key: 'tecnica',
              label: 'TÉCNICAS',
              count: items.filter(i => i.tipo === 'tecnica').length,
              icon: Zap
            },
            {
              key: 'objeto',
              label: 'OBJETOS',
              count: items.filter(i => i.tipo === 'objeto').length,
              icon: Package
            },
            {
              key: 'pasiva',
              label: 'PASIVAS',
              count: items.filter(i => i.tipo === 'pasiva').length,
              icon: Shield
            }
          ].map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key as any)}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-200 border flex items-center gap-2 ninja-clip-xs ${
                  isActive
                    ? 'bg-oro text-black border-oro shadow-[0_0_15px_rgba(255,230,159,0.4)]'
                    : 'bg-black/60 text-oro/60 border-oro/15 hover:border-oro/50 hover:text-oro'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-black/20 text-black' : 'bg-oro/10 text-oro/70'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Buscador */}
        <div className="md:col-span-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por jutsu, objeto, efecto o macro..."
            className="w-full bg-black/50 border border-oro/20 py-2.5 pl-11 pr-4 text-oro font-black uppercase tracking-wider text-xs outline-none focus:border-oro transition-all placeholder:text-oro/30 ninja-clip-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-oro/40 hover:text-oro text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Lista de Técnicas / Objetos con Presets */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-black/40 border border-oro/10 rounded p-8">
            <Sliders className="w-12 h-12 text-oro/20 mx-auto mb-3" />
            <p className="text-sm font-black text-oro/50 uppercase tracking-widest">
              No se encontraron elementos en esta categoría
            </p>
            <p className="text-xs text-oro/30 mt-1">
              Prueba con otro término de búsqueda o asegúrate de tener técnicas aprendidas o equipamiento.
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const itemKey = getItemKey(item);
            const isExpanded = expandedItemId === itemKey;
            const currentPresetIdx = selectedPresetIndex[itemKey] || 0;
            const safePresetIdx = Math.min(currentPresetIdx, item.presets.length - 1);
            const activePreset = item.presets[safePresetIdx] || item.presets[0];

            return (
              <div
                key={itemKey}
                className={`border transition-all duration-300 bg-black/60 backdrop-blur-sm ninja-clip-sm overflow-hidden ${
                  isExpanded ? 'border-oro/60 shadow-[0_0_20px_rgba(255,230,159,0.15)]' : 'border-oro/15 hover:border-oro/40'
                }`}
              >
                {/* Cabecera del Item */}
                <div
                  onClick={() => toggleExpand(itemKey)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none bg-gradient-to-r from-black/80 via-black/40 to-transparent hover:bg-oro/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border ${
                        item.tipo === 'tecnica'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : item.tipo === 'objeto'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {item.tipo === 'tecnica' ? (
                        <Zap className="w-4 h-4" />
                      ) : item.tipo === 'objeto' ? (
                        <Package className="w-4 h-4" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-oro uppercase tracking-wider text-sm truncate">
                          {item.nombre}
                        </span>
                        {item.subtipo && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-oro/10 border border-oro/20 text-oro/70 rounded">
                            {item.subtipo}
                          </span>
                        )}
                        <span className="text-[10px] text-oro/40 font-mono">
                          ({item.presets.length} {item.presets.length === 1 ? 'preset' : 'presets'})
                        </span>
                      </div>
                      {/* Vista previa de roleo o efectos */}
                      {!isExpanded && activePreset && (
                        <span className="text-xs text-oro/40 truncate max-w-xl italic mt-0.5">
                          {activePreset.roleo || activePreset.efectos || activePreset.texto_copiar}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-oro/50 font-black uppercase hidden sm:inline-block">
                      {isExpanded ? 'CERRAR' : isEditing ? 'EDITAR PRESETS' : 'VER PRESETS'}
                    </span>
                    <div className="w-6 h-6 flex items-center justify-center text-oro/60">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Contenido Expandible del Editor de Presets */}
                {isExpanded && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="p-5 border-t border-oro/15 bg-black/40 space-y-6"
                  >
                    {/* Selector de pestañas de variantes */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-oro/10 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.presets.map((preset, pIdx) => {
                          const isCurrent = safePresetIdx === pIdx;
                          return (
                            <button
                              key={preset.id || pIdx}
                              type="button"
                              onClick={() =>
                                setSelectedPresetIndex(prev => ({
                                  ...prev,
                                  [itemKey]: pIdx
                                }))
                              }
                              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border transition-all ${
                                isCurrent
                                  ? 'bg-oro text-black border-oro font-black shadow-[0_0_10px_rgba(255,230,159,0.3)]'
                                  : 'bg-black/60 text-oro/60 border-oro/15 hover:text-oro hover:border-oro/40'
                              }`}
                            >
                              {preset.nombre_preset || `Preset ${pIdx + 1}`}
                            </button>
                          );
                        })}

                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleAddPresetVariant(itemKey, item.nombre)}
                            className="px-3 py-1.5 text-xs font-black uppercase text-oro bg-oro/10 border border-oro/30 hover:bg-oro/20 transition-all flex items-center gap-1.5"
                            title="Añadir una variante (ej: Anticipación, Terreno Húmedo, Potenciada)"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>NUEVA VARIANTE</span>
                          </button>
                        )}
                      </div>

                      {isEditing && item.presets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePresetVariant(itemKey, safePresetIdx)}
                          className="px-2.5 py-1 text-[11px] font-black uppercase text-red-400 bg-red-950/40 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                          title="Eliminar esta variante"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>ELIMINAR PRESET</span>
                        </button>
                      )}
                    </div>

                    {/* Formulario de Campos del Preset Activo */}
                    <div className="space-y-4">
                      {/* Fila 1: Nombre de Preset y Roleo */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            NOMBRE DEL PRESET (ETIQUETA)
                          </label>
                          <input
                            type="text"
                            disabled={!isEditing}
                            value={activePreset.nombre_preset || ''}
                            onChange={e =>
                              handleUpdatePreset(itemKey, safePresetIdx, 'nombre_preset', e.target.value)
                            }
                            placeholder="Ej. Normal, Anticipación, Potenciada..."
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            ROLEO / NARRACIÓN DE LA ACCIÓN
                          </label>
                          <input
                            type="text"
                            disabled={!isEditing}
                            value={activePreset.roleo || ''}
                            onChange={e =>
                              handleUpdatePreset(itemKey, safePresetIdx, 'roleo', e.target.value)
                            }
                            placeholder="Ej. *Formo afiladas agujas de cristal morado y las disparo hacia...*"
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs outline-none focus:border-oro transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          />
                        </div>
                      </div>

                      {/* Fila 2: Parámetros numéricos y combate */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            DAÑO BASE
                          </label>
                          <input
                            type="text"
                            disabled={!isEditing}
                            value={activePreset.dano || ''}
                            onChange={e =>
                              handleUpdatePreset(itemKey, safePresetIdx, 'dano', e.target.value)
                            }
                            placeholder="Ej. 787"
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            DAÑO X ACCIÓN
                          </label>
                          <input
                            type="text"
                            disabled={!isEditing}
                            value={activePreset.dano_xa || ''}
                            onChange={e =>
                              handleUpdatePreset(itemKey, safePresetIdx, 'dano_xa', e.target.value)
                            }
                            placeholder="Ej. 69 / acc"
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            COSTE CH
                          </label>
                          <input
                            type="number"
                            min="0"
                            disabled={!isEditing}
                            value={activePreset.coste_ch ?? 0}
                            onChange={e =>
                              handleUpdatePreset(
                                itemKey,
                                safePresetIdx,
                                'coste_ch',
                                Number(e.target.value)
                              )
                            }
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            COOLDOWN (CD)
                          </label>
                          <input
                            type="number"
                            min="0"
                            disabled={!isEditing}
                            value={activePreset.cd_rondas ?? 1}
                            onChange={e =>
                              handleUpdatePreset(
                                itemKey,
                                safePresetIdx,
                                'cd_rondas',
                                Number(e.target.value)
                              )
                            }
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            ALCANCE / ÁREA
                          </label>
                          <input
                            type="text"
                            disabled={!isEditing}
                            value={activePreset.alcance || ''}
                            onChange={e =>
                              handleUpdatePreset(itemKey, safePresetIdx, 'alcance', e.target.value)
                            }
                            placeholder="Ej. Frontal 3x5"
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            REQUIERE SELLOS
                          </label>
                          <select
                            disabled={!isEditing}
                            value={activePreset.sellos || 'No'}
                            onChange={e =>
                              handleUpdatePreset(itemKey, safePresetIdx, 'sellos', e.target.value)
                            }
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          >
                            <option value="No">No</option>
                            <option value="Sí">Sí</option>
                          </select>
                        </div>
                      </div>

                      {/* Fila 3: Tipo y Efectos Adicionales */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            TIPO DE ACCIÓN
                          </label>
                          <input
                            type="text"
                            disabled={!isEditing}
                            value={activePreset.tipo_accion || ''}
                            onChange={e =>
                              handleUpdatePreset(itemKey, safePresetIdx, 'tipo_accion', e.target.value)
                            }
                            placeholder="Ej. Ofensivo, Defensivo, Anticipación, Combo..."
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs font-black outline-none focus:border-oro transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-oro/60 block mb-1 uppercase tracking-wider">
                            EFECTOS ADICIONALES / MODIFICADORES
                          </label>
                          <input
                            type="text"
                            disabled={!isEditing}
                            value={activePreset.efectos || ''}
                            onChange={e =>
                              handleUpdatePreset(itemKey, safePresetIdx, 'efectos', e.target.value)
                            }
                            placeholder="Ej. Paraliza 1 acc e inmoviliza 2 acc / -15% a defensas internas"
                            className="w-full bg-black/60 border border-oro/20 text-oro px-3 py-2 text-xs outline-none focus:border-oro transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-black/30 disabled:border-oro/10"
                          />
                        </div>
                      </div>

                      {/* Fila 4: Caja de Texto Formateado para Copiar */}
                      <div className="pt-2 border-t border-oro/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-oro block uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-oro" />
                            <span>TEXTO FORMATEADO PARA COPIAR (DISCORD / CHAT)</span>
                          </label>

                          {isEditing && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRegenerateText(itemKey, safePresetIdx, item.nombre)
                              }
                              className="text-[10px] font-black uppercase text-oro/70 hover:text-oro flex items-center gap-1 underline"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Regenerar desde los campos</span>
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <textarea
                            rows={3}
                            readOnly={!isEditing}
                            value={activePreset.texto_copiar || ''}
                            onChange={e =>
                              handleUpdatePreset(itemKey, safePresetIdx, 'texto_copiar', e.target.value)
                            }
                            placeholder="Texto que copiarás con un clic durante el combate..."
                            className="w-full bg-black/80 border border-oro/30 text-oro/90 p-3 text-xs font-mono outline-none focus:border-oro transition-all rounded-sm resize-y read-only:opacity-80 read-only:cursor-default read-only:bg-black/40 read-only:border-oro/15"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(activePreset.id, activePreset.texto_copiar)
                            }
                            className={`absolute right-3 bottom-4 px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-lg ${
                              copiedPresetId === activePreset.id
                                ? 'bg-emerald-500 text-black border border-emerald-400'
                                : 'bg-oro text-black border border-oro hover:brightness-110'
                            }`}
                          >
                            {copiedPresetId === activePreset.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>¡COPIADO!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>PROBAR COPIAR</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Botón flotante o inferior para guardar si hay cambios */}
      {isEditing && hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="ninja-btn-oro py-3 px-8 text-xs flex items-center gap-2 font-black uppercase tracking-wider shadow-[0_0_25px_rgba(255,230,159,0.6)]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS PENDIENTES'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
