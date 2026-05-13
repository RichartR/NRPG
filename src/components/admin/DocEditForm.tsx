'use client';

import { useState } from 'react';
import { Save, X, Image as ImageIcon, Link as LinkIcon, Type, AlignLeft, PlusCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SelectField } from '@/components/ui/Fields';

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
  const addToast = useToastStore(state => state.addToast);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await AdminService.saveDocument({
        id: doc?.id,
        ...formData
      });
      addToast(isCreate ? "Documento creado" : "Documento actualizado", "success");
      router.refresh();
      onCancel();
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-900 w-full max-w-3xl rounded-[3rem] overflow-hidden shadow-2xl my-auto">
        <header className="bg-zinc-900/50 p-10 flex justify-between items-center border-b border-zinc-900">
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
              <PlusCircle className="w-6 h-6 text-orange-500" />
              {isCreate ? 'Registro Táctico' : 'Actualizar Registro'}
            </h2>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mt-2 ml-10">Módulo de gestión de archivos</p>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer group bg-black/50 px-6 py-3 rounded-2xl border border-zinc-900">
              <span className={`text-[10px] font-black uppercase tracking-widest ${formData.activo ? 'text-orange-500' : 'text-zinc-700'}`}>
                {formData.activo ? 'DESPLEGADO' : 'ENCRIPTADO'}
              </span>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={formData.activo} 
                onChange={e => setFormData({...formData, activo: e.target.checked})} 
              />
              <div className={`w-10 h-5 rounded-full transition-all relative ${formData.activo ? 'bg-orange-600/20 border-orange-600/50' : 'bg-zinc-900 border-zinc-800'} border`}>
                <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${formData.activo ? 'right-1.5 bg-orange-500' : 'left-1.5 bg-zinc-700'}`} />
              </div>
            </label>
            <button onClick={onCancel} className="p-2 text-zinc-600 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DataField 
              label="Título del Documento" 
              value={formData.titulo} 
              onChange={v => {
                setFormData({
                  ...formData, 
                  titulo: v,
                  clave: v.toLowerCase().trim().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]/g, '')
                });
              }} 
            />
            <SelectField 
              label="Categoría" 
              value={formData.categoria} 
              options={categories.map(c => ({ label: c.nombre, value: c.slug }))} 
              onChange={v => setFormData({ ...formData, categoria: v })} 
            />
            <DataField 
              label="Clave (ID de Sistema)" 
              value={formData.clave} 
              onChange={v => setFormData({ ...formData, clave: v.toLowerCase().replace(/\s+/g, '-') })} 
            />
            {showSubcategory && (
              <DataField label="Subcategoría / Etiqueta" value={formData.subcategoria} onChange={v => setFormData({ ...formData, subcategoria: v })} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-8">
            <DataField label="Enlace de Google Drive (Acceso Directo)" value={formData.url_drive} onChange={v => setFormData({ ...formData, url_drive: v })} placeholder="https://drive.google.com/..." />
            <DataField label="URL Imagen de Cabecera" value={formData.url_imagen} onChange={v => setFormData({ ...formData, url_imagen: v })} placeholder="https://i.imgur.com/..." />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Resumen Ejecutivo</label>
            <textarea 
              rows={4}
              value={formData.descripcion || ''} 
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 text-white font-bold outline-none focus:border-orange-500 transition-all placeholder:text-zinc-800"
              placeholder="Escribe una breve descripción del propósito de este documento..."
            />
          </div>

          <footer className="flex justify-end items-center gap-8 pt-10 border-t border-zinc-900">
            <button type="button" onClick={onCancel} className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">Abortar Operación</button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-white text-black px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-4 transition-all shadow-2xl shadow-white/5 active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isCreate ? 'Finalizar Registro' : 'Confirmar Cambios'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
