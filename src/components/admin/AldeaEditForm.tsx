'use client';

import { useState } from 'react';
import { Save, X, Image as ImageIcon, MapPin, Type, AlignLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField } from '@/components/ui/Fields';
import { Aldea } from '@/domain/types';

interface AldeaEditFormProps {
  aldea?: Aldea;
  onCancel: () => void;
}

export default function AldeaEditForm({ aldea, onCancel }: AldeaEditFormProps) {
  const isCreate = !aldea;
  const [formData, setFormData] = useState<Partial<Aldea>>(aldea || {
    nombre_jap: '',
    abreviatura: '',
    slug: '',
    nombre_español: '',
    nombre_completo: '',
    descripcion: '',
    url_imagen: '',
    activo: true
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
        slug: formData.slug || formData.abreviatura?.toLowerCase().replace(/\s+/g, '-')
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
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="p-4 border border-oro/20 bg-oro/10 text-oro ninja-clip-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="ninja-title text-2xl sm:text-3xl">
                {isCreate ? 'Nueva Aldea' : 'Editar Aldea'}
              </h2>
              <p className="text-[10px] font-black text-oro/40 uppercase tracking-[0.2em] mt-1">Configuración del núcleo geográfico</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer group bg-oro/5 px-4 py-2 border border-oro/10 hover:border-oro/30 transition-all">
              <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
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
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1">Nombre Japonés</label>
              <input 
                type="text"
                value={formData.nombre_jap} 
                onChange={(e) => updateField('nombre_jap', e.target.value)} 
                placeholder="Ej: Konohagakure"
                className="w-full ninja-input py-4"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1">Abreviatura</label>
              <input 
                type="text"
                value={formData.abreviatura} 
                onChange={(e) => {
                  updateField('abreviatura', e.target.value);
                  if (!formData.slug) updateField('slug', e.target.value.toLowerCase().trim().replace(/\s+/g, '-'));
                }} 
                placeholder="Ej: Konoha"
                className="w-full ninja-input py-4"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1">Slug (URL)</label>
              <input 
                type="text"
                value={formData.slug} 
                onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                placeholder="ej-konoha"
                className="w-full ninja-input py-4"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1">Nombre en Español</label>
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
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1">Nombre Completo</label>
              <input 
                type="text"
                value={formData.nombre_completo} 
                onChange={(e) => updateField('nombre_completo', e.target.value)} 
                placeholder="Ej: Konohagakure no Sato"
                className="w-full ninja-input py-4"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1">URL Imagen / Banner</label>
              <input 
                type="text"
                value={formData.url_imagen} 
                onChange={(e) => updateField('url_imagen', e.target.value)} 
                placeholder="https://..."
                className="w-full ninja-input py-4"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-oro/40 ml-1 flex items-center gap-2">
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
              className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-oro/40 hover:text-oro transition-all italic"
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
