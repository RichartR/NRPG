'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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

  // Mobile detection for PDF viewer matching DocViewer
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    // Regex robusto para extraer ID de Google Drive/Docs
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    const fileId = match ? match[1] : null;

    if (isMobile && fileId) {
      const proxyPdfUrl = `/api/proxy-pdf?fileId=${fileId}`;
      return `/pdf-viewer.html?file=${encodeURIComponent(proxyPdfUrl)}`;
    }
    return convertDriveUrl(url);
  };

  // Scroll warning when mouse is over container instead of document iframe
  const [showScrollWarning, setShowScrollWarning] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  const handleModalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = modalBodyRef.current;
    if (!target) return;

    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    if (isAtBottom && e.deltaY > 0) {
      setShowScrollWarning(true);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      warningTimeoutRef.current = setTimeout(() => {
        setShowScrollWarning(false);
      }, 2500);
    }
  };

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

  // Auto-open target news/patch/event modal if ?id= parameter is present in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && newsList && newsList.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('id') || params.get('newsId');
      if (targetId) {
        const found = newsList.find(n => String(n.id) === String(targetId));
        if (found) {
          setActiveNews(found);
        }
      }
    }
  }, [newsList]);

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
                ? 'bg-oro text-naranja-naruto shadow-lg'
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
            actionText={`Ver ${news.categoria.toUpperCase()}`}
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
            className="w-full max-w-7xl 2xl:max-w-[1600px] h-[85vh] overflow-hidden ninja-card-oro p-[2px] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal con Imagen */}
            <div className="h-40 sm:h-52 md:h-60 relative overflow-hidden bg-black flex-shrink-0" style={{ clipPath: 'polygon(28px 0, 100% 0, 100% 100%, 0 100%, 0 28px)' }}>
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
                className="absolute top-6 right-6 w-12 h-12 bg-black/80 hover:bg-naranja-naruto border border-oro/20 hover:border-oro/60 text-oro hover:text-white flex items-center justify-center transition-all cursor-pointer z-50 rounded-none shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-8 left-8 right-8 z-10 flex flex-col items-start gap-1">
                <span className="px-4 py-1.5 text-xs font-black bg-naranja-naruto text-oro uppercase tracking-[0.3em] inline-block ninja-clip-sm">
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
            <div
              className={`overflow-y-auto flex-1 custom-scrollbar ${activeNews.discord_msg_id?.startsWith('http') && activeNews.categoria?.toLowerCase() !== 'evento' ? 'bg-[#050309] bg-cover bg-center p-0 overflow-hidden flex flex-col' : 'p-8 sm:p-12 bg-neutral-900'}`}
              style={activeNews.discord_msg_id?.startsWith('http') && activeNews.categoria?.toLowerCase() !== 'evento' ? { backgroundImage: "url('/assets/ui/bg-list.png')" } : undefined}
            >
              {loadingMsg ? (
                /* Spinner de Carga Premium */
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="w-10 h-10 text-oro animate-spin" />
                  <p className="text-caption font-black uppercase tracking-[0.4em] text-oro/40 italic">CONECTANDO CON DISCORD...</p>
                </div>
              ) : (
                <>
                  {activeNews.discord_msg_id?.startsWith('http') && activeNews.categoria?.toLowerCase() !== 'evento' ? (
                    /* Documento embebido para Noticias y Parches */
                    isMobile ? (
                      /* ── VISTA MÓVIL FULL-SCREEN ESTILO DOCVIEWER ── */
                      <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden">
                        {/* Cabecera Móvil estilo DocViewer */}
                        <div className="h-16 bg-black border-b border-oro/20 flex items-center justify-between px-4 shrink-0">
                          <button
                            onClick={() => setActiveNews(null)}
                            className="flex items-center gap-2 text-oro/60 hover:text-oro font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                          >
                            <div className="w-2 h-2 bg-naranja-naruto rotate-45" />
                            <span>VOLVER</span>
                          </button>
                          <h2 className="text-xs sm:text-sm font-black tracking-wider uppercase text-oro font-ninja truncate max-w-[50vw]">
                            {activeNews.titulo}
                          </h2>
                          <button
                            onClick={() => setActiveNews(null)}
                            className="p-2 text-oro/60 hover:text-oro active:scale-95 transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Visor PDF Móvil a Pantalla Completa */}
                        <div className="flex-1 w-full h-full bg-white relative">
                          {mounted && (
                            <iframe
                              src={getEmbedUrl(activeNews.discord_msg_id)}
                              className="w-full h-full border-none bg-white"
                              allow="autoplay"
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ── VISTA ESCRITORIO ENMARCADA EN HOJA ── */
                      <div
                        ref={modalBodyRef}
                        onWheel={handleModalWheel}
                        className="flex-1 w-full h-full overflow-y-auto custom-scrollbar bg-[#050309] bg-cover bg-center p-8 flex flex-col items-center justify-center relative"
                        style={{ backgroundImage: "url('/assets/ui/bg-list.png')" }}
                      >
                        <div
                          className="bg-[#ffe6ba] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden relative my-auto shrink-0 transition-all duration-300 w-[794px] h-[1120px]"
                          style={{
                            width: '794px',
                            maxWidth: '98vw',
                            height: '1120px',
                            maxHeight: 'calc(85vh - 220px)',
                          }}
                        >
                          {mounted && (
                            <div
                              className="absolute inset-0"
                              style={{
                                width: '950px',
                                height: 'calc(100% + 40px)',
                                left: '-70px',
                                top: '-20px',
                              }}
                            >
                              <iframe
                                src={getEmbedUrl(activeNews.discord_msg_id)}
                                className="w-full h-full border-none bg-[#ffe6ba]"
                                allow="autoplay"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    /* Renderizado de Markdown para Eventos */
                    <>

                      <div className="prose prose-invert max-w-none text-gris-texto text-base sm:text-lg md:text-xl leading-relaxed">
                        {renderDiscordMarkdown(
                          (loadedContent[activeNews.discord_msg_id]?.content || "Contenido no disponible.")
                            .replace(/\n*🔗\s*\*\*\[Ver (?:enlace|en la Web|Evento en la Web)\]\([^)]+\)\*\*/gi, '')
                            .trim()
                        )}
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
                                className="px-6 py-2.5 bg-naranja-naruto hover:brightness-125 text-oro font-black text-caption xl:text-xs uppercase tracking-widest transition-all shadow-md select-none self-start sm:self-auto"
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
            {showScrollWarning && (
              <div
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 bg-neutral-900 border border-oro/40 text-oro text-xs sm:text-sm font-black uppercase tracking-[0.15em] flex items-center gap-3 shadow-[0_0_30px_rgba(255,230,159,0.25)] animate-fade-in pointer-events-none"
                style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
              >
                <span className="text-naranja-naruto text-base">⚠️</span>
                <span>Coloca el ratón sobre el documento para seguir leyendo</span>
              </div>
            )}
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
