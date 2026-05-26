'use client';

import { useState } from 'react';
import { Save, X, GitBranch, AlignLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SearchableSelect } from '@/components/ui/Fields';
import { RamaClan, Aldea } from '@/domain/types';

interface RamaEditFormProps {
  rama?: RamaClan;
  aldeas: Aldea[];
  onCancel: () => void;
}

export default function RamaEditForm({ rama, aldeas, onCancel }: RamaEditFormProps) {
  const isCreate = !rama;
  const [formData, setFormData] = useState<Partial<RamaClan>>(() => {
    if (rama) {
      return {
        ...rama,
        es_especial: rama.es_especial ?? false,
        es_repetible: rama.es_repetible ?? false
      };
    }
    return {
      nombre: '',
      slug: '',
      descripcion: '',
      tipo: 'rama',
      aldea_id: undefined,
      activo: true,
      es_especial: false,
      es_repetible: false,
      url_imagen: ''
    };
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        slug: formData.slug || formData.nombre?.toLowerCase().replace(/\s+/g, '-')
      };

      await AdminService.saveRamaClan(payload);
      addToast(`${formData.tipo === 'rama' ? 'Rama' : 'Clan'} ${isCreate ? 'creada' : 'actualizada'} con éxito`, 'success');
      router.refresh();
      onCancel();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof RamaClan, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
      <div
        className="relative w-full max-w-3xl ninja-card-oro p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10 relative z-10">
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
            <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm shrink-0">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h2 className="ninja-title text-xl sm:text-3xl leading-none">
                {isCreate ? (formData.tipo === 'rama' ? 'CREAR NUEVA RAMA' : 'CREAR NUEVO CLAN') : 'EDITAR REGISTRO'}
              </h2>
              <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.2em] mt-2 italic">Configuración de especialidades ninja</p>
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
                onChange={(e) => updateField('activo', e.target.checked)}
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

        <form onSubmit={handleSave} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DataField
              label="Nombre"
              value={formData.nombre}
              onChange={(v) => {
                updateField('nombre', v);
                if (!formData.slug) updateField('slug', v.toLowerCase().trim().replace(/\s+/g, '-'));
              }}
              placeholder="Ej: Clan Uchiha"
            />
            <DataField
              label="Slug (URL)"
              value={formData.slug}
              onChange={(v) => updateField('slug', v.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="clan-uchiha"
            />
            <SearchableSelect
              label="Aldea Asociada"
              value={formData.aldea_id}
              options={aldeas.map(a => ({ label: a.nombre_completo, value: a.id }))}
              onChange={(v) => updateField('aldea_id', v ? Number(v) : null)}
              placeholder="Cualquier Aldea / Ronin"
            />
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1">Tipo de Registro</label>
              <div className="flex bg-black/40 p-1 border border-oro/10 h-[58px] ninja-clip-sm">
                <button
                  type="button"
                  onClick={() => {
                    updateField('tipo', 'rama');
                    updateField('es_especial', false);
                  }}
                  className={`flex-1 text-[10px] font-black uppercase tracking-widest transition-all ninja-clip-xs ${formData.tipo === 'rama' ? 'bg-oro text-rojo-sangre shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
                >
                  Rama
                </button>
                <button
                  type="button"
                  onClick={() => updateField('tipo', 'clan')}
                  className={`flex-1 text-[10px] font-black uppercase tracking-widest transition-all ninja-clip-xs ${formData.tipo === 'clan' ? 'bg-oro text-rojo-sangre shadow-lg' : 'text-oro/40 hover:text-oro hover:bg-oro/5'}`}
                >
                  Clan
                </button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1">Repetibilidad</label>
              <div className="flex bg-black/40 p-4 border border-oro/10 justify-between items-center h-[58px] ninja-clip-sm">
                <span className="text-[11px] font-black uppercase tracking-widest text-oro/40">
                  ¿Es Rama Repetible en slots del personaje?
                </span>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${formData.es_repetible ? 'text-oro' : 'text-oro/20'}`}>
                    {formData.es_repetible ? 'SÍ' : 'NO'}
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.es_repetible}
                    onChange={(e) => updateField('es_repetible', e.target.checked)}
                    className="hidden"
                  />
                  <div className={`w-8 h-4 rounded-none transition-all relative ${formData.es_repetible ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                    <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${formData.es_repetible ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
                  </div>
                </label>
              </div>
            </div>
            {formData.tipo === 'clan' && (
              <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1">Estatus del Clan</label>
                <div className="flex bg-black/40 p-4 border border-oro/10 justify-between items-center h-[58px] ninja-clip-sm">
                  <span className="text-[11px] font-black uppercase tracking-widest text-oro/40">
                    Clan Especial (Límites reducidos)
                  </span>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${formData.es_especial ? 'text-oro' : 'text-oro/20'}`}>
                      {formData.es_especial ? 'SÍ' : 'NO'}
                    </span>
                    <input
                      type="checkbox"
                      checked={formData.es_especial}
                      onChange={(e) => updateField('es_especial', e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-8 h-4 rounded-none transition-all relative ${formData.es_especial ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                      <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${formData.es_especial ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
                    </div>
                  </label>
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <DataField
                label="URL Imagen"
                value={formData.url_imagen}
                onChange={(v) => updateField('url_imagen', v)}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-oro/60 ml-1 flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-oro/60" /> Descripción / Lore
            </label>
            <textarea
              rows={4}
              value={formData.descripcion || ''}
              onChange={(e) => updateField('descripcion', e.target.value)}
              className="w-full bg-black/40 border border-oro/10 p-6 text-oro font-black outline-none focus:border-oro/40 transition-all placeholder:text-oro/10 text-sm md:text-base ninja-clip-sm"
              placeholder="Describe las habilidades únicas o historia..."
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
              Guardar {formData.tipo === 'rama' ? 'Rama' : 'Clan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
