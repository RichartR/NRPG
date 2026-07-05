'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { useToastStore } from '@/components/ui/Toast';
import { MapaService, MapaMarcador, MapaConexion } from '@/services/supabase/mapa.service';
import MapaAdminControls from '@/components/mapa/MapaAdminControls';
import { Compass, Info, Loader2, X, Search, ZoomIn } from 'lucide-react';

// Load Leaflet map dynamically without Server-Side Rendering (SSR)
const MapaInteractivo = dynamic(() => import('@/components/mapa/MapaInteractivo'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 border border-oro/10 rounded-2xl p-12">
      <Loader2 className="w-10 h-10 text-oro animate-spin mb-4" />
      <span className="text-sm font-black text-oro uppercase tracking-[0.2em]">Cargando Cartografía...</span>
    </div>
  ),
});

interface MapaClientViewProps {
  isAdmin: boolean;
}

export default function MapaClientView({ isAdmin }: MapaClientViewProps) {
  const [markers, setMarkers] = useState<MapaMarcador[]>([]);
  const [connections, setConnections] = useState<MapaConexion[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);

  // Editor states
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [expandedConns, setExpandedConns] = useState<Record<string, boolean>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const toggleConnImage = (id: string) => {
    setExpandedConns((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const addToast = useToastStore((state) => state.addToast);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [markersData, connectionsData] = await Promise.all([
          MapaService.getMarcadores(),
          MapaService.getConexiones(),
        ]);
        setMarkers(markersData);
        setConnections(connectionsData);
      } catch (err: any) {
        addToast(err.message || 'Error al cargar los datos del mapa.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [addToast]);

  // Prevent background scroll when player modal is active
  useEffect(() => {
    if (selectedMarkerId && !adminMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedMarkerId, adminMode]);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedMarkerId(null);
    setPendingCoords({ lat, lng });
  };

  const handleMarkerClick = async (marker: MapaMarcador) => {
    // If we were drawing a connection, click on another marker to connect them
    if (connectingFromId && connectingFromId !== marker.id) {
      try {
        const conn = await MapaService.crearConexion(connectingFromId, marker.id);
        setConnections((prev) => [...prev, conn]);
        addToast('Línea de conexión trazada con éxito.', 'success');
      } catch (err: any) {
        addToast(err.message || 'Error al conectar los marcadores.', 'error');
      } finally {
        setConnectingFromId(null);
      }
    } else {
      setPendingCoords(null);
      setSelectedMarkerId(marker.id);
    }
  };

  const handleAddMarker = async (
    nombre: string,
    descripcion: string | null,
    icono: string,
    colorFondo: string,
    lat: number,
    lng: number,
    imagenSala?: string | null
  ) => {
    try {
      const newMarker = await MapaService.crearMarcador(nombre, descripcion, lat, lng, icono, colorFondo, imagenSala);
      setMarkers((prev) => [...prev, newMarker]);
      addToast(`Marcador "${nombre}" creado con éxito.`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al crear el marcador.', 'error');
      throw err;
    }
  };

  const handleUpdateMarker = async (
    id: string,
    nombre: string,
    descripcion: string | null,
    icono: string,
    colorFondo: string,
    imagenSala?: string | null
  ) => {
    try {
      const updated = await MapaService.editarMarcador(id, nombre, descripcion, icono, colorFondo, imagenSala);
      setMarkers((prev) => prev.map((m) => (m.id === id ? updated : m)));
      addToast(`Marcador "${nombre}" actualizado con éxito.`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al actualizar el marcador.', 'error');
      throw err;
    }
  };

  const handleMarkerDragEnd = async (id: string, lat: number, lng: number) => {
    try {
      const updated = await MapaService.actualizarPosicionMarcador(id, lat, lng);
      setMarkers((prev) => prev.map((m) => (m.id === id ? { ...updated, imagen_sala: m.imagen_sala } : m)));
      addToast('Posición del marcador actualizada.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al mover el marcador.', 'error');
    }
  };

  const handleDeleteMarker = async (id: string) => {
    try {
      await MapaService.eliminarMarcador(id);
      setMarkers((prev) => prev.filter((m) => m.id !== id));
      // Cascade connection removal in local state as well
      setConnections((prev) => prev.filter((c) => c.origen_id !== id && c.destino_id !== id));
      addToast('Marcador eliminado con éxito.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al eliminar el marcador.', 'error');
    }
  };

  const handleAddConnection = async (
    origenId: string,
    destinoId: string,
    color: string,
    imagenIda?: string | null,
    imagenVuelta?: string | null,
    tipoIcono: 'linea' | 'url' = 'linea',
    iconoUrl?: string | null
  ) => {
    try {
      const newConn = await MapaService.crearConexion(origenId, destinoId, color, imagenIda, imagenVuelta, tipoIcono, iconoUrl);
      setConnections((prev) => [...prev, newConn]);
      addToast('Línea de conexión trazada con éxito.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al trazar la conexión.', 'error');
    }
  };

  const handleUpdateConnection = async (
    origenId: string,
    destinoId: string,
    color: string,
    imagenIda: string | null,
    imagenVuelta: string | null,
    tipoIcono: 'linea' | 'url' = 'linea',
    iconoUrl?: string | null
  ) => {
    try {
      await MapaService.editarConexion(origenId, destinoId, color, imagenIda, imagenVuelta, tipoIcono, iconoUrl);
      // Refresh connections from DB to get updated images
      const updated = await MapaService.getConexiones();
      setConnections(updated);
      addToast('Conexión actualizada con éxito.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al actualizar la conexión.', 'error');
    }
  };

  const handleUpdateAllConnections = async (
    tipoIcono: 'linea' | 'url',
    color?: string,
    iconoUrl?: string | null
  ) => {
    try {
      await MapaService.actualizarTodasLasConexiones(tipoIcono, color, iconoUrl);
      const updated = await MapaService.getConexiones();
      setConnections(updated);
      addToast('Todas las conexiones se han actualizado.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al actualizar las conexiones en masa.', 'error');
    }
  };

  const handleDeleteConnection = async (origenId: string, destinoId: string) => {
    try {
      await MapaService.eliminarConexion(origenId, destinoId);
      setConnections((prev) =>
        prev.filter(
          (c) =>
            !(c.origen_id === origenId && c.destino_id === destinoId) &&
            !(c.origen_id === destinoId && c.destino_id === origenId)
        )
      );
      addToast('Línea de conexión eliminada.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al eliminar la conexión.', 'error');
    }
  };

  const selectedMarker = markers.find((m) => m.id === selectedMarkerId) || null;

  return (
    <div className="pt-24 pb-20 px-4 sm:p-8 xl:p-12 flex flex-col min-h-screen">
      {/* Page Header */}
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Mapa Interactivo' },
          ]}
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            MAPA <span className="text-oro/40">DEL MUNDO NINJA</span>
          </h1>
        </div>
      </header>

      {/* Main Layout */}
      <main className="w-full max-w-[1750px] mx-auto flex-1 flex flex-col gap-8">
        {loading ? (
          <div className="w-full flex flex-col items-center justify-center p-20">
            <Loader2 className="w-12 h-12 text-oro animate-spin mb-4" />
            <span className="text-sm font-black text-oro uppercase tracking-widest">
              Cargando Base de Datos...
            </span>
          </div>
        ) : (
          <>
            {/* Top Section: Controls or General Instructions */}
            <div className="w-full">
              {isAdmin ? (
                <MapaAdminControls
                  adminMode={adminMode}
                  setAdminMode={setAdminMode}
                  selectedMarker={selectedMarker}
                  setSelectedMarkerId={setSelectedMarkerId}
                  connectingFromId={connectingFromId}
                  setConnectingFromId={setConnectingFromId}
                  markers={markers}
                  connections={connections}
                  onAddMarker={handleAddMarker}
                  onUpdateMarker={handleUpdateMarker}
                  onDeleteMarker={handleDeleteMarker}
                  onAddConnection={handleAddConnection}
                  onDeleteConnection={handleDeleteConnection}
                  onUpdateConnection={handleUpdateConnection}
                  onUpdateAllConnections={handleUpdateAllConnections}
                  pendingCoords={pendingCoords}
                  setPendingCoords={setPendingCoords}
                />
              ) : (
                <div className="ninja-card-oro p-6 w-full">
                  <h3 className="text-sm font-black text-oro uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Compass className="w-4 h-4" /> Exploración Cartográfica
                  </h3>
                  <p className="text-xs text-oro/60 font-semibold leading-relaxed">
                    Navega por el mapa interactivo arrastrando el terreno y usando la rueda del ratón para hacer
                    zoom. Haz clic en cualquiera de los marcadores para consultar la información del lugar en un popup
                    o ver las rutas y caminos shinobi que conectan los diferentes puntos de interés.
                  </p>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-[1024px] mx-auto relative z-[2000] mb-4 md:-mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40" />
                <input
                  type="text"
                  placeholder="Buscar ubicación o punto de interés..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  className="w-full bg-zinc-950/80 border border-oro/10 hover:border-oro/30 focus:border-oro/60 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-oro/30 uppercase tracking-widest font-black outline-none transition-all duration-300 shadow-xl"
                />

                {/* Clear query button */}
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-oro/40 hover:text-oro transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Helper text under search bar */}
              <div className="text-center mt-3 mb-1">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-oro/60 uppercase tracking-[0.15em] bg-zinc-950/80 border border-oro/10 px-4 py-1.5 rounded-full shadow-md">
                  <Info className="w-3.5 h-3.5 text-oro/60 shrink-0" /> Haz clic en los marcadores del mapa para ver más información de los caminos y rutas
                </span>
              </div>

              {/* Floating dropdown suggestions */}
              {showSearchResults && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950/95 border border-oro/20 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[2010]">
                  <div className="max-h-60 overflow-y-auto divide-y divide-oro/5">
                    {markers
                      .filter((marker) =>
                        marker.nombre.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((marker) => (
                        <button
                          key={marker.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedMarkerId(marker.id);
                            setSearchQuery(marker.nombre);
                            setShowSearchResults(false);
                          }}
                          className="w-full px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-white hover:bg-oro/10 hover:text-oro transition-all duration-200 flex justify-between items-center"
                        >
                          <span>{marker.nombre}</span>
                          <span className="text-[10px] text-oro/40 font-semibold italic">Ver en mapa</span>
                        </button>
                      ))}
                    {markers.filter((marker) =>
                      marker.nombre.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                        <div className="px-5 py-4 text-xs font-black uppercase tracking-widest text-oro/40 text-center">
                          No se encontraron ubicaciones
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Map Frame centered with auto scaling */}
            <div className="w-full flex justify-center">
              <div className="w-full max-w-[1024px]">
                <MapaInteractivo
                  markers={markers}
                  connections={connections}
                  adminMode={adminMode}
                  onMapClick={handleMapClick}
                  onMarkerClick={handleMarkerClick}
                  onMarkerDragEnd={handleMarkerDragEnd}
                  selectedMarkerId={selectedMarkerId}
                  connectingFromId={connectingFromId}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Centered Marker Info Modal for players */}
      {!adminMode && selectedMarker && (() => {
        const activeConnections = connections.filter(
          (c) => c.origen_id === selectedMarker.id || c.destino_id === selectedMarker.id
        );
        const resolvedConnections = activeConnections.map((conn) => {
          const isOrigen = conn.origen_id === selectedMarker.id;
          const destId = isOrigen ? conn.destino_id : conn.origen_id;
          const destMarker = markers.find((m) => m.id === destId);
          // Show the image corresponding to the travel direction from this marker
          const imagenCamino = isOrigen ? conn.imagen_ida : conn.imagen_vuelta;
          return {
            connection: conn,
            destination: destMarker,
            imagenCamino,
          };
        }).filter(item => item.destination !== undefined) as { connection: MapaConexion, destination: MapaMarcador, imagenCamino: string | null | undefined }[];

        return (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Scrollable Wrapper to preserve custom border layouts */}
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              {/* Card Container */}
              <div className="ninja-card-oro p-8 w-full relative flex flex-col gap-5 bg-zinc-950 animate-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                  onClick={() => setSelectedMarkerId(null)}
                  className="absolute top-4 right-4 text-oro/40 hover:text-oro transition-colors p-1 z-[10]"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Room Image */}
                {selectedMarker.imagen_sala && (
                  <div className="w-full h-52 rounded-xl overflow-hidden border border-oro/10 relative shadow-inner shrink-0 mt-3">
                    <img
                      src={selectedMarker.imagen_sala}
                      alt={selectedMarker.nombre}
                      className="w-full h-full object-cover"
                    />
                    {/* Zoom button - always visible */}
                    <button
                      onClick={() => setLightboxUrl(selectedMarker.imagen_sala!)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 border border-oro/30 hover:border-oro/70 rounded-lg text-oro/80 hover:text-oro transition-all duration-200"
                      title="Ver en pantalla completa"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Header / Title */}
                <div className="flex items-center gap-3 border-b border-oro/10 pb-4 shrink-0">
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-oro/40 uppercase tracking-widest block mb-0.5">Ubicación</span>
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">
                      {selectedMarker.nombre}
                    </h3>
                  </div>
                </div>

                {/* Body / Description */}
                <p className="text-sm text-oro/70 leading-relaxed font-semibold whitespace-pre-line my-1">
                  {selectedMarker.descripcion || 'No hay descripción disponible para esta ubicación.'}
                </p>

                {/* Connections / Navigation */}
                <div className="space-y-3 mt-1 border-t border-oro/10 pt-4">
                  <span className="text-[10px] font-black text-oro/40 uppercase tracking-widest block">Caminos y Conexiones Disponibles</span>
                  {resolvedConnections.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {resolvedConnections.map(({ connection, destination, imagenCamino }) => (
                        <div
                          key={connection.id}
                          className="flex flex-col gap-3 bg-black/40 border border-oro/5 hover:border-oro/20 p-3.5 rounded-xl transition-all duration-300 group"
                        >
                          {/* Top: Text & Buttons */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <span className="text-[8px] font-bold text-oro/40 uppercase tracking-wider block">Destino</span>
                              <h4 className="text-xs font-black text-white uppercase tracking-wider truncate group-hover:text-oro transition-colors">
                                {destination.nombre}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2">
                              {imagenCamino && (
                                <button
                                  onClick={() => toggleConnImage(connection.id)}
                                  className="px-3 py-1.5 bg-black/40 border border-oro/10 hover:border-oro/30 text-oro/70 hover:text-oro rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200"
                                >
                                  {expandedConns[connection.id] ? 'Ocultar Camino' : 'Ver Camino'}
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedMarkerId(destination.id);
                                  setSearchQuery(destination.nombre);
                                }}
                                className="px-3.5 py-1.5 bg-oro hover:bg-amber-500 text-zinc-950 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200"
                              >
                                Viajar
                              </button>
                            </div>
                          </div>

                          {/* Bottom: Large Connection Image (Collapsible) */}
                          {imagenCamino && expandedConns[connection.id] && (
                            <div className="w-full h-56 rounded-lg overflow-hidden border border-oro/10 bg-zinc-900/60 flex items-center justify-center relative animate-in slide-in-from-top-2 duration-200 group/connimg">
                              <img
                                src={imagenCamino}
                                alt={`Camino a ${destination.nombre}`}
                                className="w-full h-full object-contain"
                              />
                              {/* Zoom button - always visible */}
                              <button
                                onClick={() => setLightboxUrl(imagenCamino)}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 border border-oro/30 hover:border-oro/70 rounded-lg text-oro/80 hover:text-oro transition-all duration-200"
                                title="Ver en pantalla completa"
                              >
                                <ZoomIn className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-oro/30 italic block">No hay conexiones registradas desde este punto.</span>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedMarkerId(null)}
                  className="w-full py-3 ninja-btn-oro font-black text-xs uppercase tracking-widest mt-1"
                >
                  Cerrar Mapa
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox Fullscreen Overlay */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 border border-white/20 hover:border-white/60 rounded-xl text-white/60 hover:text-white transition-all duration-200 z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Vista completa"
            className="max-w-[95vw] max-h-[95vh] object-contain animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
