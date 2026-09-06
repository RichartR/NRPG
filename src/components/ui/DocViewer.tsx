'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { convertDriveUrl, getDownloadUrl } from '@/lib/utils/driveConverter';
import Link from 'next/link';
import Breadcrumbs, { CrumbItem } from './Breadcrumbs';
import { Search, BookOpen, FileText, X, ChevronRight, Check, AlertCircle } from 'lucide-react';

export interface NavDocItem {
  clave: string;
  titulo: string;
  categoria?: string;
  url_drive: string;
}

interface DocViewerProps {
  title?: string;
  url?: string;
  initialDoc?: NavDocItem;
  allDocs?: NavDocItem[];
  backUrl?: string;
  breadcrumbs?: CrumbItem[];
}

const STORAGE_KEY = 'nrpg_recent_docs';
const FAVORITES_STORAGE_KEY = 'nrpg_doc_favorites';
const MAX_LIVE_TABS = 6;
const MAX_FAVORITES = 4;

export default function DocViewer({
  title = '',
  url = '',
  initialDoc,
  allDocs = [],
  backUrl = '/bienvenida',
  breadcrumbs
}: DocViewerProps) {
  // Documento activo inicial
  const startingDoc: NavDocItem = initialDoc || {
    clave: '',
    titulo: title,
    url_drive: url,
    categoria: 'documento'
  };

  const [currentDoc, setCurrentDoc] = useState<NavDocItem>(startingDoc);
  const [openTabs, setOpenTabs] = useState<NavDocItem[]>([startingDoc]);
  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});
  // Carga perezosa (lazy-loading): solo montamos en el DOM los iframes que el usuario ha activado al menos una vez (0 bytes de RAM para los no visitados)
  const [mountedIframes, setMountedIframes] = useState<Record<string, boolean>>({
    [startingDoc.clave || startingDoc.titulo]: true
  });

  // Lista de documentos favoritos (máximo 4)
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavLimitToast, setShowFavLimitToast] = useState(false);
  const favLimitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Panel lateral y búsqueda
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'todos' | 'favoritos' | 'combate' | 'sistemas' | 'otros'>('todos');

  // Aviso de límite de 6 pestañas
  const [showLimitToast, setShowLimitToast] = useState(false);
  const [closedTabName, setClosedTabName] = useState('');
  const limitToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Referencias a todos los iframes de las pestañas montadas
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Registro de último acceso por pestaña para expulsar la menos usada si se llega al límite de 6
  const lastActiveTimeRef = useRef<Map<string, number>>(new Map());

  // Función para enfocar el iframe del documento visible
  const focusVisibleDoc = () => {
    if (isMobile || isSidebarOpen) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const activeKey = currentDoc.clave || currentDoc.titulo;
    const activeIframe = iframeRefs.current.get(activeKey);
    if (activeIframe && document.activeElement !== activeIframe) {
      activeIframe.focus();
    }
  };

  // Limpiar timers, purgar memoria RAM de iframes y cerrar pestañas al salir de la sección de docs
  useEffect(() => {
    const purgeAllIframes = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      iframeRefs.current.forEach(el => {
        try {
          el.src = 'about:blank';
        } catch {}
      });
      iframeRefs.current.clear();
    };

    window.addEventListener('beforeunload', purgeAllIframes);
    window.addEventListener('pagehide', purgeAllIframes);

    return () => {
      window.removeEventListener('beforeunload', purgeAllIframes);
      window.removeEventListener('pagehide', purgeAllIframes);
      if (limitToastTimeoutRef.current) {
        clearTimeout(limitToastTimeoutRef.current);
      }
      if (favLimitTimeoutRef.current) {
        clearTimeout(favLimitTimeoutRef.current);
      }
      purgeAllIframes();
    };
  }, []);

  // Inicialización de la vista y carga de favoritos con Carga Perezosa (0 bytes de RAM iniciales)
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Asegurar limpieza de residuos de pestañas anteriores al entrar de nuevo
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    const startKey = startingDoc.clave || startingDoc.titulo;
    lastActiveTimeRef.current.set(startKey, Date.now());

    // Cargar documentos favoritos persistidos en el cliente
    try {
      const savedFavs = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const favKeys: string[] = savedFavs ? JSON.parse(savedFavs) : [];
      if (Array.isArray(favKeys) && favKeys.length > 0) {
        const validFavKeys = favKeys.slice(0, MAX_FAVORITES);
        setFavorites(validFavKeys);

        if (allDocs && allDocs.length > 0) {
          const favDocs: NavDocItem[] = [];
          for (const key of validFavKeys) {
            const found = allDocs.find(d => (d.clave && d.clave === key) || d.titulo === key);
            if (found) favDocs.push(found);
          }

          const isStartInFavs = favDocs.some(
            d => (d.clave && d.clave === startingDoc.clave) || d.titulo === startingDoc.titulo
          );

          let initialTabs: NavDocItem[];
          if (isStartInFavs) {
            initialTabs = favDocs;
          } else {
            // El documento al que se accede se añade a la barra de pestañas
            initialTabs = [...favDocs, startingDoc];
          }

          if (initialTabs.length > MAX_LIVE_TABS) {
            initialTabs = initialTabs.slice(0, MAX_LIVE_TABS);
          }

          setOpenTabs(initialTabs);

          initialTabs.forEach((d, idx) => {
            const k = d.clave || d.titulo;
            lastActiveTimeRef.current.set(k, Date.now() - (initialTabs.length - idx) * 1000);
          });
          lastActiveTimeRef.current.set(startKey, Date.now());
        }
      }
    } catch {}

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Atajo global CTRL + F / CMD + F: enfoca directamente el iframe del documento visible
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        const activeKey = currentDoc.clave || currentDoc.titulo;
        const activeIframe = iframeRefs.current.get(activeKey);
        if (activeIframe) {
          e.preventDefault();
          activeIframe.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDoc.clave, currentDoc.titulo]);

  // Enfocar el documento activo al cambiar o cargar
  useEffect(() => {
    if (isMobile || isSidebarOpen) return;
    const timer = setTimeout(focusVisibleDoc, 150);
    return () => clearTimeout(timer);
  }, [isMobile, isSidebarOpen, currentDoc.clave, currentDoc.titulo]);

  // Enfocar input de búsqueda al abrir el panel lateral
  useEffect(() => {
    if (isSidebarOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen]);

  // Alternar documento como favorito (máximo 4 con guardado local de referencia cero coste)
  const toggleFavorite = (e: React.MouseEvent, docKey: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.includes(docKey);
      let updated: string[];
      if (isFav) {
        updated = prev.filter(k => k !== docKey);
      } else {
        if (prev.length >= MAX_FAVORITES) {
          setShowFavLimitToast(true);
          if (favLimitTimeoutRef.current) clearTimeout(favLimitTimeoutRef.current);
          favLimitTimeoutRef.current = setTimeout(() => {
            setShowFavLimitToast(false);
          }, 4500);
          return prev;
        }
        updated = [...prev, docKey];
      }
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Selección y apertura de documentos
  const handleSelectDoc = (doc: NavDocItem) => {
    const docKey = doc.clave || doc.titulo;
    lastActiveTimeRef.current.set(docKey, Date.now());

    // Carga Perezosa: Marcar este iframe como montado para que se cargue en el DOM solo si se visita
    setMountedIframes(prev => (prev[docKey] ? prev : { ...prev, [docKey]: true }));

    const isSameDoc = (doc.clave && doc.clave === currentDoc.clave) || doc.titulo === currentDoc.titulo;
    if (isSameDoc) {
      if (isMobile) setIsSidebarOpen(false);
      setTimeout(focusVisibleDoc, 50);
      return;
    }

    // Actualizar documento activo y URL en barra de direcciones
    setCurrentDoc(doc);
    if (doc.clave && typeof window !== 'undefined') {
      window.history.pushState(null, '', `/docs/${doc.clave}`);
    }

    // Comprobar si ya está en las pestañas abiertas
    const alreadyOpen = openTabs.some(d => (d.clave && d.clave === doc.clave) || d.titulo === doc.titulo);
    if (alreadyOpen) {
      // Las pestañas se quedan fijas en su posición actual
      if (isMobile) {
        setIsSidebarOpen(false);
      } else {
        setTimeout(focusVisibleDoc, 100);
      }
      return;
    }

    let updatedList = [...openTabs];

    // Si no estaba abierto y ya tenemos el límite de 6 pestañas:
    if (openTabs.length >= MAX_LIVE_TABS) {
      // Localizar la pestaña a cerrar: protegemos los documentos marcados como favoritos
      const nonFavTabs = openTabs.filter(d => !favorites.includes(d.clave || d.titulo));
      const candidateList = nonFavTabs.length > 0 ? nonFavTabs : openTabs;

      let tabToClose = candidateList[0];
      let oldestTime = lastActiveTimeRef.current.get(tabToClose.clave || tabToClose.titulo) ?? 0;

      for (let i = 1; i < candidateList.length; i++) {
        const item = candidateList[i];
        const itemKey = item.clave || item.titulo;
        const itemTime = lastActiveTimeRef.current.get(itemKey) ?? 0;
        if (itemTime < oldestTime) {
          oldestTime = itemTime;
          tabToClose = item;
        }
      }

      const closeKey = tabToClose.clave || tabToClose.titulo;

      // Forzar la liberación inmediata de RAM del iframe que se va a desmontar
      releaseIframeMemory(closeKey);
      lastActiveTimeRef.current.delete(closeKey);

      setClosedTabName(tabToClose.titulo);
      setShowLimitToast(true);

      if (limitToastTimeoutRef.current) clearTimeout(limitToastTimeoutRef.current);
      limitToastTimeoutRef.current = setTimeout(() => {
        setShowLimitToast(false);
      }, 5000);

      // Desmontar la menos usada y añadir la nueva al final de la fila
      const remaining = openTabs.filter(d => (d.clave ? d.clave !== tabToClose.clave : d.titulo !== tabToClose.titulo));
      updatedList = [...remaining, doc];
    } else {
      // Añadir la nueva pestaña al final de la fila
      updatedList = [...openTabs, doc];
    }

    setOpenTabs(updatedList);

    if (isMobile) {
      setIsSidebarOpen(false);
    } else {
      setTimeout(focusVisibleDoc, 100);
    }
  };

  // Función para forzar la liberación inmediata de memoria RAM de un iframe al cerrarlo
  const releaseIframeMemory = (tabKey: string) => {
    const iframeEl = iframeRefs.current.get(tabKey);
    if (iframeEl) {
      try {
        // Navegar a about:blank obliga al motor del navegador a purgar inmediatamente
        // los scripts, el Canvas y los recursos del documento de Google Docs de la memoria RAM.
        iframeEl.src = 'about:blank';
      } catch {}
      iframeRefs.current.delete(tabKey);
    }
    setMountedIframes(prev => {
      if (!prev[tabKey]) return prev;
      const copy = { ...prev };
      delete copy[tabKey];
      return copy;
    });
    setLoadedTabs(prev => {
      if (!prev[tabKey]) return prev;
      const copy = { ...prev };
      delete copy[tabKey];
      return copy;
    });
  };

  // Cerrar pestaña manualmente y liberar su memoria RAM
  const handleCloseTab = (e: React.MouseEvent, clave: string, docTitle: string) => {
    e.stopPropagation();

    const tabKey = clave || docTitle;
    releaseIframeMemory(tabKey);
    lastActiveTimeRef.current.delete(tabKey);

    const closeIdx = openTabs.findIndex(d => (d.clave ? d.clave === clave : d.titulo === docTitle));
    if (closeIdx === -1) return;

    const updated = openTabs.filter((_, idx) => idx !== closeIdx);
    setOpenTabs(updated);

    // Si cerramos la pestaña que estaba activa, activar la pestaña adyacente más cercana
    const wasActive = (currentDoc.clave && currentDoc.clave === clave) || currentDoc.titulo === docTitle;
    if (wasActive && updated.length > 0) {
      const nextIdx = Math.min(closeIdx, updated.length - 1);
      const nextDoc = updated[nextIdx];
      const nextDocKey = nextDoc.clave || nextDoc.titulo;
      setMountedIframes(p => (p[nextDocKey] ? p : { ...p, [nextDocKey]: true }));
      setCurrentDoc(nextDoc);
      lastActiveTimeRef.current.set(nextDocKey, Date.now());
      if (nextDoc.clave && typeof window !== 'undefined') {
        window.history.pushState(null, '', `/docs/${nextDoc.clave}`);
      }
      setTimeout(focusVisibleDoc, 50);
    }
  };

  // Marcar pestaña como cargada
  const handleTabLoaded = (tabKey: string) => {
    setLoadedTabs(prev => ({ ...prev, [tabKey]: true }));
  };

  // Filtrado de documentos en tiempo real
  const filteredDocs = useMemo(() => {
    if (!allDocs || allDocs.length === 0) return [];
    let list = allDocs;

    if (selectedCategory !== 'todos') {
      if (selectedCategory === 'favoritos') {
        list = list.filter(d => favorites.includes(d.clave || d.titulo));
      } else if (selectedCategory === 'combate') {
        list = list.filter(d => d.categoria === 'combate');
      } else if (selectedCategory === 'sistemas') {
        list = list.filter(d => d.categoria === 'sistemas');
      } else {
        list = list.filter(d => d.categoria !== 'combate' && d.categoria !== 'sistemas');
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(d =>
        d.titulo.toLowerCase().includes(q) ||
        d.clave.toLowerCase().includes(q) ||
        (d.categoria && d.categoria.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allDocs, selectedCategory, favorites, searchQuery]);

  const activeDocKey = currentDoc.clave || currentDoc.titulo;
  const isCurrentTabLoaded = !!loadedTabs[activeDocKey];
  const downloadUrl = getDownloadUrl(currentDoc.url_drive);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-black">
      {/* Cabecera */}
      <header className="min-h-16 py-3 md:py-0 md:h-20 xl:h-24 flex flex-col md:flex-row items-center justify-between px-4 sm:px-6 xl:px-12 gap-3 shrink-0 z-40 border-b border-oro/10 relative transition-colors duration-500 bg-black/80 backdrop-blur-md">
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
                <div className="w-2 xl:w-2.5 h-2 xl:h-2.5 bg-naranja-naruto rotate-45 group-hover:bg-oro transition-colors" />
                <span>VOLVER</span>
              </Link>
              <div className="h-8 w-px bg-oro/10 shrink-0 hidden sm:block" />
              <h1 className="text-lg xl:text-2xl font-black tracking-[0.1em] uppercase text-oro font-ninja truncate max-w-[50vw] md:max-w-[40vw] pt-1">
                {currentDoc.titulo}
              </h1>
              {/* Botón Shuriken para marcar/desmarcar documento actual como favorito */}
              <button
                onClick={e => toggleFavorite(e, currentDoc.clave || currentDoc.titulo)}
                className="p-1.5 rounded hover:bg-neutral-800 transition-all cursor-pointer shrink-0 ml-1 group"
                title={
                  favorites.includes(currentDoc.clave || currentDoc.titulo)
                    ? 'Quitar de favoritos'
                    : 'Marcar como favorito (abre automáticamente al acceder a docs)'
                }
              >
                <img
                  src="/assets/icons/shuriken.webp"
                  className={`w-5 h-5 object-contain transition-all duration-300 ${
                    favorites.includes(currentDoc.clave || currentDoc.titulo)
                      ? 'drop-shadow-[0_0_8px_rgba(255,165,0,0.9)] opacity-100 scale-110'
                      : 'opacity-30 grayscale group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105'
                  }`}
                  alt="Favorito"
                />
              </button>
            </div>
          )}
        </div>

        {/* Acciones de la barra superior */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-3 shrink-0 w-full md:w-auto">
          {/* Botón Buscador Lateral de Documentos / Pestañas */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-black/80 hover:bg-oro/20 border border-oro/40 hover:border-oro text-oro font-black text-caption xl:text-xs uppercase tracking-[0.15em] transition-all active:scale-95 shadow-[0_0_15px_rgba(203,162,75,0.15)] group cursor-pointer"
            title="Abrir buscador lateral de documentos y pestañas vivas"
          >
            <BookOpen className="w-3.5 h-3.5 text-naranja-naruto group-hover:text-oro transition-colors" />
            <span>BIBLIOTECA</span>
            <span className="text-[10px] text-black bg-naranja-naruto px-1.5 py-0.5 rounded-full font-black ml-0.5">
              {openTabs.length}/{MAX_LIVE_TABS}
            </span>
          </button>

          {/* Indicador / Atajo Buscar en el documento */}
          <button
            onClick={focusVisibleDoc}
            className="flex items-center gap-2 px-3 py-2 bg-black/80 hover:bg-oro/15 border border-oro/20 hover:border-oro/60 text-oro font-black text-caption xl:text-xs uppercase tracking-[0.15em] transition-all active:scale-95 shadow-md group cursor-pointer"
            title="Pulsa Ctrl + F para buscar directamente en el documento"
          >
            <Search className="w-3.5 h-3.5 text-naranja-naruto group-hover:text-oro transition-colors" />
            <span className="hidden sm:inline">BUSCAR</span>
            <span className="text-[10px] text-oro/70 px-1 py-0.5 bg-neutral-800 rounded border border-oro/20 font-mono">Ctrl+F</span>
          </button>

          {/* Descargar PDF */}
          <a
            href={downloadUrl}
            download
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-naranja-naruto text-black font-black text-caption xl:text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(255,230,159,0.2)] active:scale-95 hover:brightness-110 shrink-0"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            DESCARGAR PDF
          </a>
        </div>
      </header>

      {/* Contenedor Principal del Visor */}
      <main
        className="flex-1 w-full min-h-0 flex flex-col items-center justify-center p-2 sm:p-4 relative"
        onClick={focusVisibleDoc}
      >
        {/* Barra de pestañas horizontales superiores si hay 2 o más documentos abiertos */}
        {openTabs.length > 1 && (
          <div className="w-full max-w-[1020px] flex items-center gap-1.5 mb-2 overflow-x-auto custom-scrollbar shrink-0 pb-1">
            {openTabs.map(tab => {
              const isTabActive = (tab.clave && tab.clave === currentDoc.clave) || tab.titulo === currentDoc.titulo;
              const isTabFav = favorites.includes(tab.clave || tab.titulo);
              return (
                <div
                  key={tab.clave || tab.titulo}
                  onClick={() => handleSelectDoc(tab)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all shrink-0 border select-none ${
                    isTabActive
                      ? 'bg-oro/20 border-oro text-oro shadow-[0_0_12px_rgba(203,162,75,0.25)]'
                      : 'bg-black/60 border-oro/20 text-oro/60 hover:text-oro hover:border-oro/40'
                  }`}
                >
                  {isTabFav ? (
                    <img
                      src="/assets/icons/shuriken.webp"
                      className="w-3.5 h-3.5 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(255,165,0,0.8)]"
                      alt="Favorito"
                      title="Documento Favorito"
                    />
                  ) : (
                    <FileText className={`w-3 h-3 ${isTabActive ? 'text-naranja-naruto' : 'text-oro/40'}`} />
                  )}
                  <span className="truncate max-w-[160px] sm:max-w-[200px]">{tab.titulo}</span>
                  {openTabs.length > 1 && (
                    <button
                      onClick={e => handleCloseTab(e, tab.clave, tab.titulo)}
                      className="p-0.5 hover:text-white rounded hover:bg-neutral-800 text-oro/40 hover:text-oro transition-colors ml-1 cursor-pointer"
                      title="Cerrar pestaña"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Marco de la Hoja del Documento (Multi-iframe con cambio instantáneo 0ms) */}
        <div
          className="h-full w-full max-w-[1020px] relative rounded-lg border border-oro/20 bg-[#ffe6ba] shadow-[0_0_60px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300 flex flex-col"
        >
          {/* Vista móvil: mensaje para abrir fuera manteniendo formato */}
          {mounted && isMobile && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center">
              <p className="font-ninja text-lg uppercase tracking-wider text-oro">Documento en Google Drive</p>
              <p className="max-w-sm text-sm leading-relaxed text-oro/50">
                En dispositivos móviles el documento se abre fuera de NRPG para mantener correctamente su formato.
              </p>
              <a
                href={currentDoc.url_drive}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 bg-naranja-naruto px-7 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-all active:scale-95 hover:brightness-110"
              >
                Ver documento
              </a>
            </div>
          )}

          {/* Vista Escritorio: Pestañas Vivas (Multi-iframe en memoria).
              Cada pestaña mantiene su iframe montado y su posición de scroll exacta.
              El cambio es instantáneo (0ms) alternando visibilidad y opacidad. */}
          {mounted && !isMobile && (
            <>
              {openTabs.map(tab => {
                const isTabActive = (tab.clave && tab.clave === currentDoc.clave) || tab.titulo === currentDoc.titulo;
                const tabKey = tab.clave || tab.titulo;

                // Carga Perezosa: No montar el iframe si el usuario aún no ha hecho clic en esta pestaña (0 RAM consumida)
                if (!mountedIframes[tabKey]) return null;

                const rawUrl = convertDriveUrl(tab.url_drive);
                const embedSrc = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}authuser=0`;

                return (
                  <iframe
                    key={tabKey}
                    ref={el => {
                      if (el) iframeRefs.current.set(tabKey, el);
                      else iframeRefs.current.delete(tabKey);
                    }}
                    src={embedSrc}
                    onLoad={() => {
                      handleTabLoaded(tabKey);
                      if (isTabActive) focusVisibleDoc();
                    }}
                    className={`w-full h-full border-none bg-[#ffe6ba] absolute inset-0 ${
                      isTabActive
                        ? 'opacity-100 pointer-events-auto z-10'
                        : 'opacity-0 pointer-events-none z-0'
                    }`}
                    allow="autoplay"
                    title={tab.titulo}
                  />
                );
              })}
            </>
          )}

          {/* Spinner solo si la pestaña actualmente visible aún no ha terminado de cargar */}
          {!isCurrentTabLoaded && !isMobile && (
            <div className="absolute inset-0 bg-black flex items-center justify-center z-20">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-oro/20 border-t-oro rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/assets/icons/shuriken.webp" className="w-6 sm:w-7 xl:w-8 h-auto object-contain" alt="Logo" />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── AVISO DE LÍMITE DE 4 FAVORITOS ── */}
      {showFavLimitToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-neutral-950/95 border border-naranja-naruto text-oro text-xs sm:text-sm font-black uppercase tracking-[0.12em] flex items-center gap-3 shadow-[0_0_35px_rgba(255,107,0,0.3)] animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[90vw]"
          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
          <img src="/assets/icons/shuriken.webp" className="w-5 h-5 object-contain shrink-0 animate-spin" alt="Shuriken" />
          <span>
            Máximo {MAX_FAVORITES} documentos favoritos permitidos. Desmarca uno para añadir este.
          </span>
        </div>
      )}

      {/* ── AVISO DE CIERRE AUTOMÁTICO DE PESTAÑA AL EXCEDER EL LÍMITE DE 6 ── */}
      {showLimitToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-neutral-950/95 border border-naranja-naruto text-oro text-xs sm:text-sm font-black uppercase tracking-[0.12em] flex items-center gap-3 shadow-[0_0_35px_rgba(255,107,0,0.3)] animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[90vw]"
          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
          <AlertCircle className="w-5 h-5 text-naranja-naruto shrink-0 animate-pulse" />
          <span>
            Para no sobrecargar la memoria del navegador, se ha cerrado automáticamente la pestaña más antigua{' '}
            {closedTabName && <span className="text-white">({closedTabName})</span>} (máximo {MAX_LIVE_TABS} simultáneas).
          </span>
        </div>
      )}

      {/* ── PANEL LATERAL DERECHO (DRAWER DE BÚSQUEDA Y PESTAÑAS VIVAS) ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-neutral-950/95 backdrop-blur-2xl border-l border-oro/30 z-50 shadow-[-15px_0_40px_rgba(0,0,0,0.85)] flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cabecera del Cajón */}
        <div className="p-4 sm:p-5 border-b border-oro/20 flex items-center justify-between shrink-0 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center">
              <img src="/assets/icons/shuriken.webp" className="w-5 h-auto object-contain" alt="icon" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.2em] text-oro font-ninja">
                Biblioteca Ninja
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-oro/40 font-bold">
                Pestañas Vivas ({openTabs.length}/{MAX_LIVE_TABS})
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-oro/60 hover:text-oro hover:bg-neutral-800 rounded transition-colors active:scale-95 cursor-pointer"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador Integrado */}
        <div className="p-4 border-b border-oro/10 space-y-3 bg-black/30 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, clan, rama..."
              className="w-full bg-neutral-900/80 border border-oro/25 focus:border-oro text-oro placeholder:text-oro/30 pl-10 pr-9 py-2.5 text-xs uppercase tracking-wider outline-none rounded transition-colors font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-oro/40 hover:text-oro p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros de Categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold tracking-wide custom-scrollbar">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'favoritos', label: `Favoritos (${favorites.length})` },
              { id: 'combate', label: 'Combate' },
              { id: 'sistemas', label: 'Sistemas' },
              { id: 'otros', label: 'Otros' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer border text-xs font-bold shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-naranja-naruto text-black border-naranja-naruto shadow-sm'
                    : 'bg-neutral-900/80 text-oro/70 border-oro/20 hover:text-oro hover:border-oro/50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido scrolleable del cajón */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {/* Bloque: Documentos Abiertos / Pestañas Vivas */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-oro/80 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-naranja-naruto" />
                Pestañas Vivas ({openTabs.length}/{MAX_LIVE_TABS})
              </span>
            </div>

            <div className="space-y-1.5">
              {openTabs.map(tab => {
                const isActive = (tab.clave && tab.clave === currentDoc.clave) || tab.titulo === currentDoc.titulo;
                const isTabFav = favorites.includes(tab.clave || tab.titulo);
                return (
                  <div
                    key={`tab-drawer-${tab.clave || tab.titulo}`}
                    onClick={() => handleSelectDoc(tab)}
                    className={`group flex items-center justify-between p-2.5 rounded border transition-all cursor-pointer select-none ${
                      isActive
                        ? 'bg-oro/15 border-oro text-oro shadow-[0_0_15px_rgba(203,162,75,0.2)]'
                        : 'bg-neutral-900/60 border-oro/10 hover:border-oro/30 text-oro/70 hover:text-oro'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {isTabFav ? (
                        <img
                          src="/assets/icons/shuriken.webp"
                          className="w-3.5 h-3.5 object-contain shrink-0 drop-shadow-[0_0_6px_rgba(255,165,0,0.8)]"
                          alt="Favorito"
                          title="Favorito"
                        />
                      ) : isActive ? (
                        <div className="w-2 h-2 rounded-full bg-naranja-naruto shrink-0" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-oro/20 shrink-0" />
                      )}
                      <span className="text-xs font-bold uppercase tracking-wider truncate">
                        {tab.titulo}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {isActive && (
                        <span className="text-[9px] font-black text-black bg-naranja-naruto px-1.5 py-0.5">
                          ACTIVO
                        </span>
                      )}
                      {openTabs.length > 1 && (
                        <button
                          onClick={e => handleCloseTab(e, tab.clave, tab.titulo)}
                          className="p-1 text-oro/30 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                          title="Cerrar pestaña"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloque: Resultados de Búsqueda / Todos los Documentos */}
          <div>
            <div className="mb-2.5 px-1 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-oro/80 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-oro" />
                {selectedCategory === 'favoritos'
                  ? `Mis Favoritos (${filteredDocs.length}/${MAX_FAVORITES})`
                  : searchQuery
                  ? `Resultados (${filteredDocs.length})`
                  : `Todos los Documentos (${filteredDocs.length})`}
              </span>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="py-8 text-center bg-neutral-900/40 border border-dashed border-oro/15 rounded p-4">
                <p className="text-xs text-oro/40 uppercase tracking-widest font-bold">
                  {selectedCategory === 'favoritos'
                    ? 'No tienes documentos favoritos marcados'
                    : 'No se encontraron documentos'}
                </p>
                <p className="text-[10px] text-oro/30 mt-1">
                  {selectedCategory === 'favoritos'
                    ? 'Marca hasta 4 documentos con el shuriken para que se abran al acceder'
                    : 'Prueba con otro término de búsqueda'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredDocs.map(doc => {
                  const isActive = (doc.clave && doc.clave === currentDoc.clave) || doc.titulo === currentDoc.titulo;
                  const docKey = doc.clave || doc.titulo;
                  const isFav = favorites.includes(docKey);
                  return (
                    <div
                      key={`all-drawer-${docKey}`}
                      onClick={() => handleSelectDoc(doc)}
                      className={`group flex items-center justify-between p-2.5 rounded border transition-all cursor-pointer select-none ${
                        isActive
                          ? 'bg-oro/15 border-oro text-oro'
                          : 'bg-neutral-900/40 border-oro/10 hover:bg-oro/10 hover:border-oro/30 text-oro/70 hover:text-oro'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider truncate">
                            {doc.titulo}
                          </span>
                        </div>
                        {doc.categoria && (
                          <span className="text-[9px] font-bold text-oro/40 uppercase tracking-widest mt-0.5 inline-block">
                            {doc.categoria}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {/* Botón Shuriken para añadir/quitar de favoritos con 1 clic */}
                        <button
                          onClick={e => toggleFavorite(e, docKey)}
                          className="p-1 rounded hover:bg-neutral-800 transition-all cursor-pointer"
                          title={
                            isFav
                              ? 'Quitar de favoritos'
                              : 'Marcar como favorito (abre automáticamente al acceder a docs)'
                          }
                        >
                          <img
                            src="/assets/icons/shuriken.webp"
                            className={`w-4 h-4 object-contain transition-all duration-200 ${
                              isFav
                                ? 'drop-shadow-[0_0_6px_rgba(255,165,0,0.9)] opacity-100 scale-110'
                                : 'opacity-25 grayscale hover:opacity-100 hover:grayscale-0'
                            }`}
                            alt="Favorito"
                          />
                        </button>

                        {isActive ? (
                          <span className="text-xs text-naranja-naruto flex items-center gap-1 font-bold ml-0.5">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-oro/30 group-hover:text-oro group-hover:translate-x-0.5 transition-all" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pie del Cajón con Explicación del Límite de Memoria */}
        <div className="p-3 border-t border-oro/20 bg-black/60 text-center shrink-0 space-y-1">
          <p className="text-[15px] font-mono text-oro/60 uppercase tracking-widest">
            Hasta {MAX_LIVE_TABS} pestañas simultáneas
          </p>
          <p className="text-[12px] text-oro/35 leading-tight">
            Al abrir un 7º documento, la pestaña más antigua se descarga automáticamente para mantener el navegador ligero.
          </p>
        </div>
      </aside>
    </div>
  );
}
