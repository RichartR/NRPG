'use client';

import { useState } from 'react';
import { X, Save, RefreshCw, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SearchableSelect } from '@/components/ui/Fields';
import { Rasgo } from '@/domain/types';
import { searchIncludes } from '@/lib/utils/search';
import { Portal } from '@/components/ui/Portal';

interface RasgoEditFormProps {
  rasgo?: Rasgo;
  characters: any[];
  onCancel: () => void;
}

export default function RasgoEditForm({ rasgo, characters, onCancel }: RasgoEditFormProps) {
  const isCreate = !rasgo;
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  const [formData, setFormData] = useState<Partial<Rasgo>>(() =>
    rasgo
      ? { ...rasgo, personajes: rasgo.personajes || [] }
      : { nombre: '', categoria: 'Físico', rango: 'D', activo: true, especial: false, personajes: [], stat: null }
  );
  const [loading, setLoading] = useState(false);
  const [charSearch, setCharSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

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
      await AdminService.saveRasgo(formData);
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
    <Portal>
      <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
      <div className="relative w-full max-w-5xl ninja-card-oro no-hover p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300">
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
              <p className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] mt-2 italic">
                Configuración general de rasgo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle Activo */}
            <button
              type="button"
              onClick={() => updateField('activo', !formData.activo)}
              className={`flex items-center gap-3 cursor-pointer px-4 py-2 border transition-all ${formData.activo ? 'bg-oro/10 border-oro/40 text-oro shadow-lg' : 'bg-black/60 border-oro/20 text-oro/40 hover:border-oro/30'}`}
            >
              <span className={`text-caption font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-oro' : 'text-oro/30'}`}>
                {formData.activo ? 'ACTIVO' : 'OCULTO'}
              </span>
              <div className={`w-11 h-6 rounded-full transition-all relative border ${formData.activo ? 'bg-oro/30 border-oro' : 'bg-neutral-800 border-oro/30'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${formData.activo ? 'right-0.5 bg-oro shadow-[0_0_10px_rgba(255,230,159,0.8)]' : 'left-0.5 bg-oro/40'}`} />
              </div>
            </button>
            <button onClick={onCancel} type="button" className="p-2 text-oro/40 hover:text-naranja-naruto transition-all hover:rotate-90">
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
              <label className="text-caption font-black uppercase tracking-widest text-oro/60 ml-1">Categoría</label>
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
                    className={`flex-1 text-caption font-black uppercase tracking-widest transition-all ninja-clip-xs ${formData.categoria === cat ? 'bg-oro text-naranja-naruto shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
                  >
                    {cat === 'Físico' ? 'Físico' : cat === 'Psicológico' ? 'Psico' : 'Habilidad'}
                  </button>
                ))}
              </div>
            </div>

            {/* Rango */}
            <div className="space-y-2">
              <label className="text-caption font-black uppercase tracking-widest text-oro/60 ml-1">Rango requerido</label>
              <div className="flex bg-black/40 p-1 border border-oro/10 h-[58px] ninja-clip-sm">
                {(['D', 'C', 'B', 'A'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateField('rango', r)}
                    className={`flex-1 text-caption font-black uppercase tracking-widest transition-all ninja-clip-xs ${formData.rango === r ? 'bg-oro text-naranja-naruto shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
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
            <div
              onClick={() => updateField('especial', !formData.especial)}
              className={`sm:col-span-2 flex items-center justify-between p-5 border cursor-pointer select-none transition-all ninja-clip-sm ${
                formData.especial
                  ? 'bg-naranja-naruto/15 border-naranja-naruto/60 shadow-[0_0_20px_rgba(234,88,12,0.2)]'
                  : 'bg-black/60 border-oro/20 hover:border-oro/40 hover:bg-oro/5'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 border transition-colors ${formData.especial ? 'bg-naranja-naruto/20 border-naranja-naruto text-naranja-naruto' : 'bg-oro/5 border-oro/20 text-oro/40'}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black uppercase tracking-widest transition-colors ${formData.especial ? 'text-naranja-naruto' : 'text-oro'}`}>
                      Rasgo Especial
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest rounded transition-colors ${formData.especial ? 'bg-naranja-naruto text-black font-extrabold shadow-[0_0_10px_rgba(234,88,12,0.4)]' : 'bg-black/80 text-oro/40 border border-oro/20'}`}>
                      {formData.especial ? 'ACTIVADO' : 'DESACTIVADO'}
                    </span>
                  </div>
                  <span className="text-caption font-bold text-oro/60 uppercase tracking-wider mt-1">
                    Solo seleccionable por personajes autorizados explícitamente.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-caption font-black uppercase tracking-widest hidden sm:inline ${formData.especial ? 'text-naranja-naruto font-extrabold' : 'text-oro/40'}`}>
                  {formData.especial ? 'SÍ' : 'NO'}
                </span>
                <div className={`w-12 h-6 rounded-full transition-all relative border ${formData.especial ? 'bg-naranja-naruto/30 border-naranja-naruto' : 'bg-neutral-800 border-oro/30'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${formData.especial ? 'right-0.5 bg-naranja-naruto shadow-[0_0_10px_rgba(234,88,12,0.9)]' : 'left-0.5 bg-oro/40'}`} />
                </div>
              </div>
            </div>

            {/* Personajes Autorizados (solo si es Especial) */}
            {formData.especial && (
              <div className="sm:col-span-2 space-y-3 relative">
                <label className="text-caption font-black uppercase tracking-widest text-oro/60 ml-1">
                  Personajes Autorizados
                </label>

                {/* Selected Character Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(formData.personajes || []).map((charId: number) => {
                    const char = characters.find(c => Number(c.id) === Number(charId));
                    return (
                      <span
                        key={charId}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-naranja-naruto/20 border border-naranja-naruto/40 text-oro text-caption font-black uppercase tracking-wider"
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                      >
                        {char ? char.nombre_ninja : `ID: ${charId}`}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (formData.personajes || []).filter((id: number) => id !== charId);
                            updateField('personajes', updated);
                          }}
                          className="hover:text-red-400 focus:outline-none ml-1 text-oro/60"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {(formData.personajes || []).length === 0 && (
                    <span className="text-xs text-oro/20 font-black italic ml-1">Ninguno seleccionado</span>
                  )}
                </div>

                {/* Dropdown Input Trigger */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="BUSCAR PERSONAJE PARA AUTORIZAR..."
                    value={charSearch}
                    onChange={(e) => {
                      setCharSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full h-[58px] bg-black/40 border border-oro/10 px-6 py-4 text-oro font-black outline-none focus:border-oro/40 transition-all placeholder:text-oro/20 text-sm xl:text-base ninja-clip-sm"
                  />

                  {showDropdown && charSearch.trim().length > 0 && (
                    <div
                      className="absolute z-[110] w-full mt-2 bg-neutral-900 border border-oro/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden ninja-clip-sm"
                      onMouseLeave={() => setShowDropdown(false)}
                    >
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {characters
                          .filter(c => searchIncludes(c.nombre_ninja, charSearch))
                          .map(c => {
                            const isSelected = (formData.personajes || []).includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  let updated = [...(formData.personajes || [])];
                                  if (isSelected) {
                                    updated = updated.filter(id => id !== c.id);
                                  } else {
                                    updated.push(c.id);
                                  }
                                  updateField('personajes', updated);
                                }}
                                className={`w-full text-left px-6 py-3 text-caption sm:text-xs font-black uppercase tracking-widest transition-all border-b border-oro/[0.04] last:border-0 hover:bg-oro/5 hover:text-oro flex justify-between items-center ${isSelected ? 'bg-oro/10 text-oro' : 'text-oro/40'}`}
                              >
                                <span>{c.nombre_ninja}</span>
                                {isSelected && <div className="w-[5px] h-[5px] bg-oro rotate-45" />}
                              </button>
                            );
                          })}
                        {characters.filter(c => searchIncludes(c.nombre_ninja, charSearch)).length === 0 && (
                          <div className="px-6 py-4 text-caption text-oro/20 font-black uppercase tracking-widest text-center italic">Sin resultados</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
    </Portal>
  );
}
