'use client';

import { useState } from 'react';
import { Save, X, Image as ImageIcon, MapPin, AlignLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { Aldea } from '@/domain/types';

interface AldeaEditFormProps {
  aldea?: Aldea;
  onCancel: () => void;
}

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

export default function AldeaEditForm({ aldea, onCancel }: AldeaEditFormProps) {
  const isCreate = !aldea;
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  const [formData, setFormData] = useState<Partial<Aldea>>(() => {
    if (aldea) {
      return {
        ...aldea,
        categoria_id: aldea.categoria_id ?? 1
      };
    }
    return {
      nombre_jap: '',
      abreviatura: '',
      slug: '',
      nombre_español: '',
      nombre_completo: '',
      descripcion: '',
      url_imagen: '',
      url_icono: '',
      activo: true,
      categoria_id: 1
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
        slug: generateSlug(formData.slug || formData.abreviatura || '')
      };

      await AdminService.saveAldea(payload);
      addToast(`Aldea ${isCreate ? 'creada' : 'actualizada'} con éxito`, 'success');
      router.refresh();
      onCancel();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof Aldea, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl ninja-card-oro p-6 sm:p-10 xl:p-12 my-auto animate-in fade-in zoom-in duration-300">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10">
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
            <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="ninja-title text-xl sm:text-3xl">
                {isCreate ? 'Nueva Aldea' : 'Editar Aldea'}
              </h2>
              <p className="text-caption font-black text-oro/40 uppercase tracking-[0.2em] mt-1">Configuración del núcleo geográfico</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <label className="flex items-center gap-3 cursor-pointer group bg-oro/5 px-4 py-2 border border-oro/10 hover:border-oro/30 transition-all">
              <span className="text-caption font-black uppercase tracking-widest text-oro/40">
                TIPO:
              </span>
              <span className={`text-caption font-black uppercase tracking-widest transition-colors ${formData.categoria_id === 2 ? 'text-oro' : 'text-oro/70'}`}>
                {formData.categoria_id === 2 ? 'ORGANIZACIÓN' : 'ALDEA'}
              </span>
              <input
                type="checkbox"
                checked={formData.categoria_id === 2}
                onChange={(e) => updateField('categoria_id', e.target.checked ? 2 : 1)}
                className="hidden"
              />
              <div className={`w-8 h-4 rounded-none transition-all relative ${formData.categoria_id === 2 ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border`}>
                <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${formData.categoria_id === 2 ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group bg-oro/5 px-4 py-2 border border-oro/10 hover:border-oro/30 transition-all">
              <span className={`text-caption font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
                {formData.activo ? 'ACTIVA' : 'INACTIVA'}
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
            <button onClick={onCancel} className="p-2 text-oro/40 hover:text-rojo-sangre transition-all">
              <X className="w-8 h-8" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Nombre Japonés</label>
              <input
                type="text"
                value={formData.nombre_jap}
                onChange={(e) => updateField('nombre_jap', e.target.value)}
                placeholder="Ej: Konohagakure"
                className="w-full ninja-input py-4"
              />
            </div>
            <div className="space-y-3">
              <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Abreviatura</label>
              <input
                type="text"
                value={formData.abreviatura}
                onChange={(e) => {
                  updateField('abreviatura', e.target.value);
                  if (!isSlugEdited && isCreate) {
                    updateField('slug', generateSlug(e.target.value));
                  }
                }}
                placeholder="Ej: Konoha"
                className="w-full ninja-input py-4"
              />
            </div>
            <div className="space-y-3">
              <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Slug (URL)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => {
                  setIsSlugEdited(true);
                  updateField('slug', generateSlug(e.target.value));
                }}
                placeholder="ej-konoha"
                className="w-full ninja-input py-4"
              />
            </div>
            <div className="space-y-3">
              <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Nombre en Español</label>
              <input
                type="text"
                value={formData.nombre_español}
                onChange={(e) => updateField('nombre_español', e.target.value)}
                placeholder="Ej: Aldea Oculta de la Hoja"
                className="w-full ninja-input py-4"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-3">
              <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">Nombre Completo</label>
              <input
                type="text"
                value={formData.nombre_completo}
                onChange={(e) => updateField('nombre_completo', e.target.value)}
                placeholder="Ej: Konohagakure no Sato"
                className="w-full ninja-input py-4"
              />
            </div>
            <div className="space-y-3">
              <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1">URL Imagen / Banner</label>
              <input
                type="text"
                value={formData.url_imagen}
                onChange={(e) => updateField('url_imagen', e.target.value)}
                placeholder="https://..."
                className="w-full ninja-input py-4"
              />
            </div>
            <div className="space-y-3">
              <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> URL Icono / Emblema
              </label>
              <div className="flex gap-4 items-start">
                <input
                  type="text"
                  value={formData.url_icono || ''}
                  onChange={(e) => updateField('url_icono', e.target.value)}
                  placeholder="/assets/logos_aldeas/konoha.webp"
                  className="w-full ninja-input py-4 flex-1"
                />
                {formData.url_icono && (
                  <div className="w-16 h-16 shrink-0 border border-oro/20 bg-black/40 p-2 flex items-center justify-center">
                    <img src={formData.url_icono} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-caption font-black uppercase tracking-widest text-oro/40 ml-1 flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Descripción Histórica
            </label>
            <textarea
              rows={4}
              value={formData.descripcion || ''}
              onChange={(e) => updateField('descripcion', e.target.value)}
              className="w-full ninja-input p-6 min-h-[120px] resize-none"
              placeholder="Escribe el lore de esta aldea..."
            />
          </div>

          <div className="flex justify-end gap-6 pt-10 border-t border-oro/10">
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-4 text-caption font-black uppercase tracking-[0.3em] text-oro/40 hover:text-oro transition-all italic"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ninja-btn-oro px-12 py-5 text-sm"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isCreate ? 'Registrar Aldea' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
