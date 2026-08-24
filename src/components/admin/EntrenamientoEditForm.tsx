'use client';

import { useState } from 'react';
import { X, Save, ScrollText, RefreshCw } from 'lucide-react';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { Entrenamiento, RamaClan, SubEspecialidad } from '@/domain/types';
import { DataField, SearchableSelect, SelectField, NinjaSelect } from '@/components/ui/Fields';
import { Portal } from '@/components/ui/Portal';

interface Props {
  entrenamiento?: Entrenamiento | null;
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
  onCancel: () => void;
}

const STATS_DISPONIBLES = ['NIN', 'GEN', 'TAI', 'SM', 'FUE', 'AGI', 'EST', 'INT'];

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

  // Parse stats_opciones de requisitos
  const initialStatsOpciones = (() => {
    const req = formData.requisitos;
    if (req && Array.isArray(req.stats_opciones)) return req.stats_opciones;
    if (req && req.stats && typeof req.stats === 'object') return [req.stats];
    return [];
  })();

  const [statsOpciones, setStatsOpciones] = useState<Array<Record<string, number>>>(initialStatsOpciones);

  const addToast = useToastStore(state => state.addToast);
  const router = useRouter();

  // Filter sub-specialties based on selected Rama/Clan
  const filteredSubs = subEspecialidades.filter(s => s.rama_id === formData.id_ramaclan);

  const handleAddOptionGroup = () => {
    setStatsOpciones(prev => [...prev, {}]);
  };

  const handleRemoveOptionGroup = (index: number) => {
    setStatsOpciones(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateGroupStat = (groupIndex: number, statKey: string, val: number) => {
    setStatsOpciones(prev => {
      const copy = [...prev];
      const currentGroup = { ...copy[groupIndex] };
      if (val <= 0) {
        delete currentGroup[statKey];
      } else {
        currentGroup[statKey] = val;
      }
      copy[groupIndex] = currentGroup;
      return copy;
    });
  };

  const handleAddStatToGroup = (groupIndex: number, statKey: string) => {
    setStatsOpciones(prev => {
      const copy = [...prev];
      const currentGroup = { ...copy[groupIndex] };
      if (!(statKey in currentGroup)) {
        currentGroup[statKey] = 1;
      }
      copy[groupIndex] = currentGroup;
      return copy;
    });
  };

  const handleRemoveStatFromGroup = (groupIndex: number, statKey: string) => {
    setStatsOpciones(prev => {
      const copy = [...prev];
      const currentGroup = { ...copy[groupIndex] };
      delete currentGroup[statKey];
      copy[groupIndex] = currentGroup;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_esp || !formData.id_ramaclan) {
      addToast('Nombre y Rama son obligatorios', 'error');
      return;
    }

    setLoading(true);
    try {
      // Filtrar grupos vacíos
      const cleanOpciones = statsOpciones
        .map(group => {
          const cleanGroup: Record<string, number> = {};
          for (const [k, v] of Object.entries(group)) {
            if (Number(v) > 0) cleanGroup[k] = Number(v);
          }
          return cleanGroup;
        })
        .filter(group => Object.keys(group).length > 0);

      const existingReqs = typeof formData.requisitos === 'object' && formData.requisitos ? formData.requisitos : {};
      const payload = {
        ...formData,
        requisitos: {
          ...existingReqs,
          rango: formData.rango || 'B',
          ...(cleanOpciones.length > 0 ? { stats_opciones: cleanOpciones } : { stats_opciones: undefined })
        }
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
    <Portal>
      <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
        <div
          className="relative w-full max-w-5xl ninja-card-oro no-hover p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300"
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
                <p className="text-caption font-black text-white/80 uppercase tracking-[0.2em] mt-2 italic">Configuración de entrenamientos shinobi</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <label className="flex items-center gap-3 cursor-pointer group bg-oro/5 px-4 py-2 border border-oro/10 hover:border-oro/30 transition-all">
                <span className={`text-caption font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
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
              <button onClick={onCancel} className="p-2 text-oro/40 hover:text-naranja-naruto transition-all hover:rotate-90">
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

            {/* Opciones de Stats Mínimas Requeridas */}
            <div className="space-y-4 pt-6 border-t border-oro/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h4 className="text-caption font-black text-oro uppercase tracking-[0.2em]">Opciones de Stats Base Requeridas (OR)</h4>
                  <p className="text-caption font-bold text-white/80 mt-1">El personaje debe cumplir AL MENOS UNA de estas opciones de stats para acceder al entrenamiento.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddOptionGroup}
                  className="ninja-btn-oro text-xs py-2 px-4 shrink-0"
                >
                  + Añadir Opción de Stats
                </button>
              </div>

              {statsOpciones.length === 0 ? (
                <div className="p-4 bg-black/40 border border-oro/10 text-caption font-black text-oro/30 uppercase tracking-widest text-center">
                  Sin requisitos de stats base mínimas
                </div>
              ) : (
                <div className="space-y-4">
                  {statsOpciones.map((group, groupIdx) => {
                    const availableStatsToAdd = STATS_DISPONIBLES.filter(s => !(s in group));
                    return (
                      <div key={groupIdx} className="p-4 bg-black/60 border border-oro/20 ninja-clip-sm space-y-3">
                        <div className="flex justify-between items-center border-b border-oro/10 pb-2">
                          <span className="text-caption font-black text-oro uppercase tracking-wider">
                            Opción {groupIdx + 1} {groupIdx > 0 ? '(Alternativa OR)' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionGroup(groupIdx)}
                            className="text-xs text-naranja-naruto hover:underline font-bold"
                          >
                            Eliminar Opción
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {Object.entries(group).map(([statKey, val]) => (
                            <div key={statKey} className="flex flex-col gap-1 bg-oro/5 p-2 border border-oro/10 relative">
                              <div className="flex justify-between items-center">
                                <span className="text-caption font-black text-oro">{statKey} Mínimo</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStatFromGroup(groupIdx, statKey)}
                                  className="text-oro/40 hover:text-naranja-naruto text-xs font-bold"
                                >
                                  ×
                                </button>
                              </div>
                              <input
                                type="number"
                                min="1"
                                value={val}
                                onChange={(e) => handleUpdateGroupStat(groupIdx, statKey, Number(e.target.value))}
                                className="bg-black/60 border border-oro/20 px-2 py-1 text-sm font-bold text-oro outline-none focus:border-oro"
                              />
                            </div>
                          ))}
                        </div>

                        {availableStatsToAdd.length > 0 && (
                          <div className="flex items-center gap-2 pt-2">
                            <span className="text-caption text-white font-bold uppercase shrink-0">+ Agregar Stat:</span>
                            <NinjaSelect
                              options={availableStatsToAdd.map(s => ({ label: s, value: s }))}
                              value=""
                              placeholder="Seleccionar stat..."
                              variant="compact"
                              onChange={(val) => {
                                if (val) {
                                  handleAddStatToGroup(groupIdx, val);
                                }
                              }}
                              className="w-48"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
    </Portal>
  );
}
