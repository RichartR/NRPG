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
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 xl:p-12 overflow-y-auto">
      <div className="bg-black/60 ninja-box ninja-border w-full max-w-4xl shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden my-auto backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
        
        <header className="bg-black/40 p-6 sm:p-10 xl:p-12 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-oro/10">
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rojo-sangre/10 border border-rojo-sangre/20 flex items-center justify-center shrink-0" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)' }}>
               <PlusCircle className="w-8 h-8 sm:w-10 sm:h-10 text-rojo-sangre" />
            </div>
            <div>
              <h2 className="ninja-title text-xl sm:text-3xl xl:text-5xl leading-none">
                {isCreate ? 'REGISTRO TÁCTICO' : 'ACTUALIZAR REGISTRO'}
              </h2>
              <p className="text-[8px] sm:text-[10px] xl:text-xs font-black text-oro/30 uppercase tracking-[0.4em] mt-3 italic">MÓDULO DE GESTIÓN DE ARCHIVOS SHINOBI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <label className="flex items-center gap-4 cursor-pointer group bg-black/40 px-6 py-3 border border-oro/10" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
                {formData.activo ? 'DESPLEGADO' : 'ENCRIPTADO'}
              </span>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={formData.activo} 
                onChange={e => setFormData({...formData, activo: e.target.checked})} 
              />
              <div className={`w-12 h-6 transition-all relative ${formData.activo ? 'bg-oro/10 border-oro/30' : 'bg-black/60 border-oro/5'} border`} style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                <div className={`absolute top-1 w-3 h-3 transition-all ${formData.activo ? 'right-1.5 bg-oro shadow-[0_0_10px_#CBA24B]' : 'left-1.5 bg-oro/10'}`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
              </div>
            </label>
            <button onClick={onCancel} className="p-3 text-oro/30 hover:text-oro transition-all hover:rotate-90">
              <X className="w-10 h-10" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="p-12 xl:p-16 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <DataField 
              label="TÍTULO DEL DOCUMENTO" 
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
              label="CATEGORÍA DE ACCESO" 
              value={formData.categoria} 
              options={categories.map(c => ({ label: c.nombre.toUpperCase(), value: c.slug }))} 
              onChange={v => setFormData({ ...formData, categoria: v })} 
            />
            <DataField 
              label="CLAVE (ID DE SISTEMA)" 
              value={formData.clave} 
              onChange={v => setFormData({ ...formData, clave: v.toLowerCase().replace(/\s+/g, '-') })} 
            />
            {showSubcategory && (
              <DataField label="SUBCATEGORÍA / PROTOCOLO" value={formData.subcategoria} onChange={v => setFormData({ ...formData, subcategoria: v })} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-10">
            <DataField label="ENLACE DE GOOGLE DRIVE (NUBE)" value={formData.url_drive} onChange={v => setFormData({ ...formData, url_drive: v })} placeholder="https://drive.google.com/..." />
            <DataField label="URL IMAGEN DE CABECERA (VISUAL)" value={formData.url_imagen} onChange={v => setFormData({ ...formData, url_imagen: v })} placeholder="https://i.imgur.com/..." />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] text-oro/30 ml-2">RESUMEN EJECUTIVO / NOTAS DE CAMPO</label>
            <textarea 
              rows={5}
              value={formData.descripcion || ''} 
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full bg-black/40 border border-oro/10 p-10 text-oro font-black outline-none focus:border-oro transition-all placeholder:text-oro/10 text-lg xl:text-xl italic uppercase tracking-tight"
              placeholder="ESCRIBE EL PROPÓSITO TÁCTICO DE ESTE ARCHIVO..."
              style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
            />
          </div>

          <footer className="flex justify-end items-center gap-12 pt-12 border-t border-oro/10">
            <button type="button" onClick={onCancel} className="text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] text-oro/20 hover:text-rojo-sangre transition-colors italic">ABORTAR OPERACIÓN</button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-oro text-rojo-sangre px-16 py-6 font-black text-xs xl:text-sm uppercase tracking-[0.3em] flex items-center gap-6 transition-all shadow-2xl shadow-oro/10 active:scale-95 disabled:opacity-50 hover:brightness-110"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              {isCreate ? 'FINALIZAR REGISTRO' : 'CONFIRMAR CAMBIOS'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
