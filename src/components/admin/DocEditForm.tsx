'use client';

import { useState } from 'react';
import { Save, X, PlusCircle, RefreshCw } from 'lucide-react';
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

    const titulo = formData.titulo?.trim();
    const clave = formData.clave?.trim();
    const url_drive = formData.url_drive?.trim();

    if (!titulo) {
      addToast("El nombre del apartado es obligatorio", "error");
      setLoading(false);
      return;
    }
    if (!clave) {
      addToast("La clave es obligatoria", "error");
      setLoading(false);
      return;
    }
    if (!url_drive) {
      addToast("El enlace de Google Drive es obligatorio", "error");
      setLoading(false);
      return;
    }

    try {
      const cleanData = {
        titulo,
        clave,
        url_drive,
        categoria: formData.categoria,
        subcategoria: formData.subcategoria?.trim() || null,
        url_imagen: formData.url_imagen?.trim() || null,
        descripcion: formData.descripcion?.trim() || null,
        activo: formData.activo
      };

      await AdminService.saveDocument({
        id: doc?.id,
        ...cleanData
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
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 xl:p-12 overflow-y-auto">
      <div className="ninja-card-oro w-full max-w-4xl shadow-[0_0_100px_rgba(0,0,0,0.9)] my-8 sm:my-auto overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

        <header className="bg-black/40 p-4 sm:p-10 xl:p-12 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-oro/10 relative z-10">
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-8 w-full md:w-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rojo-sangre/10 border border-rojo-sangre/20 flex items-center justify-center shrink-0" style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)' }}>
              <PlusCircle className="w-8 h-8 sm:w-10 sm:h-10 text-rojo-sangre" />
            </div>
            <div>
              <h2 className="ninja-title text-xl sm:text-3xl xl:text-5xl leading-none">
                {isCreate ? 'REGISTRO TÁCTICO' : 'ACTUALIZAR REGISTRO'}
              </h2>
              <p className="text-caption sm:text-caption xl:text-xs font-black text-oro/30 uppercase tracking-[0.4em] mt-3 italic">MÓDULO DE GESTIÓN DE ARCHIVOS SHINOBI</p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-6 sm:gap-8 w-full md:w-auto">
            <label className="flex items-center gap-4 cursor-pointer group bg-black/40 px-4 sm:px-6 py-2.5 sm:py-3 border border-oro/10" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
              <span className={`text-caption sm:text-caption font-black uppercase tracking-widest ${formData.activo ? 'text-oro' : 'text-oro/20'}`}>
                {formData.activo ? 'ACTIVO' : 'ARCHIVADO'}
              </span>
              <input
                type="checkbox"
                className="hidden"
                checked={formData.activo}
                onChange={e => setFormData({ ...formData, activo: e.target.checked })}
              />
              <div className={`w-10 sm:w-12 h-5 sm:h-6 transition-all relative ${formData.activo ? 'bg-oro/10 border-oro/30' : 'bg-black/60 border-oro/5'} border`} style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                <div className={`absolute top-0.5 sm:top-1 w-2.5 sm:w-3 h-2.5 sm:h-3 transition-all ${formData.activo ? 'right-1 sm:right-1.5 bg-oro shadow-[0_0_10px_#CBA24B]' : 'left-1 sm:left-1.5 bg-oro/10'}`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
              </div>
            </label>
            <button onClick={onCancel} className="p-2 text-oro/30 hover:text-oro transition-all hover:rotate-90">
              <X className="w-8 h-8 sm:w-10 sm:h-10" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="p-5 sm:p-12 xl:p-16 space-y-8 sm:space-y-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
            <DataField
              label="NOMBRE DEL APARTADO"
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
              label="CATEGORÍA"
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

          <div className="grid grid-cols-1 gap-6 sm:gap-10">
            <DataField label="ENLACE DE GOOGLE DRIVE (NUBE)" value={formData.url_drive} onChange={v => setFormData({ ...formData, url_drive: v })} placeholder="https://drive.google.com/..." />
            <DataField label="URL IMAGEN DE CABECERA (VISUAL)" value={formData.url_imagen} onChange={v => setFormData({ ...formData, url_imagen: v })} placeholder="https://i.imgur.com/..." />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <label className="text-caption sm:text-caption xl:text-xs font-black uppercase tracking-[0.4em] text-oro/30">DESCRIPCIÓN CORTA</label>
              <span className="text-caption sm:text-caption xl:text-xs font-black tracking-widest text-oro/30">
                {(formData.descripcion || '').length} / 100
              </span>
            </div>
            <textarea
              rows={5}
              maxLength={100}
              value={formData.descripcion || ''}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              className="ninja-clip-md w-full bg-black/80 border border-oro/20 hover:border-oro/40 focus:border-oro/60 focus:bg-black/90 focus:shadow-[0_0_20px_rgba(255,230,159,0.1)] outline-none transition-all p-6 sm:p-10 text-oro font-black placeholder:text-oro/20 text-base sm:text-lg xl:text-xl italic uppercase tracking-tight"
              placeholder="ESCRIBE UNA PEQUEÑA DESCRIPCIÓN DE ESTE APARTADO..."
            />
          </div>

          <footer className="flex flex-col-reverse sm:flex-row justify-end items-center gap-6 sm:gap-12 pt-8 sm:pt-12 border-t border-oro/10">
            <button type="button" onClick={onCancel} className="text-caption sm:text-caption xl:text-xs font-black uppercase tracking-[0.4em] text-oro/40 hover:text-rojo-sangre transition-colors italic bg-transparent border-none outline-none cursor-pointer">CANCELAR</button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto ninja-btn-oro px-10 sm:px-16 py-4 sm:py-6 flex items-center justify-center gap-4 sm:gap-6 shadow-2xl active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-rojo-sangre" /> : <Save className="w-5 h-5 sm:w-6 sm:h-6 text-rojo-sangre" />}
              <span>{isCreate ? 'FINALIZAR REGISTRO' : 'CONFIRMAR CAMBIOS'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
