'use client';

import { useState } from 'react';
import { X, PlusCircle, RefreshCw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SelectField } from '@/components/ui/Fields';

interface NewsEditFormProps {
  newsItem?: any;
  onCancel: () => void;
}

export default function NewsEditForm({ newsItem, onCancel }: NewsEditFormProps) {
  const isCreate = !newsItem;
  const [formData, setFormData] = useState({
    activo: true,
    titulo: '',
    categoria: 'Noticia',
    discord_msg_id: '',
    url_imagen: '',
    descripcion: '',
    ...newsItem
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const titulo = formData.titulo?.trim();
    const categoria = formData.categoria;
    const discord_msg_id = formData.discord_msg_id?.trim();

    if (!titulo) {
      addToast("El título de la noticia es obligatorio", "error");
      setLoading(false);
      return;
    }
    if (!categoria) {
      addToast("La categoría es obligatoria", "error");
      setLoading(false);
      return;
    }
    if (!discord_msg_id) {
      addToast("El ID de mensaje de Discord es obligatorio", "error");
      setLoading(false);
      return;
    }

    try {
      const cleanData = {
        titulo,
        categoria,
        discord_msg_id,
        url_imagen: formData.url_imagen?.trim() || null,
        descripcion: formData.descripcion?.trim().slice(0, 100) || null,
        activo: formData.activo
      };

      await AdminService.saveNewsItem({
        id: newsItem?.id,
        ...cleanData
      });

      addToast(isCreate ? "Anuncio publicado con éxito" : "Anuncio actualizado con éxito", "success");
      router.refresh();
      onCancel();
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { label: 'NOTICIA', value: 'Noticia' },
    { label: 'PARCHE', value: 'Parche' },
    { label: 'EVENTO', value: 'Evento' }
  ];

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
                {isCreate ? 'PUBLICAR ANUNCIO' : 'ACTUALIZAR ANUNCIO'}
              </h2>
              <p className="text-caption sm:text-caption xl:text-xs font-black text-oro/30 uppercase tracking-[0.4em] mt-3 italic">Muro de Comunicaciones Shinobi</p>
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
            <div className="md:col-span-2">
              <DataField
                label="TÍTULO DE LA NOTICIA / ANUNCIO"
                value={formData.titulo}
                onChange={v => setFormData({ ...formData, titulo: v })}
                placeholder="Escribe un título descriptivo..."
              />
            </div>
            <SelectField
              label="CATEGORÍA DEL ANUNCIO"
              value={formData.categoria}
              options={categories}
              onChange={v => setFormData({ ...formData, categoria: v })}
            />
            <DataField
              label="ID MENSAJE DISCORD (REQUISITO TÁCTICO)"
              value={formData.discord_msg_id}
              onChange={v => setFormData({ ...formData, discord_msg_id: v })}
              placeholder="Ej. 123456789012345678"
            />
            <div className="md:col-span-2">
              <DataField
                label="URL IMAGEN DE CABECERA (OPCIONAL)"
                value={formData.url_imagen || ''}
                onChange={v => setFormData({ ...formData, url_imagen: v })}
                placeholder="https://i.imgur.com/... o /assets/images/..."
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex flex-col gap-2">
                <label className="text-caption sm:text-caption font-black uppercase tracking-[0.3em] text-oro/50">
                  DESCRIPCIÓN BREVE <span className="text-oro/30 ml-2">(OPCIONAL · MAX 100 CHARS)</span>
                </label>
                <div className="relative">
                  <textarea
                    maxLength={100}
                    rows={2}
                    value={formData.descripcion || ''}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Una frase corta que resume el anuncio..."
                    className="w-full bg-black/60 border border-oro/20 hover:border-oro/40 focus:border-oro/60 px-5 py-3 text-xs text-oro/90 font-bold outline-none transition-all placeholder:text-oro/20 uppercase tracking-wider resize-none"
                    style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
                  />
                  <span className={`absolute bottom-3 right-4 text-caption font-black tabular-nums tracking-widest transition-colors ${(formData.descripcion?.length || 0) >= 90 ? 'text-rojo-sangre' : 'text-oro/30'
                    }`}>
                    {formData.descripcion?.length || 0}/100
                  </span>
                </div>
              </div>
            </div>

          </div>

          <footer className="flex flex-col-reverse sm:flex-row justify-end items-center gap-6 sm:gap-12 pt-8 sm:pt-12 border-t border-oro/10">
            <button type="button" onClick={onCancel} className="text-caption sm:text-caption xl:text-xs font-black uppercase tracking-[0.4em] text-oro/40 hover:text-rojo-sangre transition-colors italic bg-transparent border-none outline-none cursor-pointer">CANCELAR</button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto ninja-btn-oro px-10 sm:px-16 py-4 sm:py-6 flex items-center justify-center gap-4 sm:gap-6 shadow-2xl active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-rojo-sangre" /> : <Save className="w-5 h-5 sm:w-6 sm:h-6 text-rojo-sangre" />}
              <span>{isCreate ? 'FINALIZAR PUBLICACIÓN' : 'CONFIRMAR CAMBIOS'}</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
