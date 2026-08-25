'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Trash2, ExternalLink, Calendar, Save, AlertCircle, ShieldAlert, Check } from 'lucide-react';
import { PersonajeInventarioRegistro, PersonajeItem } from '@/domain/types';
import { CharacterService } from '@/services/supabase/character.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';

interface ObjetoSlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PersonajeItem;
  canEdit: boolean;
  onRefresh?: () => void;
}

export function ObjetoSlotsModal({ isOpen, onClose, item, canEdit, onRefresh }: ObjetoSlotsModalProps) {
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  const [slots, setSlots] = useState<PersonajeInventarioRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlotForm, setActiveSlotForm] = useState<number | null>(null); // Slot number being created
  const [editingId, setEditingId] = useState<number | null>(null); // ID being edited

  // Form states
  const [formNombre, setFormNombre] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const inventarioId = item.id;
  const nombreEs = item.info_glosario?.nombre_es || 'Objeto Especial';
  const nombreJp = item.info_glosario?.nombre_jp || '';

  const fetchSlots = async () => {
    if (!inventarioId) return;
    setLoading(true);
    try {
      const data = await CharacterService.getItemSlots(inventarioId);
      setSlots(data || []);
    } catch (err: any) {
      console.error('Error al cargar slots:', err);
      addToast(err.message || 'Error al cargar registros', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && inventarioId) {
      fetchSlots();
      resetForm();
    }
  }, [isOpen, inventarioId]);

  const resetForm = () => {
    setActiveSlotForm(null);
    setEditingId(null);
    setFormNombre('');
    setFormUrl('');
  };

  const handleStartAdd = (slotNum: number) => {
    setEditingId(null);
    setActiveSlotForm(slotNum);
    setFormNombre('');
    setFormUrl('');
  };

  const handleStartEdit = (registro: PersonajeInventarioRegistro) => {
    setActiveSlotForm(null);
    setEditingId(registro.id);
    setFormNombre(registro.nombre);
    setFormUrl(registro.pantallazo_url);
  };

  const handleSaveAdd = async (slotNum: number) => {
    if (!inventarioId) return;
    if (!formNombre.trim()) {
      addToast('El nombre es obligatorio', 'error');
      return;
    }
    if (!formUrl.trim()) {
      addToast('La URL del pantallazo es obligatoria', 'error');
      return;
    }

    setSaving(true);
    try {
      const newSlot = await CharacterService.createItemSlot(inventarioId, {
        nombre: formNombre.trim(),
        pantallazo_url: formUrl.trim(),
        slot_num: slotNum
      });
      addToast('Registro añadido correctamente', 'success');
      resetForm();
      await fetchSlots();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error al guardar registro:', err);
      addToast(err.message || 'Error al guardar el registro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!formNombre.trim()) {
      addToast('El nombre es obligatorio', 'error');
      return;
    }
    if (!formUrl.trim()) {
      addToast('La URL del pantallazo es obligatoria', 'error');
      return;
    }

    setSaving(true);
    try {
      await CharacterService.updateItemSlot(id, {
        nombre: formNombre.trim(),
        pantallazo_url: formUrl.trim()
      });
      addToast('Registro actualizado correctamente', 'success');
      resetForm();
      await fetchSlots();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error al actualizar registro:', err);
      addToast(err.message || 'Error al actualizar el registro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (registro: PersonajeInventarioRegistro) => {
    const ok = await confirmAction({
      title: 'Eliminar Registro',
      message: `¿Estás seguro de que deseas eliminar el registro "${registro.nombre}" (Slot ${registro.slot_num})?`,
      variant: 'danger',
      confirmLabel: 'Eliminar Registro'
    });

    if (!ok) return;

    try {
      await CharacterService.deleteItemSlot(registro.id);
      addToast('Registro eliminado', 'success');
      await fetchSlots();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error al eliminar registro:', err);
      addToast(err.message || 'Error al eliminar el registro', 'error');
    }
  };

  if (!isOpen) return null;

  const slotsMap = new Map<number, PersonajeInventarioRegistro>();
  slots.forEach(s => slotsMap.set(s.slot_num, s));
  const countFilled = slots.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-800/80 border-b border-zinc-700/80">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-amber-400">{nombreEs}</h2>
              {nombreJp && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20">{nombreJp}</span>}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Almacenamiento interno de objeto especial: <span className="font-semibold text-zinc-200">{countFilled}/10 Ranuras ocupadas</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-zinc-400">
              <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm">Cargando registros...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(slotNum => {
                const registro = slotsMap.get(slotNum);
                const isAdding = activeSlotForm === slotNum;
                const isEditingThis = registro && editingId === registro.id;

                return (
                  <div
                    key={slotNum}
                    className={`p-4 rounded-lg border transition-all ${
                      registro
                        ? 'bg-zinc-800/60 border-zinc-700/80 hover:border-amber-500/40'
                        : isAdding
                        ? 'bg-amber-950/20 border-amber-500/50'
                        : 'bg-zinc-900/40 border-zinc-800 border-dashed hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded border ${
                          registro 
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                        }`}>
                          #{slotNum}
                        </span>
                      </div>

                      {/* Content column */}
                      <div className="flex-1 min-w-0">
                        {isEditingThis || isAdding ? (
                          /* Edit / Add Form */
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-zinc-300 mb-1">
                                Nombre del {item.item_id === 82 ? 'Antídoto' : 'Veneno'} / Registro
                              </label>
                              <input
                                type="text"
                                value={formNombre}
                                onChange={e => setFormNombre(e.target.value)}
                                placeholder="Ej: Veneno de Escorpión Rojo"
                                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-zinc-300 mb-1">
                                URL del Pantallazo / Captura
                              </label>
                              <input
                                type="url"
                                value={formUrl}
                                onChange={e => setFormUrl(e.target.value)}
                                placeholder="https://imgur.com/..."
                                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                              />
                            </div>
                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                disabled={saving}
                                onClick={() => isEditingThis ? handleSaveEdit(registro.id) : handleSaveAdd(slotNum)}
                                className="flex items-center space-x-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded transition-colors disabled:opacity-50"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                              </button>
                              <button
                                disabled={saving}
                                onClick={resetForm}
                                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : registro ? (
                          /* View existing slot */
                          <div>
                            <h4 className="text-sm font-semibold text-zinc-100 truncate">{registro.nombre}</h4>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-zinc-400">
                              <a
                                href={registro.pantallazo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 text-amber-400 hover:text-amber-300 hover:underline"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Ver Pantallazo</span>
                              </a>
                              <span className="flex items-center space-x-1 text-zinc-500">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{new Date(registro.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Empty slot */
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs text-zinc-500 italic">Ranura Vacía</span>
                            {canEdit && (
                              <button
                                onClick={() => handleStartAdd(slotNum)}
                                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Añadir Registro</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions column for existing non-editing slot */}
                      {registro && !isEditingThis && canEdit && (
                        <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                          <button
                            onClick={() => handleStartEdit(registro)}
                            title="Editar registro (PATCH)"
                            className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-700/40 rounded transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(registro)}
                            title="Eliminar registro"
                            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700/40 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-800/60 border-t border-zinc-700/60 flex items-center justify-between text-xs text-zinc-400">
          <span>Los registros son privados y administrados por el dueño del personaje.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-md font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
