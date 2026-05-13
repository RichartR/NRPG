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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="bg-zinc-900/50 p-8 flex justify-between items-center border-b border-zinc-800">
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
              <MapPin className="w-6 h-6 text-emerald-500" />
              {isCreate ? 'Añadir Nueva Aldea' : 'Editar Aldea'}
            </h2>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Configuración de núcleo geográfico</p>
          </div>
          
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer group bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-emerald-500' : 'text-zinc-500'}`}>
                {formData.activo ? 'ACTIVA' : 'INACTIVA'}
              </span>
              <input 
                type="checkbox" 
                checked={formData.activo} 
                onChange={(e) => updateField('activo', e.target.checked)}
                className="hidden"
              />
              <div className={`w-10 h-5 rounded-full transition-all relative ${formData.activo ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-zinc-800 border-zinc-700'} border`}>
                <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${formData.activo ? 'right-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'left-1 bg-zinc-500'}`} />
              </div>
            </label>
            <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-xl transition-all">
              <X className="w-6 h-6 text-zinc-500" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DataField 
              label="Nombre Japonés" 
              value={formData.nombre_jap} 
              onChange={(v) => updateField('nombre_jap', v)} 
              placeholder="Ej: Konohagakure"
            />
            <DataField 
              label="Abreviatura" 
              value={formData.abreviatura} 
              onChange={(v) => {
                updateField('abreviatura', v);
                if (!formData.slug) updateField('slug', v.toLowerCase().trim().replace(/\s+/g, '-'));
              }} 
              placeholder="Ej: Konoha"
            />
            <DataField 
              label="Slug (URL)" 
              value={formData.slug} 
              onChange={(v) => updateField('slug', v.toLowerCase().replace(/\s+/g, '-'))} 
              placeholder="ej-konoha"
            />
            <DataField 
              label="Nombre en Español" 
              value={formData.nombre_español} 
              onChange={(v) => updateField('nombre_español', v)} 
              placeholder="Ej: Aldea Oculta de la Hoja"
            />
          </div>

          <div className="grid grid-cols-1 gap-8">
            <DataField 
              label="Nombre Completo" 
              value={formData.nombre_completo} 
              onChange={(v) => updateField('nombre_completo', v)} 
              placeholder="Ej: Konohagakure no Sato"
            />
            <DataField 
              label="URL Imagen / Banner" 
              value={formData.url_imagen} 
              onChange={(v) => updateField('url_imagen', v)} 
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1 flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Descripción Histórica
            </label>
            <textarea 
              rows={4}
              value={formData.descripcion || ''} 
              onChange={(e) => updateField('descripcion', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white font-bold outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-700"
              placeholder="Escribe el lore de esta aldea..."
            />
          </div>

          <div className="flex justify-end gap-6 pt-6 border-t border-zinc-900">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-8 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-black px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Aldea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
