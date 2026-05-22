'use client';

import React, { useState } from 'react';
import { X, Calendar, User } from 'lucide-react';
import NinjaCard from '@/components/ui/NinjaCard';

interface NewsItem {
  id?: string;
  discord_msg_id: string;
  titulo: string;
  categoria: string;
  url_imagen?: string;
  content: string;
  timestamp: string;
}

interface NewsGridProps {
  newsList: NewsItem[];
}

export default function NewsGrid({ newsList }: NewsGridProps) {
  const [activeNews, setActiveNews] = useState<NewsItem | null>(null);

  // Helper to remove markdown bold markers for the card preview description
  const getCleanSnippet = (content: string) => {
    return content
      .replace(/\*\*/g, '')
      .replace(/\n+/g, ' ')
      .trim();
  };

  const formatDate = (isoString: string) => {
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
        {newsList.map((news) => (
          <NinjaCard
            key={news.discord_msg_id}
            onClick={() => setActiveNews(news)}
            title={news.titulo}
            titleClassName="text-xl sm:text-2xl md:text-3xl line-clamp-2"
            category={news.categoria || 'NOTICIA'}
            imageUrl={news.url_imagen}
            description={getCleanSnippet(news.content)}
            actionText="Leer Noticia"
            footerRight={
              <span className="text-oro/40 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                {formatDate(news.timestamp)}
              </span>
            }
          />
        ))}
      </div>

      {/* Modal Inmersivo */}
      {activeNews && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveNews(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[85vh] overflow-hidden ninja-card-oro flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal con Imagen */}
            <div className="h-48 sm:h-64 relative overflow-hidden border-b border-oro/20 bg-black flex-shrink-0">
              {activeNews.url_imagen ? (
                <img
                  src={activeNews.url_imagen}
                  alt=""
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-oro/5" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050309] via-[#050309]/30 to-transparent" />
              
              {/* Botón de Cerrar Flotante */}
              <button
                onClick={() => setActiveNews(null)}
                className="absolute top-6 right-6 w-12 h-12 bg-black/80 hover:bg-rojo-sangre border border-oro/20 hover:border-oro/60 text-oro hover:text-white flex items-center justify-center transition-all cursor-pointer z-50 rounded-none shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-8 left-8 right-8 z-10">
                <span className="px-4 py-1.5 text-xs font-black bg-rojo-sangre text-oro uppercase tracking-[0.3em] inline-block mb-3" style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
                  {activeNews.categoria || 'Noticia'}
                </span>
                <h2 className="ninja-title text-2xl sm:text-4xl md:text-5xl leading-tight uppercase font-ninja">
                  {activeNews.titulo}
                </h2>
              </div>
            </div>

            {/* Contenido en Scroll */}
            <div className="p-8 sm:p-12 overflow-y-auto flex-1 custom-scrollbar bg-[#050309]/95">
              <div className="flex items-center gap-6 mb-8 text-oro/60 text-xs sm:text-sm font-bold uppercase tracking-wider border-b border-oro/5 pb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-oro" />
                  <span>{formatDate(activeNews.timestamp)}</span>
                </div>
                <div className="w-1.5 h-1.5 bg-oro/40 rotate-45" />
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-oro" />
                  <span>Muro de Anuncios</span>
                </div>
              </div>

              <div className="prose prose-invert max-w-none text-gris-texto text-base sm:text-lg md:text-xl leading-relaxed whitespace-pre-wrap">
                {activeNews.content.split('\n').map((line: string, i: number) => (
                  <p key={i} className="mb-6 last:mb-0">
                    {line.split(/(\*\*.*?\*\*)/g).map((part, index) =>
                      part.startsWith('**') && part.endsWith('**') ? (
                        <strong key={index} className="text-oro font-black">
                          {part.slice(2, -2)}
                        </strong>
                      ) : (
                        part
                      )
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
