'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Calendar, User, Search, RefreshCw } from 'lucide-react';
import NinjaCard from '@/components/ui/NinjaCard';
import { renderDiscordMarkdown } from '@/lib/discord/renderDiscordMarkdown';

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
}

export default function NewsGrid({ newsList }: NewsGridProps) {
  // State for search and category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'noticia' | 'parche' | 'evento'>('todos');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // State for modal active news and lazy-loaded contents
  const [activeNews, setActiveNews] = useState<NewsItem | null>(null);
  const [loadedContent, setLoadedContent] = useState<Record<string, { content: string, timestamp: string }>>({});
  const [loadingMsg, setLoadingMsg] = useState(false);

  // Fetch discord message contents lazily when modal opens
  useEffect(() => {
    if (!activeNews) return;
    const msgId = activeNews.discord_msg_id;

    // Skip fetching mock or already loaded items
    if (msgId === '1' || msgId === '2') {
      setLoadedContent(prev => ({
        ...prev,
        [msgId]: {
          content: msgId === '1'
            ? "**NOTICIA:** ¡Bienvenidos al nuevo servidor de NRPG! Revisa las secciones para ver las reglas, mapas, sistemas y crear tu primer personaje shinobi."
            : "**PARCHE:** Ajustes generales de equilibrio, balance de Taijutsu y optimizaciones en la calculadora de combate.",
          timestamp: new Date().toISOString()
        }
      }));
      return;
    }

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
        const matchesSearch = item.titulo.toLowerCase().includes(searchQuery.toLowerCase());
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
      <div className="flex flex-col xl:flex-row gap-8 justify-between items-stretch xl:items-center ninja-card-oro p-6 sm:p-10 mb-12">
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
              className={`px-6 py-2.5 font-black uppercase tracking-[0.2em] transition-all text-[9px] sm:text-[10px] xl:text-xs select-none ${selectedCategory === cat.value
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
            <p className="text-oro/40 font-black uppercase tracking-[0.3em] text-sm italic">SISTEMA SIN COMUNICADOS COMPATIBLES</p>
          </div>
        )}
      </div>

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-8 mt-16 pb-12">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            className="ninja-btn-oro px-8 py-3 disabled:opacity-30 disabled:scale-100 active:scale-95 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            Anterior
          </button>
          <span className="text-oro/70 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs">
            PÁGINA {currentPage} DE {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            className="ninja-btn-oro px-8 py-3 disabled:opacity-30 disabled:scale-100 active:scale-95 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal Inmersivo con Carga Perezosa */}
      {activeNews && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveNews(null)}
        >
          <div
            className="w-full max-w-4xl h-[85vh] sm:h-auto max-h-[85vh] overflow-hidden ninja-card-oro flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal con Imagen */}
            <div className="h-64 sm:h-80 md:h-96 relative overflow-hidden bg-black flex-shrink-0">
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
              <div className="absolute inset-0 bg-gradient-to-t from-black via-[#050309]/60 to-transparent" />

              {/* Botón de Cerrar Flotante */}
              <button
                onClick={() => setActiveNews(null)}
                className="absolute top-6 right-6 w-12 h-12 bg-black/80 hover:bg-rojo-sangre border border-oro/20 hover:border-oro/60 text-oro hover:text-white flex items-center justify-center transition-all cursor-pointer z-50 rounded-none shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-8 left-8 right-8 z-10 flex flex-col items-start gap-1">
                <span className="px-4 py-1.5 text-xs font-black bg-rojo-sangre text-oro uppercase tracking-[0.3em] inline-block" style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
                  {activeNews.categoria || 'Noticia'}
                </span>
                <h2 className="block ninja-title text-2xl sm:text-4xl md:text-5xl leading-tight uppercase font-ninja">
                  {activeNews.titulo}
                </h2>
              </div>
            </div>

            {/* Separador dorado independiente (no recortado por overflow-hidden) */}
            <div className="h-px bg-oro/20 flex-shrink-0" />

            {/* Contenido en Scroll (Con Lazy Load) */}
            <div className="p-8 sm:p-12 overflow-y-auto flex-1 custom-scrollbar bg-[#050309]">
              {loadingMsg ? (
                /* Spinner de Carga Premium */
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="w-10 h-10 text-oro animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-oro/40 italic">CONECTANDO CON DISCORD...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-6 mb-8 text-oro/60 text-xs sm:text-sm font-bold uppercase tracking-wider border-b border-oro/5 pb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-oro" />
                      <span>{formatDate(loadedContent[activeNews.discord_msg_id]?.timestamp)}</span>
                    </div>
                    <div className="w-1.5 h-1.5 bg-oro/40 rotate-45" />
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-oro" />
                      <span>Muro de Anuncios</span>
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none text-gris-texto text-base sm:text-lg md:text-xl leading-relaxed">
                    {renderDiscordMarkdown(loadedContent[activeNews.discord_msg_id]?.content || "Contenido no disponible.")}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
