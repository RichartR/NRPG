'use client';

import { useState } from 'react';
import { X, Save, RefreshCw, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SearchableSelect } from '@/components/ui/Fields';
import { Rasgo } from '@/domain/types';

interface RasgoEditFormProps {
  rasgo?: Rasgo;
  onCancel: () => void;
}

export default function RasgoEditForm({ rasgo, onCancel }: RasgoEditFormProps) {
  const isCreate = !rasgo;
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  const [formData, setFormData] = useState<Partial<Rasgo>>(() =>
    rasgo
      ? { ...rasgo }
      : { nombre: '', categoria: 'Físico', rango: 'D', activo: true, especial: false, personajes: [], stat: null }
  );
  const [loading, setLoading] = useState(false);

  // For allowed characters, we display them as comma-separated list of IDs
  const [personajesRaw, setPersonajesRaw] = useState<string>(() => {
    if (rasgo?.personajes && Array.isArray(rasgo.personajes)) {
      return rasgo.personajes.join(', ');
    }
    return '';
  });

  const updateField = (field: keyof Rasgo, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre?.trim()) {
      addToast('El nombre del rasgo es obligatorio', 'error');
      return;
    }

    setLoading(true);
    try {
      // Parse characters IDs
      const ids = personajesRaw
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p !== '' && !isNaN(Number(p)))
        .map((p) => Number(p));

      const payload = {
        ...formData,
        personajes: ids,
      };

      await AdminService.saveRasgo(payload);
      addToast(`Rasgo ${isCreate ? 'creado' : 'actualizado'} con éxito`, 'success');
      router.refresh();
      onCancel();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
      <div className="relative w-full max-w-2xl ninja-card-oro p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="ninja-title text-xl sm:text-3xl leading-none">
                {isCreate ? 'CREAR RASGO' : 'EDITAR RASGO'}
              </h2>
              <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.2em] mt-2 italic">
                Configuración general de rasgo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle Activo */}
            <label className="flex items-center gap-3 cursor-pointer bg-oro/5 px-4 py-2 border border-oro/10 hover:border-oro/30 transition-all">
              <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
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
            <div className="sm:col-span-2">
              <DataField
                label="Nombre del Rasgo"
                value={formData.nombre}
                onChange={(v) => updateField('nombre', v)}
                placeholder="Ej: Constitución Robusta, Mente Analítica..."
              />
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1">Categoría</label>
              <div className="flex bg-black/40 p-1 border border-oro/10 h-[58px] ninja-clip-sm">
                {(['Físico', 'Psicológico', 'Habilidad'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      updateField('categoria', cat);
                      if (cat !== 'Habilidad') {
                        updateField('stat', null);
                      }
                    }}
                    className={`flex-1 text-[9px] font-black uppercase tracking-widest transition-all ninja-clip-xs ${formData.categoria === cat ? 'bg-oro text-rojo-sangre shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
                  >
                    {cat === 'Físico' ? 'Físico' : cat === 'Psicológico' ? 'Psico' : 'Habilidad'}
                  </button>
                ))}
              </div>
            </div>

            {/* Rango */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1">Rango requerido</label>
              <div className="flex bg-black/40 p-1 border border-oro/10 h-[58px] ninja-clip-sm">
                {(['D', 'C', 'B', 'A'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateField('rango', r)}
                    className={`flex-1 text-[10px] font-black uppercase tracking-widest transition-all ninja-clip-xs ${formData.rango === r ? 'bg-oro text-rojo-sangre shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Stat asociado (solo para Habilidad) */}
            {formData.categoria === 'Habilidad' && (
              <div className="sm:col-span-2">
                <SearchableSelect
                  label="Stat Afiliado (Solo para Habilidad)"
                  value={formData.stat ?? ''}
                  options={[
                    { label: 'Ninguno / Ninguno', value: '' },
                    { label: 'NIN', value: 'NIN' },
                    { label: 'GEN', value: 'GEN' },
                    { label: 'TAI', value: 'TAI' },
                    { label: 'SM', value: 'SM' },
                    { label: 'FUE', value: 'FUE' },
                    { label: 'AGI', value: 'AGI' },
                    { label: 'EST', value: 'EST' },
                    { label: 'INT', value: 'INT' },
                  ]}
                  onChange={(v) => updateField('stat', v === '' ? null : v)}
                  placeholder="Selecciona el stat asociado"
                />
              </div>
            )}

            {/* Toggle Especial */}
            <div className="sm:col-span-2 flex items-center justify-between p-4 bg-black/40 border border-oro/10 ninja-clip-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-oro">Rasgo Especial</span>
                <span className="text-[8px] font-black text-oro/40 uppercase tracking-wider mt-1">
                  Solo seleccionable por personajes autorizados explícitamente.
                </span>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.especial}
                  onChange={(e) => updateField('especial', e.target.checked)}
                  className="hidden"
                />
                <div className={`w-10 h-5 rounded-none transition-all relative ${formData.especial ? 'bg-rojo-sangre/20 border-rojo-sangre/40' : 'bg-black/40 border-oro/10'} border`}>
                  <div className={`absolute top-[3px] w-3 h-3 transition-all ${formData.especial ? 'right-[3px] bg-rojo-sangre shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'left-[3px] bg-oro/10'}`} />
                </div>
              </label>
            </div>

            {/* Personajes Autorizados (solo si es Especial) */}
            {formData.especial && (
              <div className="sm:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1">
                  IDs de personajes autorizados (Separados por comas)
                </label>
                <textarea
                  value={personajesRaw}
                  onChange={(e) => setPersonajesRaw(e.target.value)}
                  placeholder="Ej: 1, 25, 42"
                  className="w-full min-h-[80px] bg-black/40 border border-oro/10 p-4 text-xs font-black text-oro focus:border-oro/40 outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest"
                  style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-6 pt-6 border-t border-oro/10">
            <button type="button" onClick={onCancel} className="ninja-btn-ghost px-10 py-5 text-sm">Cancelar</button>
            <button type="submit" disabled={loading} className="ninja-btn-oro px-12 py-5 text-sm flex items-center gap-3">
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Rasgo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
