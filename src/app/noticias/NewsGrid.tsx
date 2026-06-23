'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Calendar, User, Search, RefreshCw, Gift } from 'lucide-react';
import NinjaCard from '@/components/ui/NinjaCard';
import { renderDiscordMarkdown } from '@/lib/discord/renderDiscordMarkdown';
import { useScrollLock } from '@/hooks/useScrollLock';
import { createClient } from '@/utils/supabase/client';
import RegistroCard from '@/components/registros/RegistroCard';
import EventRewardForm from '@/components/admin/EventRewardForm';
import { PaginationPageInput } from '@/components/ui/PaginationPageInput';
import { PaginationContainer } from '@/components/ui/PaginationContainer';
import { searchIncludes } from '@/lib/utils/search';
import { convertDriveUrl } from '@/lib/utils/driveConverter';

interface NewsItem {
  id?: string;
  discord_msg_id: string;
  titulo: string;
  categoria: string;
  url_imagen?: string;
  descripcion?: string;
}

interface NewsGridProps {
  newsList: NewsItem[];
  isAdmin?: boolean;
}

export default function NewsGrid({ newsList, isAdmin }: NewsGridProps) {
  // State for search and category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'noticia' | 'parche' | 'evento'>('todos');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // State for modal active news and lazy-loaded contents
  const [activeNews, setActiveNews] = useState<NewsItem | null>(null);

  // Prevent background scrolling when news modal is open
  useScrollLock(!!activeNews);
  const [loadedContent, setLoadedContent] = useState<Record<string, { content: string, timestamp: string }>>({});
  const [loadingMsg, setLoadingMsg] = useState(false);

  // States for Event Prizes
  const [eventRegistries, setEventRegistries] = useState<any[]>([]);
  const [loadingRegistries, setLoadingRegistries] = useState(false);
  const [isRewardFormOpen, setIsRewardFormOpen] = useState(false);
  const [editingRegistry, setEditingRegistry] = useState<any>(null);

  const fetchEventRegistries = async () => {
    if (!activeNews || activeNews.categoria?.toLowerCase() !== 'evento') return;
    setLoadingRegistries(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('reg_registros')
        .select(`
          *,
          autor: reg_characters!reg_registros_autor_id_fkey(nombre_ninja, url_img, profiles!user_id(username, url_avatar, url_img)),
          participantes: reg_registros_participantes!reg_registros_participantes_registro_id_fkey(
            *,
            personaje: reg_characters!reg_registros_participantes_personaje_id_fkey(nombre_ninja, url_img, profiles!user_id(username, url_avatar, url_img))
          )
        `)
        .eq('tipo', 'accion')
        .eq('subtipo', 'evento_premios')
        .order('fecha', { ascending: false });

      if (error) throw error;

      const filtered = (data || []).filter((reg: any) =>
        Number(reg.data?.evento_id) === Number(activeNews.id)
      );
      setEventRegistries(filtered);
    } catch (err) {
      console.error('Error fetching event registries:', err);
    } finally {
      setLoadingRegistries(false);
    }
  };

  useEffect(() => {
    fetchEventRegistries();
  }, [activeNews]);

  // Fetch discord message contents lazily when modal opens
  useEffect(() => {
    if (!activeNews) return;
    const msgId = activeNews.discord_msg_id;

    if (loadedContent[msgId]) return;

    const fetchContent = async () => {
      setLoadingMsg(true);
      try {
        const res = await fetch(`/api/discord/messages?messageId=${msgId}&categoria=${activeNews.categoria}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Mensaje de Discord no encontrado.");
        }
        const data = await res.json();
        setLoadedContent(prev => ({
          ...prev,
          [msgId]: {
            content: data.content || "Contenido no disponible.",
            timestamp: data.timestamp || new Date().toISOString()
          }
        }));
      } catch (err: any) {
        console.warn("[NewsGrid] Error al cargar anuncio de Discord:", err.message);
        setLoadedContent(prev => ({
          ...prev,
          [msgId]: {
            content: "Contenido no disponible (canal de Discord incorrecto, privado o mensaje inexistente).",
            timestamp: new Date().toISOString()
          }
        }));
      } finally {
        setLoadingMsg(false);
      }
    };

    fetchContent();
  }, [activeNews]);

  // Filters & Sorting in descending order (newest first)
  const filteredNews = useMemo(() => {
    return newsList
      .filter(item => {
        const matchesSearch = searchIncludes(item.titulo, searchQuery);
        const matchesCategory = selectedCategory === 'todos' || item.categoria?.toLowerCase() === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [newsList, searchQuery, selectedCategory]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Paginated news list
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const paginatedNews = useMemo(() => {
    return filteredNews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredNews, currentPage]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Fecha no disponible';
    try {
      return new Date(isoString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const categories: { label: string, value: typeof selectedCategory }[] = [
    { label: 'TODOS', value: 'todos' },
    { label: 'NOTICIAS', value: 'noticia' },
    { label: 'PARCHES', value: 'parche' },
    { label: 'EVENTOS', value: 'evento' }
  ];

  return (
    <>
      {/* Buscador y Toggles de Categoría */}
      <div className="flex flex-col xl:flex-row gap-8 justify-between items-stretch xl:items-center ninja-card-oro overflow-hidden p-6 sm:p-10 mb-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        {/* Buscador */}
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-oro/30" />
          <input
            type="text"
            placeholder="BUSCAR ANUNCIO POR TÍTULO..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-black/60 border border-oro/20 hover:border-oro/40 focus:border-oro/60 px-16 py-4 text-xs xl:text-sm text-oro font-black outline-none transition-all placeholder:text-oro/20 uppercase tracking-widest ninja-clip-xs focus:shadow-[0_0_20px_rgba(255,230,159,0.05)] focus:bg-black/80"
          />
        </div>

        {/* Toggles de Categoría */}
        <div className="flex flex-wrap gap-2.5 p-1.5 justify-center sm:justify-start">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-6 py-2.5 font-black uppercase tracking-[0.2em] transition-all text-caption sm:text-caption xl:text-xs select-none ${selectedCategory === cat.value
                ? 'bg-oro text-rojo-sangre shadow-lg'
                : 'bg-black/40 text-oro/40 hover:text-oro hover:bg-black/60 border border-oro/10'
                }`}
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Tarjetas (Sin descripción y cargadas de forma local) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
        {paginatedNews.map((news) => (
          <NinjaCard
            key={news.discord_msg_id}
            onClick={() => setActiveNews(news)}
            title={news.titulo}
            titleClassName="text-xl sm:text-2xl md:text-3xl line-clamp-2"
            category={news.categoria || 'NOTICIA'}
            imageUrl={news.url_imagen}
            description={news.descripcion || ''}
            actionText="Ver Anuncio"
          />
        ))}

        {filteredNews.length === 0 && (
          <div className="col-span-full text-center py-32 ninja-card-oro opacity-50">
            <p className="text-oro/40 font-black uppercase tracking-[0.3em] text-sm italic">SIN COMUNICADOS O EVENTOS</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <PaginationContainer className="mt-16" maxWidthClass="max-w-md">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            className="ninja-btn-oro px-8 py-3 disabled:opacity-30 disabled:scale-100 active:scale-95 text-caption sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            Anterior
          </button>
          <div className="flex items-center gap-1.5 min-w-[120px] justify-center">
            <PaginationPageInput
              currentPage={currentPage}
              totalPages={totalPages}
              onChangePage={setCurrentPage}
            />
            <span className="text-oro/40 font-black uppercase tracking-[0.2em] text-caption sm:text-xs">
              / {totalPages}
            </span>
          </div>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            className="ninja-btn-oro px-8 py-3 disabled:opacity-30 disabled:scale-100 active:scale-95 text-caption sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            Siguiente
          </button>
        </PaginationContainer>
      )}

      {/* Modal Inmersivo con Carga Perezosa */}
      {activeNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveNews(null)}
        >
          <div
            className="w-full max-w-4xl h-[85vh] overflow-hidden ninja-card-oro flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal con Imagen */}
            <div className="h-40 sm:h-52 md:h-60 relative overflow-hidden bg-black flex-shrink-0">
              {activeNews.url_imagen ? (
                <img
                  src={activeNews.url_imagen}
                  alt=""
                  className="w-full h-full object-cover object-center opacity-80"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-oro/5" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black via-black/50 to-transparent" />

              {/* Botón de Cerrar Flotante */}
              <button
                onClick={() => setActiveNews(null)}
                className="absolute top-6 right-6 w-12 h-12 bg-black/80 hover:bg-rojo-sangre border border-oro/20 hover:border-oro/60 text-oro hover:text-white flex items-center justify-center transition-all cursor-pointer z-50 rounded-none shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-8 left-8 right-8 z-10 flex flex-col items-start gap-1">
                <span className="px-4 py-1.5 text-xs font-black bg-rojo-sangre text-oro uppercase tracking-[0.3em] inline-block ninja-clip-sm">
                  {activeNews.categoria || 'Noticia'}
                </span>
                <h2 className="block ninja-title text-2xl sm:text-4xl md:text-5xl leading-tight uppercase font-ninja">
                  {activeNews.titulo}
                </h2>
              </div>
            </div>

            {/* Separador dorado independiente (no recortado por overflow-hidden) */}
            <div className="h-px bg-oro/20 flex-shrink-0" />

            {/* Contenido en Scroll / Iframe */}
            <div className={`overflow-y-auto flex-1 custom-scrollbar bg-[#ffe6ba] ${activeNews.discord_msg_id?.startsWith('http') ? 'p-0 overflow-hidden flex flex-col' : 'p-8 sm:p-12 bg-neutral-900'}`}>
              {loadingMsg ? (
                /* Spinner de Carga Premium */
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="w-10 h-10 text-oro animate-spin" />
                  <p className="text-caption font-black uppercase tracking-[0.4em] text-oro/40 italic">CONECTANDO CON DISCORD...</p>
                </div>
              ) : (
                <>
                  {activeNews.discord_msg_id?.startsWith('http') ? (
                    /* Documento embebido para Noticias y Parches */
                    <div className="flex-1 w-full h-full relative bg-[#ffe6ba] flex flex-col">
                      <iframe
                        src={convertDriveUrl(activeNews.discord_msg_id)}
                        className="w-full h-full flex-1 border-none min-h-[450px]"
                        style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          left: '0',
                          top: '-50px', // Oculta la barra de herramientas superior de Google
                          transform: 'scale(1.15)', // Magnifica el documento para que los márgenes queden fuera de la pantalla
                          transformOrigin: 'center top'
                        }}
                        allow="autoplay"
                      />
                    </div>
                  ) : (
                    /* Renderizado de Markdown para Eventos */
                    <>
                      <div className="flex items-center gap-6 mb-8 text-oro/60 text-xs sm:text-sm font-bold uppercase tracking-wider border-b border-oro/5 pb-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-oro" />
                          <span>{formatDate(loadedContent[activeNews.discord_msg_id]?.timestamp)}</span>
                        </div>
                      </div>

                      <div className="prose prose-invert max-w-none text-gris-texto text-base sm:text-lg md:text-xl leading-relaxed">
                        {renderDiscordMarkdown(loadedContent[activeNews.discord_msg_id]?.content || "Contenido no disponible.")}
                      </div>

                      {activeNews.categoria?.toLowerCase() === 'evento' && (
                        <div className="mt-12 pt-8 border-t border-oro/10 space-y-8">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-black text-oro uppercase tracking-wider flex items-center gap-2">
                                PREMIOS OTORGADOS
                              </h3>
                              <p className="text-[11px] font-bold text-oro/40 uppercase tracking-widest mt-1">Historial de repartos de este evento</p>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setEditingRegistry(null);
                                  setIsRewardFormOpen(true);
                                }}
                                className="px-6 py-2.5 bg-rojo-sangre hover:brightness-125 text-oro font-black text-caption xl:text-xs uppercase tracking-widest transition-all shadow-md select-none self-start sm:self-auto"
                                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                              >
                                Repartir Premios
                              </button>
                            )}
                          </div>

                          {loadingRegistries ? (
                            <div className="flex justify-center items-center py-10 gap-2">
                              <RefreshCw className="w-5 h-5 text-oro animate-spin" />
                              <span className="text-caption font-black uppercase tracking-widest text-oro/40">Cargando registros...</span>
                            </div>
                          ) : eventRegistries.length === 0 ? (
                            <div className="p-8 text-center bg-black/20 border border-oro/5">
                              <p className="text-caption font-black uppercase tracking-widest text-oro/30 italic">No se han repartido premios en este evento todavía</p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {eventRegistries.map((reg) => (
                                <RegistroCard
                                  key={reg.id}
                                  registro={reg}
                                  isAdmin={isAdmin}
                                  onRefresh={fetchEventRegistries}
                                  onEdit={(r) => {
                                    setEditingRegistry(r);
                                    setIsRewardFormOpen(true);
                                  }}
                                  isGlobalView={true}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {(isRewardFormOpen || editingRegistry) && activeNews && (
        <EventRewardForm
          activeNews={activeNews}
          editingRegistry={editingRegistry}
          onClose={() => {
            setIsRewardFormOpen(false);
            setEditingRegistry(null);
            fetchEventRegistries();
          }}
        />
      )}
    </>
  );
}
