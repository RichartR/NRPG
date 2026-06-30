'use client';

import { useState } from 'react';
import { X, Save, RefreshCw, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SearchableSelect } from '@/components/ui/Fields';
import { AcompananteInfo, RamaClan } from '@/domain/types';

const generateSlug = (val: string) => {
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

interface AcompananteEditFormProps {
  acompanante?: AcompananteInfo;
  ramasClanes: RamaClan[];
  onCancel: () => void;
}

export default function AcompananteEditForm({ acompanante, ramasClanes, onCancel }: AcompananteEditFormProps) {
  const isCreate = !acompanante;
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  const [formData, setFormData] = useState<Partial<AcompananteInfo>>(() =>
    acompanante
      ? { ...acompanante }
      : { nombre_esp: '', nombre_jap: '', slug: '', url_default: '', rama_clan_id: undefined, activo: true }
  );
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof AcompananteInfo, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_jap?.trim()) {
      addToast('El nombre en japonés/tipo es obligatorio', 'error');
      return;
    }
    if (!formData.nombre_esp?.trim()) {
      addToast('El nombre en español es obligatorio', 'error');
      return;
    }
    if (!formData.rama_clan_id) {
      addToast('Debes seleccionar un clan o rama de vinculación', 'error');
      return;
    }

    const finalSlug = formData.slug?.trim() || 
      (formData.nombre_esp || formData.nombre_jap || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const finalData = {
      ...formData,
      slug: finalSlug
    };

    setLoading(true);
    try {
      await AdminService.saveAcompanante(finalData);
      addToast(`Acompañante ${isCreate ? 'creado' : 'actualizado'} con éxito`, 'success');
      router.refresh();
      onCancel();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const branchOptions = ramasClanes
    .filter(r => r.activo)
    .map(r => ({
      label: `${r.nombre} [${r.tipo === 'clan' ? 'Clan' : 'Rama'}]`,
      value: String(r.id)
    }));

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
      <div className="relative w-full max-w-2xl ninja-card-oro p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="ninja-title text-xl sm:text-3xl leading-none">
                {isCreate ? 'CREAR ACOMPAÑANTE' : 'EDITAR ACOMPAÑANTE'}
              </h2>
              <p className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] mt-2 italic">
                Configuración general de acompañante de clan/rama
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle Activo */}
            <label className="flex items-center gap-3 cursor-pointer bg-oro/5 px-4 py-2 border border-oro/10 hover:border-oro/30 transition-all">
              <span className={`text-caption font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
                {formData.activo ? 'ACTIVO' : 'OCULTO'}
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

        {/* Formulario */}
        <form onSubmit={handleSave} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <DataField
                label="Nombre en Japonés / Tipo"
                value={formData.nombre_jap || ''}
                onChange={(v) => {
                  updateField('nombre_jap', v);
                  updateField('slug', generateSlug(v));
                }}
                placeholder="Ej: Akamaru, Kikai..."
              />
            </div>

            <div>
              <DataField
                label="Nombre en Español / Traducción"
                value={formData.nombre_esp || ''}
                onChange={(v) => updateField('nombre_esp', v)}
                placeholder="Ej: Perro Rojo, Insecto Parasitario..."
              />
            </div>

            <div className="sm:col-span-2">
              <DataField
                label="Slug (URL)"
                value={formData.slug || ''}
                onChange={(v) => updateField('slug', v.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                placeholder="Ej: akamaru, kikai"
              />
            </div>

            <div className="sm:col-span-2">
              <SearchableSelect
                label="Clan o Rama de Vinculación"
                value={formData.rama_clan_id ? String(formData.rama_clan_id) : ''}
                options={branchOptions}
                onChange={(v) => updateField('rama_clan_id', v ? Number(v) : undefined)}
                placeholder="Selecciona el clan o la rama correspondiente"
              />
            </div>

            <div className="sm:col-span-2">
              <DataField
                label="URL de Imagen por Defecto (Opcional)"
                value={formData.url_default || ''}
                onChange={(v) => updateField('url_default', v)}
                placeholder="https://ejemplo.com/ninken-default.png"
              />
            </div>
          </div>

          <div className="flex justify-end gap-6 pt-6 border-t border-oro/10">
            <button type="button" onClick={onCancel} className="ninja-btn-ghost px-10 py-5 text-sm">Cancelar</button>
            <button type="submit" disabled={loading} className="ninja-btn-oro px-12 py-5 text-sm flex items-center gap-3">
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Acompañante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
