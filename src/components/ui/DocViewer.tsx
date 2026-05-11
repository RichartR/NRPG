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
    <div className="min-h-screen flex flex-col overflow-hidden bg-[#050505]">
      <header className="h-20 flex items-center justify-between px-8 shrink-0 z-50 bg-[#0a0a0a] border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
          <Link 
            href={backUrl}
            className="flex items-center gap-3 px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-[0.15em] transition-all active:scale-95 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>VOLVER</span>
          </Link>
          <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />
          <h1 className="text-xl font-black tracking-tighter uppercase text-white">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1 p-1 rounded-2xl border bg-black/40 border-white/10 shadow-inner">
            <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-xl transition-all text-zinc-500 hover:text-white">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="text-[10px] font-black w-12 text-center select-none text-zinc-400">
              {Math.round(zoom * 100)}%
            </div>
            <button onClick={handleZoomIn} className="text-zinc-500 hover:text-white transition-all">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <a 
            href={downloadUrl} 
            download 
            className="flex items-center gap-3 px-8 py-3.5 bg-[#f34e07] hover:bg-[#ff6221] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-orange-950/20 active:scale-95"
          >
            <Download className="w-4 h-4" /> DESCARGAR PDF
          </a>
        </div>
      </header>

      {/* Visor de Documento - Zoom por Escala (Magnificación Real) */}
      <main className="flex-1 overflow-auto custom-scrollbar bg-transparent">
        <div 
          className="py-12 flex flex-col items-center min-h-full"
          style={{ 
            width: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          }}
        >
          <div 
            className="bg-white shadow-[0_0_100px_rgba(0,0,0,0.6)] overflow-hidden relative"
            style={{ 
              width: `${baseWidth}px`, 
              height: `${baseHeight}px`,
              maxWidth: '98vw',
              // Propiedades para mantener nitidez
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
                <Loader2 className="w-12 h-12 animate-spin text-[#f34e07]" />
              </div>
            )}
            
            {loading && (
               <div className="absolute inset-0 bg-[#050505] flex items-center justify-center z-10">
                  <Loader2 className="w-12 h-12 animate-spin text-[#f34e07]" />
               </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
          border: 2px solid #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}
