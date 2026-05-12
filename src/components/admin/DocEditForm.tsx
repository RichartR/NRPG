'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, X, Image as ImageIcon, Link as LinkIcon, Type, AlignLeft, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DocEditForm({ doc, categories, onCancel, defaultCategory, showSubcategory = true }: { doc?: any, categories: any[], onCancel: () => void, defaultCategory?: string, showSubcategory?: boolean }) {
  const isCreate = !doc;
  const [formData, setFormData] = useState(doc || {
    titulo: '',
    clave: '',
    url_drive: '',
    descripcion: '',
    categoria: defaultCategory || categories[0]?.slug || 'sistemas',
    subcategoria: doc?.subcategoria || '',
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
      titulo: formData.titulo,
      clave: formData.clave,
      url_drive: formData.url_drive,
      descripcion: formData.descripcion,
      categoria: formData.categoria,
      subcategoria: formData.subcategoria,
      url_imagen: formData.url_imagen,
      activo: formData.activo
    };

    const { error } = isCreate 
      ? await supabase.from('documentos_sistemas').insert([payload])
      : await supabase.from('documentos_sistemas').update(payload).eq('id', doc.id);

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
            <PlusCircle className="w-5 h-5 text-orange-500" />
            {isCreate ? 'Añadir Nuevo Documento' : 'Editar Documento'}
          </h2>
          <div className="flex items-center gap-4">
            {/* Toggle de Visibilidad */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className={`text-[10px] font-black uppercase tracking-widest ${formData.activo ? 'text-green-500' : 'text-zinc-500'}`}>
                {formData.activo ? 'PÚBLICO' : 'OCULTO'}
              </span>
              <input 
                type="checkbox" 
                checked={formData.activo} 
                onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                className="hidden"
              />
              <div className={`w-10 h-5 rounded-full transition-colors relative ${formData.activo ? 'bg-green-500/20 border-green-500/50' : 'bg-zinc-800 border-zinc-700'} border`}>
                <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${formData.activo ? 'right-1 bg-green-500' : 'left-1 bg-zinc-500'}`} />
              </div>
            </label>
            <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Título */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Type className="w-4 h-4" /> Título
              </label>
              <input 
                type="text" 
                value={formData.titulo || ''} 
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData, 
                    titulo: val,
                    clave: val.toLowerCase().trim().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]/g, '')
                  });
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all"
                required
              />
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Categoría</label>
              <select 
                value={formData.categoria} 
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            {/* Clave (Slug) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                Clave (Slug URL)
              </label>
              <input 
                type="text" 
                value={formData.clave || ''} 
                onChange={(e) => setFormData({...formData, clave: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all font-mono text-sm"
                required
              />
            </div>

            {/* Subcategoría */}
            {showSubcategory && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  Subcategoría (Opcional)
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: Konoha, Bukijutsu..."
                  value={formData.subcategoria || ''} 
                  onChange={(e) => setFormData({...formData, subcategoria: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all"
                />
              </div>
            )}
          </div>

          {/* Drive URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> URL de Google Drive
            </label>
            <input 
              type="url" 
              value={formData.url_drive || ''} 
              onChange={(e) => setFormData({...formData, url_drive: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all font-mono text-sm"
              required
            />
          </div>

          {/* Imagen URL */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> URL Imagen Portada (Imgur)
              </label>
              <input 
                type="text" 
                placeholder="https://i.imgur.com/..."
                value={formData.url_imagen || ''} 
                onChange={(e) => setFormData({...formData, url_imagen: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all font-mono text-sm"
              />
            </div>

            {/* Previsualización de Imagen */}
            {formData.url_imagen && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 group">
                <img 
                  src={formData.url_imagen} 
                  alt="Preview" 
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-950/80 px-3 py-1 rounded-full border border-zinc-800">
                    Previsualización
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Descripción Corta
            </label>
            <textarea 
              rows={3}
              value={formData.descripcion || ''} 
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-all"
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
              className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : <><Save className="w-5 h-5" /> Guardar Cambios</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
