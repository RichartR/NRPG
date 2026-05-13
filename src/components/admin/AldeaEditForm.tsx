'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, X, Image as ImageIcon, MapPin, Type, AlignLeft, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AldeaEditForm({ aldea, onCancel }: { aldea?: any, onCancel: () => void }) {
  const isCreate = !aldea;
  const [formData, setFormData] = useState(aldea || {
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
  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      nombre_jap: formData.nombre_jap,
      abreviatura: formData.abreviatura,
      slug: formData.slug || formData.abreviatura.toLowerCase().replace(/\s+/g, '-'),
      nombre_español: formData.nombre_español,
      nombre_completo: formData.nombre_completo,
      descripcion: formData.descripcion,
      url_imagen: formData.url_imagen,
      activo: formData.activo
    };

    const { error } = isCreate 
      ? await supabase.from('aldeas').insert([payload])
      : await supabase.from('aldeas').update(payload).eq('id', aldea.id);

    if (!error) {
      router.refresh();
      onCancel();
    } else {
      alert("Error al guardar: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">
        <header className="bg-zinc-800/50 p-6 flex justify-between items-center border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            {isCreate ? 'Añadir Nueva Aldea' : 'Editar Aldea'}
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className={`text-[10px] font-black uppercase tracking-widest ${formData.activo ? 'text-emerald-500' : 'text-zinc-500'}`}>
                {formData.activo ? 'ACTIVA' : 'INACTIVA'}
              </span>
              <input 
                type="checkbox" 
                checked={formData.activo} 
                onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                className="hidden"
              />
              <div className={`w-10 h-5 rounded-full transition-colors relative ${formData.activo ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-zinc-800 border-zinc-700'} border`}>
                <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${formData.activo ? 'right-1 bg-emerald-500' : 'left-1 bg-zinc-500'}`} />
              </div>
            </label>
            <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre Japonés */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Type className="w-4 h-4" /> Nombre Japonés
              </label>
              <input 
                type="text" 
                value={formData.nombre_jap} 
                onChange={(e) => setFormData({...formData, nombre_jap: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all"
                required
                placeholder="Ej: Konohagakure"
              />
            </div>

            {/* Abreviatura */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Abreviatura</label>
              <input 
                type="text" 
                value={formData.abreviatura} 
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData, 
                    abreviatura: val,
                    slug: val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                  });
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all"
                required
                placeholder="Ej: Konoha"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Slug (URL)</label>
              <input 
                type="text" 
                value={formData.slug} 
                onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                required
                placeholder="ej-konoha"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre Español */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nombre en Español</label>
              <input 
                type="text" 
                value={formData.nombre_español || ''} 
                onChange={(e) => setFormData({...formData, nombre_español: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all"
                required
                placeholder="Ej: Aldea Oculta de la Hoja"
              />
            </div>

            {/* Nombre Completo */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nombre Completo</label>
              <input 
                type="text" 
                value={formData.nombre_completo || ''} 
                onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all"
                required
                placeholder="Ej: Konohagakure no Sato"
              />
            </div>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> URL Banner / Imagen
              </label>
              <input 
                type="text" 
                value={formData.url_imagen || ''} 
                onChange={(e) => setFormData({...formData, url_imagen: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all font-mono text-sm"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Descripción Histórica
            </label>
            <textarea 
              rows={3}
              value={formData.descripcion || ''} 
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-6 py-3 text-sm font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : <><Save className="w-5 h-5" /> Guardar Aldea</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
