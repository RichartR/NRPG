'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Edit3, Trash2, ExternalLink, Calendar, Save, ScrollText, Loader2 } from 'lucide-react';
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
      await CharacterService.createItemSlot(inventarioId, {
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

  if (!isOpen || typeof document === 'undefined') return null;

  const slotsMap = new Map<number, PersonajeInventarioRegistro>();
  slots.forEach(s => slotsMap.set(s.slot_num, s));
  const countFilled = slots.length;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-all duration-500 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-neutral-700 border border-oro/20 shadow-[0_0_80px_rgba(0,0,0,0.9)] animate-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden ninja-clip-md">
        {/* Header */}
        <div className="flex-none p-6 border-b border-oro/15 flex justify-between items-center bg-neutral-700">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-oro/10 border border-oro/20 ninja-clip-xs flex items-center justify-center shrink-0">
              <img
                src={item.item_id === 393 ? "/assets/images/veneno.png" : "/assets/images/antidoto.png"}
                alt={nombreEs}
                className="w-10 h-10 object-contain drop-shadow-md"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="ninja-title text-lg sm:text-xl tracking-[0.1em] sm:tracking-[0.2em] text-oro">{nombreEs}</h3>
                {nombreJp && (
                  <span className="text-caption font-black text-oro/40 uppercase tracking-tighter mt-0.5">
                    {nombreJp}
                  </span>
                )}
              </div>
              <p className="text-caption text-oro/50 uppercase tracking-widest font-black mt-0.5">
                Almacenamiento de {nombreJp}: <span className="text-oro font-black">{countFilled}/10 Ranuras ocupadas</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-oro/10 hover:bg-oro/20 border border-oro/20 text-oro/60 hover:text-oro transition-all ninja-clip-xs shadow-md shadow-black/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-4 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-oro/60 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-oro" />
              <p className="text-xs font-black uppercase tracking-widest">Cargando registros...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(slotNum => {
                const registro = slotsMap.get(slotNum);
                const isAdding = activeSlotForm === slotNum;
                const isEditingThis = registro && editingId === registro.id;

                return (
                  <div
                    key={slotNum}
                    className={`p-4 border transition-all ninja-clip-xs ${registro
                      ? 'bg-black/40 border-oro/20 hover:border-oro/40'
                      : isAdding
                        ? 'bg-oro/10 border-oro/50'
                        : 'bg-black/20 border-oro/10 hover:border-oro/25 border-dashed'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`w-8 h-8 flex items-center justify-center text-caption font-black border ninja-clip-xs ${registro
                          ? 'bg-oro/20 text-oro border-oro/40'
                          : 'bg-black/40 text-oro/30 border-oro/10'
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
                              <label className="block text-caption font-black text-oro/70 uppercase tracking-wider mb-1">
                                Nombre del {item.item_id === 82 ? 'Antídoto' : 'Veneno'} / Registro
                              </label>
                              <input
                                type="text"
                                value={formNombre}
                                onChange={e => setFormNombre(e.target.value)}
                                placeholder="Ej: Veneno de Escorpión Rojo"
                                className="w-full ninja-input px-3 py-2 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-caption font-black text-oro/70 uppercase tracking-wider mb-1">
                                URL del Pantallazo / Captura
                              </label>
                              <input
                                type="url"
                                value={formUrl}
                                onChange={e => setFormUrl(e.target.value)}
                                placeholder="HTTPS://..."
                                className="w-full ninja-input px-3 py-2 text-xs font-bold"
                              />
                            </div>
                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                disabled={saving}
                                onClick={() => isEditingThis ? handleSaveEdit(registro.id) : handleSaveAdd(slotNum)}
                                className="px-4 py-2 ninja-btn-oro text-caption font-black uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>{saving ? 'GUARDANDO...' : 'GUARDAR'}</span>
                              </button>
                              <button
                                disabled={saving}
                                onClick={resetForm}
                                className="px-4 py-2 bg-black/40 hover:bg-black/60 border border-oro/20 text-oro/70 hover:text-oro text-caption font-black uppercase tracking-widest ninja-clip-xs transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : registro ? (
                          /* View existing slot */
                          <div className="flex flex-wrap items-center justify-between gap-3 py-0.5">
                            <h4 className="text-sm sm:text-base font-black text-oro uppercase tracking-wider truncate">{registro.nombre}</h4>
                            <div className="flex items-center space-x-3 text-caption font-bold uppercase tracking-wider shrink-0">
                              <a
                                href={registro.pantallazo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-oro/10 border border-oro/30 hover:bg-oro/20 hover:border-oro/50 text-oro text-caption font-black uppercase tracking-wider ninja-clip-xs transition-all no-underline shadow-sm"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Ver Pantallazo</span>
                              </a>
                              <span className="flex items-center space-x-1 text-oro/40">
                                <span>{new Date(registro.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Empty slot */
                          <div className="flex items-center justify-between py-1">
                            <span className="text-caption font-bold text-oro/30 italic uppercase tracking-wider">Ranura Vacía</span>
                            {canEdit && (
                              <button
                                onClick={() => handleStartAdd(slotNum)}
                                className="flex items-center space-x-1.5 px-3 py-1 text-caption font-black text-oro bg-oro/10 border border-oro/30 hover:bg-oro/20 hover:border-oro/50 ninja-clip-xs transition-all tracking-wider uppercase"
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
                        <div className="flex items-center space-x-1.5 shrink-0 pt-0.5">
                          <button
                            onClick={() => handleStartEdit(registro)}
                            title="Editar registro"
                            className="p-2 bg-oro/10 border border-oro/20 hover:border-oro hover:bg-oro/20 text-oro/70 hover:text-oro transition-all ninja-clip-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(registro)}
                            title="Eliminar registro"
                            className="p-2 bg-red-600/10 border border-red-600/30 hover:border-red-500 hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-all ninja-clip-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        <div className="flex-none p-4 sm:px-6 bg-neutral-700 border-t border-oro/15 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 ninja-btn-oro text-caption font-black tracking-widest uppercase ml-auto"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
