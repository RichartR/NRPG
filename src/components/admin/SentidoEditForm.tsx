'use client';

import { useState } from 'react';
import { Plus, X, Save, RefreshCw, Eye, Link as LinkIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { DataField, SearchableSelect } from '@/components/ui/Fields';
import { Sentido, RamaClan, SubEspecialidad, RamaSentido } from '@/domain/types';
import { useMasterStore } from '@/store/useMasterStore';

interface SentidoEditFormProps {
  sentido?: Sentido;
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
  vinculaciones: RamaSentido[];
  onCancel: () => void;
}

export default function SentidoEditForm({
  sentido,
  ramas,
  subEspecialidades,
  vinculaciones,
  onCancel,
}: SentidoEditFormProps) {
  const isCreate = !sentido;
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  const [formData, setFormData] = useState<Partial<Sentido>>(() =>
    sentido
      ? { ...sentido }
      : { nombre: '', activo: true }
  );
  const [loading, setLoading] = useState(false);

  // Estado para vinculaciones locales en caso de creación
  const [localVinculaciones, setLocalVinculaciones] = useState<any[]>([]);

  // Estado para nueva vinculación
  const [newVinc, setNewVinc] = useState<{
    rama_id: number | null;
    sub_especialidad_id: number | null;
    tipo: 'fijo' | 'seleccionable';
  }>({ rama_id: null, sub_especialidad_id: null, tipo: 'fijo' });
  const [vincLoading, setVincLoading] = useState(false);

  const updateField = (field: keyof Sentido, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre?.trim()) {
      addToast('El nombre es obligatorio', 'error');
      return;
    }
    setLoading(true);
    try {
      const saved = await AdminService.saveSentido(formData);
      
      // Si estamos creando y tenemos vinculaciones locales, las guardamos ahora
      if (isCreate && localVinculaciones.length > 0) {
        for (const vinc of localVinculaciones) {
          await AdminService.saveRamaSentido({
            sentido_id: saved.id,
            rama_id: vinc.rama_id,
            sub_especialidad_id: vinc.sub_especialidad_id,
            tipo: vinc.tipo,
            activo: true,
          });
        }
      }

      await useMasterStore.getState().refresh();
      addToast(`Sentido ${isCreate ? 'creado' : 'actualizado'} con éxito`, 'success');
      router.refresh();
      onCancel();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVinculacion = async () => {
    if (!newVinc.rama_id && !newVinc.sub_especialidad_id) {
      addToast('Debes seleccionar una rama o sub-especialidad', 'error');
      return;
    }
    
    if (isCreate) {
      // Agregar localmente
      const tempId = Date.now();
      setLocalVinculaciones((prev) => [
        ...prev,
        {
          id: tempId,
          rama_id: newVinc.rama_id,
          sub_especialidad_id: newVinc.sub_especialidad_id,
          tipo: newVinc.tipo,
        },
      ]);
      setNewVinc({ rama_id: null, sub_especialidad_id: null, tipo: 'fijo' });
      addToast('Vinculación añadida localmente (se guardará al confirmar)', 'success');
      return;
    }

    setVincLoading(true);
    try {
      await AdminService.saveRamaSentido({
        sentido_id: sentido!.id,
        rama_id: newVinc.rama_id,
        sub_especialidad_id: newVinc.sub_especialidad_id,
        tipo: newVinc.tipo,
        activo: true,
      });
      await useMasterStore.getState().refresh();
      addToast('Vinculación añadida', 'success');
      setNewVinc({ rama_id: null, sub_especialidad_id: null, tipo: 'fijo' });
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setVincLoading(false);
    }
  };

  const handleDeleteVinculacion = async (id: number) => {
    if (isCreate) {
      setLocalVinculaciones((prev) => prev.filter((v) => v.id !== id));
      addToast('Vinculación eliminada localmente', 'success');
      return;
    }

    const ok = await confirmAction({
      title: '¿Eliminar vinculación?',
      message: 'Esta acción desvinculará el sentido de la rama o sub-especialidad seleccionada.',
      variant: 'danger',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await AdminService.deleteRamaSentido(id);
      await useMasterStore.getState().refresh();
      addToast('Vinculación eliminada', 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const filteredSubs = newVinc.rama_id
    ? subEspecialidades.filter((s) => s.rama_id === newVinc.rama_id)
    : subEspecialidades;

  const displayVinculaciones = isCreate ? localVinculaciones : vinculaciones;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
      <div className="relative w-full max-w-3xl ninja-card-oro p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <h2 className="ninja-title text-xl sm:text-3xl leading-none">
                {isCreate ? 'CREAR SENTIDO' : 'EDITAR SENTIDO'}
              </h2>
              <p className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] mt-2 italic">
                Configuración de sentido avanzado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle Activo */}
            <label className="flex items-center gap-3 cursor-pointer bg-oro/5 px-4 py-2 border border-oro/10 hover:border-oro/30 transition-all">
              <span className={`text-caption font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
                {formData.activo ? 'ACTIVO' : 'INACTIVO'}
              </span>
              <input type="checkbox" checked={formData.activo} onChange={(e) => updateField('activo', e.target.checked)} className="hidden" />
              <div className={`w-8 h-4 rounded-none transition-all relative ${formData.activo ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${formData.activo ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
              </div>
            </label>
            <button onClick={onCancel} className="p-2 text-oro/40 hover:text-rojo-sangre transition-all hover:rotate-90">
              <X className="w-8 h-8" />
            </button>
          </div>
        </header>

        {/* Formulario principal */}
        <form onSubmit={handleSave} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 gap-8">
            <DataField
              label="Nombre del Sentido"
              value={formData.nombre}
              onChange={(v) => updateField('nombre', v)}
              placeholder="Ej: Oído Agudo"
            />
          </div>

          <div className="flex justify-end gap-6 pt-6 border-t border-oro/10">
            <button type="button" onClick={onCancel} className="ninja-btn-ghost px-10 py-5 text-sm">Cancelar</button>
            <button type="submit" disabled={loading} className="ninja-btn-oro px-12 py-5 text-sm flex items-center gap-3">
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Sentido
            </button>
          </div>
        </form>

        {/* Sección de Vinculaciones */}
        <div className="mt-10 pt-10 border-t border-oro/10 relative z-10 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <LinkIcon className="w-4 h-4 text-oro/60" />
            <h3 className="text-caption font-black uppercase tracking-[0.3em] text-oro/60">Vinculaciones con Ramas / Sub-especialidades</h3>
          </div>

          {/* Lista de vinculaciones existentes/locales */}
          <div className="space-y-2">
            {displayVinculaciones.length === 0 && (
              <p className="text-caption text-oro/20 font-black uppercase tracking-widest text-center py-4">
                Sin vinculaciones configuradas
              </p>
            )}
            {displayVinculaciones.map((v) => {
              const ramaName = v.rama_id ? ramas.find((r) => r.id === v.rama_id)?.nombre : null;
              const subName = v.sub_especialidad_id ? subEspecialidades.find((s) => s.id === v.sub_especialidad_id)?.nombre : null;
              return (
                <div key={v.id} className="flex items-center justify-between gap-4 p-3 bg-black/30 border border-oro/10 ninja-clip-xs">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-caption font-black text-oro uppercase tracking-wider truncate">
                      {ramaName || subName || `ID ${v.rama_id ?? v.sub_especialidad_id}`}
                    </span>
                    {subName && ramaName && (
                      <span className="text-caption text-oro/40 font-black uppercase tracking-wider">/ {subName}</span>
                    )}
                    <span className={`shrink-0 px-2 py-0.5 text-caption font-black uppercase tracking-widest ninja-clip-xs ${v.tipo === 'fijo' ? 'bg-rojo-sangre text-oro' : 'bg-oro/10 border border-oro/20 text-oro'}`}>
                      {v.tipo}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteVinculacion(v.id)}
                    className="p-1.5 text-oro/20 hover:text-rojo-sangre transition-all shrink-0"
                    title="Eliminar vinculación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Nueva vinculación */}
          <div className="p-4 bg-black/20 border border-oro/10 ninja-clip-sm space-y-4">
            <p className="text-caption font-black text-oro/40 uppercase tracking-[0.2em]">Añadir nueva vinculación</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SearchableSelect
                label="Rama / Clan"
                value={newVinc.rama_id}
                options={ramas.filter((r) => r.activo).map((r) => ({ label: r.nombre, value: r.id }))}
                onChange={(v) => setNewVinc((prev) => ({ ...prev, rama_id: v ? Number(v) : null, sub_especialidad_id: null }))}
                placeholder="Opcional"
              />
              <SearchableSelect
                label="Sub-especialidad"
                value={newVinc.sub_especialidad_id}
                options={filteredSubs.filter((s) => s.activo).map((s) => ({ label: s.nombre, value: s.id }))}
                onChange={(v) => setNewVinc((prev) => ({ ...prev, sub_especialidad_id: v ? Number(v) : null }))}
                placeholder="Opcional"
              />
              <div className="space-y-2">
                <label className="text-caption font-black uppercase tracking-widest text-oro/60 ml-1">Tipo</label>
                <div className="flex bg-black/40 p-1 border border-oro/10 h-[58px] ninja-clip-sm">
                  {(['fijo', 'seleccionable'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewVinc((prev) => ({ ...prev, tipo: t }))}
                      className={`flex-1 text-caption font-black uppercase tracking-wider transition-all ninja-clip-xs ${newVinc.tipo === t ? 'bg-oro text-rojo-sangre' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddVinculacion}
                disabled={vincLoading}
                className="flex items-center gap-2 px-6 py-3 bg-rojo-sangre hover:brightness-125 text-oro font-black text-caption uppercase tracking-widest transition-all ninja-clip-xs"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                {vincLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Añadir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
