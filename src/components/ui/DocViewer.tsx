'use client';

import { useState } from 'react';
import { convertDriveUrl, getDownloadUrl } from '@/lib/utils/driveConverter';
import { Loader2, ArrowLeft, Download, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';

interface DocViewerProps {
  title: string;
  url: string;
  backUrl?: string;
}

export default function DocViewer({ title, url, backUrl = "/bienvenida" }: DocViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const embedUrl = convertDriveUrl(url);
  const downloadUrl = getDownloadUrl(url);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.6));

  // Tus medidas "clavadas"
  const baseWidth = 793;
  const baseHeight = 1080;
  const iframeWidth = 880;
  const leftAdjustedOffset = ((iframeWidth - baseWidth) / 2) - 7;
  const topOffset = 20;

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <header className={`h-20 xl:h-28 flex items-center justify-between px-6 xl:px-12 shrink-0 z-50 border-b border-oro/10 relative transition-all duration-1000 ${loading ? 'bg-black' : 'bg-black/80 backdrop-blur-xl'}`}>
        {/* Lado Izquierdo: Volver y Título */}
        <div className="flex items-center gap-6 xl:gap-10 min-w-0 flex-1">
          <Link 
            href={backUrl}
            className="flex items-center gap-3 px-4 py-2 font-black text-[10px] xl:text-sm uppercase tracking-[0.2em] transition-all active:scale-95 text-oro/60 hover:text-oro group shrink-0"
          >
            <div className="w-2 xl:w-2.5 h-2 xl:h-2.5 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
            <span>VOLVER</span>
          </Link>
          <div className="h-8 w-px bg-oro/10 shrink-0 hidden sm:block" />
          <h1 className="text-lg xl:text-2xl font-black tracking-[0.1em] uppercase text-oro font-ninja truncate max-w-[40vw] pt-1">
            {title}
          </h1>
        </div>

        {/* Lado Derecho: Zoom y Descarga */}
        <div className="flex items-center gap-6 xl:gap-10 shrink-0">
          <div className="flex items-center gap-2 p-1.5 bg-black/60 border border-oro/10 ninja-box shadow-2xl">
            <button onClick={handleZoomOut} className="p-2.5 hover:bg-rojo-sangre/20 transition-all text-oro/40 hover:text-oro">
              <div className="w-3 h-0.5 bg-current" />
            </button>
            <div className="text-[9px] xl:text-xs font-black w-12 text-center select-none text-oro/80 tabular-nums">
              {Math.round(zoom * 100)}%
            </div>
            <button onClick={handleZoomIn} className="p-2.5 hover:bg-rojo-sangre/20 transition-all text-oro/40 hover:text-oro">
              <div className="relative w-3 h-3 flex items-center justify-center">
                <div className="absolute w-3 h-0.5 bg-current" />
                <div className="absolute w-0.5 h-3 bg-current" />
              </div>
            </button>
          </div>

          <a 
            href={downloadUrl} 
            download 
            className="hidden md:flex items-center gap-4 px-8 py-3.5 bg-oro text-rojo-sangre font-black text-[10px] xl:text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(255,230,159,0.2)] active:scale-95 hover:brightness-110"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            DESCARGAR PDF
          </a>
        </div>
      </header>

      {/* Visor de Documento - Zoom por Escala (Magnificación Real) */}
      <main className={`flex-1 overflow-auto custom-scrollbar transition-colors duration-1000 ${loading ? 'bg-black' : 'bg-transparent'}`}>
        <div 
          className="py-12 xl:py-20 flex flex-col items-center min-h-full"
          style={{ 
            width: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          }}
        >
          <div 
            className="bg-white shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden relative"
            style={{ 
              width: `${baseWidth}px`, 
              height: `${baseHeight}px`,
              maxWidth: '98vw',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              WebkitFontSmoothing: 'antialiased'
            }}
          >
            {embedUrl ? (
              <div 
                className="absolute"
                style={{ 
                  width: `${iframeWidth}px`,
                  height: `calc(100% + ${topOffset}px)`,
                  left: `-${leftAdjustedOffset}px`,
                  top: `-${topOffset}px`
                }}
              >
                <iframe
                  src={embedUrl}
                  onLoad={() => setLoading(false)}
                  className="w-full h-full border-none"
                  allow="autoplay"
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center py-60">
                <div className="w-12 h-12 border-4 border-oro border-t-transparent animate-spin" />
              </div>
            )}
            
            {loading && (
               <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
                  <div className="w-12 h-12 border-4 border-oro border-t-transparent animate-spin" />
               </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #CBA24B;
          border: 4px solid #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #EED195;
        }
      `}</style>
    </div>

  );
}
