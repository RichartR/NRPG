'use client';

import { useState, useEffect } from 'react';
import { X, PlusCircle, RefreshCw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SelectField } from '@/components/ui/Fields';
import { renderDiscordMarkdown } from '@/lib/discord/renderDiscordMarkdown';

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
  const [discordContent, setDiscordContent] = useState('');
  const [fetchingContent, setFetchingContent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  // Fetch Discord message content if editing an event
  useEffect(() => {
    if (!isCreate && formData.categoria === 'Evento' && formData.discord_msg_id) {
      setFetchingContent(true);
      fetch(`/api/discord/messages?messageId=${formData.discord_msg_id}&categoria=${formData.categoria}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.content) {
            setDiscordContent(data.content);
          }
        })
        .catch(err => console.error("Error fetching event message from Discord:", err))
        .finally(() => setFetchingContent(false));
    }
  }, [isCreate, formData.discord_msg_id, formData.categoria]);

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

    if (categoria === 'Evento') {
      if (!discordContent.trim()) {
        addToast("El contenido de Discord para el evento es obligatorio", "error");
        setLoading(false);
        return;
      }
      if (discordContent.length > 1800) {
        addToast("El contenido excede el límite de 1800 caracteres", "error");
        setLoading(false);
        return;
      }
    } else {
      if (!discord_msg_id) {
        addToast("El enlace del documento es obligatorio", "error");
        setLoading(false);
        return;
      }
      if (!discord_msg_id.startsWith('http')) {
        addToast("El enlace del documento debe ser una URL válida (comenzar con http/https)", "error");
        setLoading(false);
        return;
      }
    }

    try {
      const cleanData: any = {
        titulo,
        categoria,
        url_imagen: formData.url_imagen?.trim() || null,
        descripcion: formData.descripcion?.trim().slice(0, 100) || null,
        activo: formData.activo
      };

      if (categoria === 'Evento') {
        cleanData.discord_content = discordContent;
        if (!isCreate) {
          cleanData.discord_msg_id = formData.discord_msg_id;
        }
      } else {
        cleanData.discord_msg_id = discord_msg_id;
      }

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
      <div className="ninja-card-oro w-full max-w-5xl shadow-[0_0_100px_rgba(0,0,0,0.9)] my-8 sm:my-auto overflow-hidden relative">
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
                label="TÍTULO DE LA NOTICIA / ANUNCIO / EVENTO"
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

            {formData.categoria === 'Evento' ? (
              !isCreate && (
                <DataField
                  label="ID MENSAJE DISCORD (GENERADO AUTOMÁTICAMENTE)"
                  value={formData.discord_msg_id}
                  disabled={true}
                />
              )
            ) : (
              <DataField
                label="ENLACE DEL DOCUMENTO (URL)"
                value={formData.discord_msg_id}
                onChange={v => setFormData({ ...formData, discord_msg_id: v })}
                placeholder="Ej. https://drive.google.com/..."
              />
            )}

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
                  <span className={`absolute bottom-3 right-4 text-caption font-black tabular-nums tracking-widest transition-colors ${(formData.descripcion?.length || 0) >= 90 ? 'text-rojo-sangre' : 'text-oro/30'}`}>
                    {formData.descripcion?.length || 0}/100
                  </span>
                </div>
              </div>
            </div>

            {formData.categoria === 'Evento' && (
              <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-oro/10 pt-8 mt-4">
                {/* Markdown Editor */}
                <div className="flex flex-col gap-2">
                  <label className="text-caption sm:text-caption font-black uppercase tracking-[0.3em] text-oro/50">
                    CONTENIDO DEL EVENTO (MARKDOWN DE DISCORD)
                  </label>
                  
                  {/* Legend / Guide of MD formats */}
                  <div className="bg-black/30 border border-oro/10 p-3.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] text-oro/50 font-bold uppercase tracking-wider" style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
                    <div><span className="text-oro font-black">**Negrita**</span></div>
                    <div><span className="text-oro font-black">*Cursiva*</span></div>
                    <div><span className="text-oro font-black">__Subrayado__</span></div>
                    <div><span className="text-oro font-black">~~Tachado~~</span></div>
                    <div><span className="text-oro font-black">`Código`</span></div>
                    <div><span className="text-oro font-black">```Bloque Código```</span></div>
                    <div><span className="text-oro font-black">- Lista</span></div>
                    <div><span className="text-oro font-black"># H1 | ## H2</span></div>
                    <div><span className="text-oro font-black">&gt; Cita</span></div>
                    <div><span className="text-oro font-black">[Enlace](url)</span></div>
                  </div>

                  <div className="relative flex-1 min-h-[300px] flex flex-col">
                    {fetchingContent ? (
                      <div className="flex-1 bg-black/60 border border-oro/20 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-oro" />
                      </div>
                    ) : (
                      <>
                        <textarea
                          maxLength={1800}
                          value={discordContent}
                          onChange={e => setDiscordContent(e.target.value)}
                          placeholder="Escribe el cuerpo del evento utilizando markdown de Discord... **negrita**, *cursiva*, `código`, listados, etc."
                          className="w-full flex-1 bg-black/60 border border-oro/20 hover:border-oro/40 focus:border-oro/60 px-5 py-4 text-xs text-oro/90 font-bold outline-none transition-all placeholder:text-oro/20 resize-none min-h-[250px]"
                          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                        />
                        <div className={`flex justify-end mt-2 text-caption font-black uppercase tracking-widest tabular-nums transition-colors ${discordContent.length >= 1700 ? 'text-rojo-sangre' : discordContent.length >= 1500 ? 'text-oro/60' : 'text-oro/30'}`}>
                          {discordContent.length} / 1800
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Web Live Preview */}
                <div className="flex flex-col gap-2">
                  <label className="text-caption sm:text-caption font-black uppercase tracking-[0.3em] text-oro/50">
                    VISTA PREVIA EN LA WEB (REPLICACIÓN DE DISEÑO)
                  </label>
                  <div 
                    className="flex-1 ninja-card-oro w-full overflow-hidden flex flex-col relative shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-oro/10 min-h-[350px] max-h-[500px]"
                    style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
                  >
                    {/* Modal Header Replica */}
                    <div className="h-32 sm:h-40 relative overflow-hidden bg-black flex-shrink-0">
                      {formData.url_imagen ? (
                        <img
                          src={formData.url_imagen}
                          alt=""
                          className="w-full h-full object-cover object-center opacity-80"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-oro/5" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/50 to-transparent" />

                      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col items-start gap-0.5">
                        <span className="px-2.5 py-0.5 text-[9px] font-black bg-rojo-sangre text-oro uppercase tracking-[0.3em] inline-block" style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}>
                          {formData.categoria || 'Evento'}
                        </span>
                        <h2 className="block ninja-title text-base sm:text-lg leading-tight uppercase font-ninja truncate w-full">
                          {formData.titulo || 'SIN TÍTULO'}
                        </h2>
                      </div>
                    </div>

                    {/* Gold Divider */}
                    <div className="h-px bg-oro/20 flex-shrink-0" />

                    {/* Modal Body Replica */}
                    <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-neutral-900 custom-scrollbar">
                      <div className="prose prose-invert max-w-none text-gris-texto text-xs sm:text-sm leading-relaxed">
                        {discordContent.trim() ? renderDiscordMarkdown(discordContent) : <span className="text-oro/20 italic select-none">Escribe contenido para ver la vista previa...</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
