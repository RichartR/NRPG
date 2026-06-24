'use client';

import { useState, useEffect, useRef } from 'react';
import { convertDriveUrl, getDownloadUrl } from '@/lib/utils/driveConverter';
import Link from 'next/link';
import Breadcrumbs, { CrumbItem } from './Breadcrumbs';

interface DocViewerProps {
  title: string;
  url: string;
  backUrl?: string;
  breadcrumbs?: CrumbItem[];
}

export default function DocViewer({ title, url, backUrl = "/bienvenida", breadcrumbs }: DocViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timestamp] = useState(() => Date.now());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollWarning, setShowScrollWarning] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const rawProxyUrl = convertDriveUrl(url);
  const downloadUrl = getDownloadUrl(url);

  // Extraer el ID para reconstruir la URL del proxy PDF si estamos en móvil
  const fileIdMatch = url.match(/\/d\/(.*?)(\/|$)/);
  const fileId = fileIdMatch ? fileIdMatch[1] : null;
  const proxyPdfUrl = fileId ? `/api/proxy-pdf?fileId=${fileId}` : url;

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lógica Híbrida:
  // - En móvil: Cargamos el PDF a través del proxy y lo mostramos con pdf-viewer.html (evita que Google renderice roto en móviles).
  // - En PC: Cargamos la vista previa directa de Google con authuser=0 y cache-buster para máxima confiabilidad.
  const embedUrl = isMobile
    ? `/pdf-viewer.html?file=${encodeURIComponent(proxyPdfUrl)}`
    : `${rawProxyUrl}${rawProxyUrl.includes('?') ? '&' : '?'}authuser=0&cb=${timestamp}`;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.6));

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentTarget = e.currentTarget;
    const scrollTop = currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 200);
  };

  const handleMainWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (isMobile) return;
    const currentTarget = mainRef.current;
    if (!currentTarget) return;

    // Detectamos si está abajo del todo (o muy cerca, tolerancia 10px) y el usuario intenta rodar hacia abajo
    const isAtBottom = currentTarget.scrollHeight - currentTarget.scrollTop <= currentTarget.clientHeight + 10;
    if (isAtBottom && e.deltaY > 0) {
      setShowScrollWarning(true);
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      warningTimeoutRef.current = setTimeout(() => {
        setShowScrollWarning(false);
      }, 2000);
    }
  };

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isGoogleDoc = rawProxyUrl.includes("docs.google.com/document");
  const isGoogleDriveFile = rawProxyUrl.includes("drive.google.com/file");

  // Medidas de precisión (Escritorio)
  const desktopBaseWidth = 794;
  const desktopBaseHeight = 1120;

  // Ajustamos los offsets y el ancho para "recortar" los márgenes blancos nativos del preview de Google Docs
  const desktopLeftOffset = isGoogleDoc ? 70 : (isGoogleDriveFile ? 0 : 71);
  const desktopTopOffset = isGoogleDoc ? 20 : (isGoogleDriveFile ? 56 : 60);
  const desktopIframeWidth = isGoogleDoc ? 950 : (isGoogleDriveFile ? desktopBaseWidth : 949);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <header className={`min-h-20 py-4 md:py-0 md:h-24 xl:h-28 flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 xl:px-12 gap-4 shrink-0 z-50 border-b border-oro/10 relative transition-all duration-1000 ${loading ? 'bg-black' : 'bg-black/80 backdrop-blur-xl'}`}>
        <div className="flex items-center gap-4 xl:gap-10 min-w-0 flex-1 w-full justify-center md:justify-start">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <div className="w-full min-w-0">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          ) : (
            <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1 justify-center md:justify-start">
              <Link
                href={backUrl}
                className="flex items-center gap-3 px-4 py-2 font-black text-caption xl:text-sm uppercase tracking-[0.2em] transition-all active:scale-95 text-oro/60 hover:text-oro group shrink-0"
              >
                <div className="w-2 xl:w-2.5 h-2 xl:h-2.5 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
                <span>VOLVER</span>
              </Link>
              <div className="h-8 w-px bg-oro/10 shrink-0 hidden sm:block" />
              <h1 className="text-lg xl:text-2xl font-black tracking-[0.1em] uppercase text-oro font-ninja truncate max-w-[50vw] md:max-w-[40vw] pt-1">
                {title}
              </h1>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 sm:gap-6 shrink-0 w-full md:w-auto">
          <div className="flex items-center gap-2 p-1.5 bg-black/60 border border-oro/10 ninja-box shadow-2xl">
            <button onClick={handleZoomOut} className="p-2 md:p-2.5 hover:bg-rojo-sangre/20 transition-all text-oro/40 hover:text-oro">
              <div className="w-3 h-0.5 bg-current" />
            </button>
            <div className="text-caption xl:text-xs font-black w-12 text-center select-none text-oro/80 tabular-nums">
              {Math.round(zoom * 100)}%
            </div>
            <button onClick={handleZoomIn} className="p-2 md:p-2.5 hover:bg-rojo-sangre/20 transition-all text-oro/40 hover:text-oro">
              <div className="relative w-3 h-3 flex items-center justify-center">
                <div className="absolute w-3 h-0.5 bg-current" />
                <div className="absolute w-0.5 h-3 bg-current" />
              </div>
            </button>
          </div>

          <a
            href={downloadUrl}
            download
            className="flex items-center justify-center gap-4 px-6 md:px-8 py-2.5 md:py-3.5 bg-oro text-rojo-sangre font-black text-caption xl:text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(255,230,159,0.2)] active:scale-95 hover:brightness-110 shrink-0"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            DESCARGAR PDF
          </a>
        </div>
      </header>

      <main
        ref={mainRef}
        onScroll={handleMainScroll}
        onWheel={handleMainWheel}
        className={`flex-1 overflow-auto custom-scrollbar transition-colors duration-1000 ${loading ? 'bg-black' : 'bg-transparent'}`}
      >
        <div
          className="py-12 xl:py-20 flex flex-col items-center min-h-full"
          style={zoom !== 1 ? {
            width: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          } : {
            width: '100%'
          }}
        >
          <div
            className="bg-[#ffe6ba] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden relative transition-all duration-500"
            style={{
              width: isMobile ? '95vw' : `${desktopBaseWidth}px`,
              height: isMobile ? 'auto' : `${desktopBaseHeight}px`,
              aspectRatio: isMobile ? '1/1.4' : 'auto',
              maxWidth: '98vw',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              WebkitFontSmoothing: 'antialiased'
            }}
          >
            {mounted && (
              <div
                className="absolute"
                style={{
                  width: isMobile ? '100%' : `${desktopIframeWidth}px`,
                  height: isMobile ? '100%' : `calc(100% + ${desktopTopOffset}px)`,
                  left: isMobile ? '0' : `-${desktopLeftOffset}px`,
                  top: isMobile ? '0' : `-${desktopTopOffset}px`
                }}
              >
                <iframe
                  src={embedUrl}
                  onLoad={() => setLoading(false)}
                  className="w-full h-full border-none bg-[#ffe6ba]"
                  allow="autoplay"
                />
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-oro/20 border-t-oro rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src="/assets/icons/shuriken.png" className="w-6 h-6 object-contain" alt="Logo" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-4 bg-oro text-rojo-sangre hover:bg-[#ffe69f] hover:text-black font-black text-caption tracking-[0.1em] uppercase transition-all duration-300 shadow-[0_0_20px_rgba(255,230,159,0.3)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          <span className="text-xs">▲</span>
          <span>SUBIR</span>
        </button>
      )}

      {showScrollWarning && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-neutral-900 border border-oro/40 text-oro text-xs sm:text-sm font-black uppercase tracking-[0.15em] flex items-center gap-3 shadow-[0_0_30px_rgba(255,230,159,0.25)] animate-fade-in"
          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
          <span className="text-rojo-sangre text-base">⚠️</span>
          <span>Coloca el ratón sobre el documento para seguir leyendo</span>
        </div>
      )}

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
