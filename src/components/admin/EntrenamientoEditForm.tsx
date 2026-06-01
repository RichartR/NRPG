'use client';

import { useState } from 'react';
import { X, Save, ScrollText, RefreshCw } from 'lucide-react';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { Entrenamiento, RamaClan, SubEspecialidad } from '@/domain/types';
import { DataField, SearchableSelect, SelectField } from '@/components/ui/Fields';

interface Props {
  entrenamiento?: Entrenamiento | null;
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
  onCancel: () => void;
}

export default function EntrenamientoEditForm({ entrenamiento, ramas, subEspecialidades, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Entrenamiento>>(
    entrenamiento || {
      nombre_esp: '',
      nombre_jp: '',
      id_ramaclan: 0,
      id_subespecialidad: null,
      activo: true,
      rango: 'B',
      requisitos: {},
      coste_exp: 0,
      coste_ryous: 0,
      coste_puntos_aprendizaje: 0
    }
  );

  const addToast = useToastStore(state => state.addToast);
  const router = useRouter();

  // Filter sub-specialties based on selected Rama/Clan
  const filteredSubs = subEspecialidades.filter(s => s.rama_id === formData.id_ramaclan);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_esp || !formData.id_ramaclan) {
      addToast('Nombre y Rama son obligatorios', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        requisitos: { rango: formData.rango || 'B' }
      };
      await AdminService.saveEntrenamiento(payload);
      addToast(entrenamiento ? 'Entrenamiento actualizado' : 'Entrenamiento creado', 'success');
      router.refresh();
      onCancel();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isCreate = !entrenamiento;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
      <div
        className="relative w-full max-w-3xl ninja-card-oro p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 relative z-10">
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
            <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm shrink-0">
              <ScrollText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="ninja-title text-xl sm:text-3xl leading-none">
                {isCreate ? 'CREAR ENTRENAMIENTO' : 'EDITAR ENTRENAMIENTO'}
              </h2>
              <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.2em] mt-2 italic">Configuración de entrenamientos shinobi</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <label className="flex items-center gap-3 cursor-pointer group bg-oro/5 px-4 py-2 border border-oro/10 hover:border-oro/30 transition-all">
              <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
                {formData.activo ? 'ACTIVO' : 'INACTIVO'}
              </span>
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="hidden"
              />
              <div className={`w-8 h-4 rounded-none transition-all relative ${formData.activo ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${formData.activo ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
              </div>
            </label>
            <button onClick={onCancel} className="p-2 text-oro/40 hover:text-rojo-sangre transition-all hover:rotate-90">
              <X className="w-8 h-8" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DataField
              label="Nombre Español"
              value={formData.nombre_esp}
              onChange={(v) => setFormData({ ...formData, nombre_esp: v })}
              placeholder="Ej: Entrenamiento de Control de Chakra"
            />
            <DataField
              label="Nombre Japonés"
              value={formData.nombre_jp}
              onChange={(v) => setFormData({ ...formData, nombre_jp: v })}
              placeholder="Ej: Chakura no Torēningu"
            />
            <SearchableSelect
              label="Rama / Clan Padre"
              value={formData.id_ramaclan || undefined}
              options={ramas.map(r => ({ label: r.nombre, value: r.id }))}
              onChange={(v) => setFormData({ ...formData, id_ramaclan: Number(v), id_subespecialidad: null })}
              placeholder="Seleccionar Rama / Clan..."
            />
            <SearchableSelect
              label="Sub-especialidad (Opcional)"
              value={formData.id_subespecialidad || undefined}
              disabled={!formData.id_ramaclan}
              options={filteredSubs.map(s => ({ label: s.nombre, value: s.id }))}
              onChange={(v) => setFormData({ ...formData, id_subespecialidad: v ? Number(v) : null })}
              placeholder="Ninguna / General"
            />
            <SelectField
              label="Rango de Acceso"
              value={formData.rango || 'B'}
              options={['D', 'C', 'B', 'A', 'S']}
              onChange={(v) => setFormData({ ...formData, rango: v })}
            />
            <DataField
              label="Coste EXP"
              value={String(formData.coste_exp ?? 0)}
              onChange={(v) => setFormData({ ...formData, coste_exp: Number(v) || 0 })}
              placeholder="Ej: 1000"
            />
            <DataField
              label="Coste Ryous"
              value={String(formData.coste_ryous ?? 0)}
              onChange={(v) => setFormData({ ...formData, coste_ryous: Number(v) || 0 })}
              placeholder="Ej: 2000"
            />
            <DataField
              label="Coste Puntos de Aprendizaje"
              value={String(formData.coste_puntos_aprendizaje ?? 0)}
              onChange={(v) => setFormData({ ...formData, coste_puntos_aprendizaje: Number(v) || 0 })}
              placeholder="Ej: 10"
            />
          </div>

          <div className="flex justify-end gap-6 pt-10 border-t border-oro/10">
            <button
              type="button"
              onClick={onCancel}
              className="ninja-btn-ghost px-10 py-5 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ninja-btn-oro px-12 py-5 text-sm flex items-center justify-center gap-3"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Entrenamiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
