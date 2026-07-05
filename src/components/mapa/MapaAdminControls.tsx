'use client';

import { useState, useEffect } from 'react';
import { DataField, SelectField } from '@/components/ui/Fields';
import { MapaMarcador, MapaConexion } from '@/services/supabase/mapa.service';
import { Trash2, Link2, Plus, X, Layers, Save, Search } from 'lucide-react';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { useToastStore } from '@/components/ui/Toast';

interface MapaAdminControlsProps {
  adminMode: boolean;
  setAdminMode: (mode: boolean) => void;
  selectedMarker: MapaMarcador | null;
  setSelectedMarkerId: (id: string | null) => void;
  connectingFromId: string | null;
  setConnectingFromId: (id: string | null) => void;
  markers: MapaMarcador[];
  connections: MapaConexion[];
  onAddMarker: (nombre: string, descripcion: string | null, icono: string, colorFondo: string, lat: number, lng: number, imagenSala?: string | null) => Promise<void>;
  onUpdateMarker: (id: string, nombre: string, descripcion: string | null, icono: string, colorFondo: string, imagenSala?: string | null) => Promise<void>;
  onDeleteMarker: (id: string) => Promise<void>;
  onAddConnection: (origenId: string, destinoId: string, color: string, imagenIda?: string | null, imagenVuelta?: string | null, tipoIcono?: 'linea' | 'url', iconoUrl?: string | null) => Promise<void>;
  onDeleteConnection: (origenId: string, destinoId: string) => Promise<void>;
  onUpdateConnection?: (origenId: string, destinoId: string, color: string, imagenIda: string | null, imagenVuelta: string | null, tipoIcono: 'linea' | 'url', iconoUrl?: string | null) => Promise<void>;
  onUpdateAllConnections?: (tipoIcono: 'linea' | 'url', color?: string, iconoUrl?: string | null) => Promise<void>;
  pendingCoords: { lat: number; lng: number } | null;
  setPendingCoords: (coords: { lat: number; lng: number } | null) => void;
}

const ICON_OPTIONS = [
  { label: 'Aldea / Templo Shinobi', value: 'aldea' },
  { label: 'Cueva / Ruinas', value: 'cueva' },
  { label: 'Bosque / Valle', value: 'bosque' },
  { label: 'Templo / Santuario', value: 'templo' },
  { label: 'Lago / Río / Mar', value: 'lago' },
  { label: 'Marcador Genérico (Shuriken)', value: 'shuriken' },
  { label: 'Punto Menor / Muralla', value: 'muralla' },
  { label: 'Pegar URL de Imagen', value: 'url' },
];

function parseStoredColor(colorFondo: string | null | undefined) {
  const defaultColor = { hex: '#d97706', opacity: 100, iconColor: '#ffffff' };
  if (!colorFondo) return defaultColor;

  const parts = colorFondo.split('|');
  const bgPart = parts[0];
  const iconColor = parts[1] || '#ffffff';

  if (!bgPart.startsWith('#')) {
    // If it's a tailwind class legacy value
    if (bgPart.includes('bg-oro')) return { hex: '#d97706', opacity: 100, iconColor };
    if (bgPart.includes('zinc-900')) return { hex: '#18181b', opacity: 100, iconColor };
    if (bgPart.includes('red-950')) return { hex: '#450a0a', opacity: 100, iconColor };
    if (bgPart.includes('emerald-950')) return { hex: '#022c22', opacity: 100, iconColor };
    if (bgPart.includes('blue-950')) return { hex: '#172554', opacity: 100, iconColor };
    if (bgPart.includes('purple-950')) return { hex: '#3b0764', opacity: 100, iconColor };
    return { ...defaultColor, iconColor };
  }

  if (bgPart.length === 9) {
    const hex = bgPart.substring(0, 7);
    const alphaHex = bgPart.substring(7, 9);
    const opacity = Math.round((parseInt(alphaHex, 16) / 255) * 100);
    return { hex, opacity, iconColor };
  }

  if (bgPart.length === 7) {
    return { hex: bgPart, opacity: 100, iconColor };
  }

  return { ...defaultColor, iconColor };
}

const COLOR_OPTIONS = [
  { label: 'Oro (Principal)', value: '#d97706' },
  { label: 'Rojo Sangre (Oscuro)', value: '#7f1d1d' },
  { label: 'Rojo Normal', value: '#ef4444' },
  { label: 'Esmeralda (Seguro/Aliados)', value: '#10b981' },
  { label: 'Azul (Agua/Rutas)', value: '#3b82f6' },
];

export default function MapaAdminControls({
  adminMode,
  setAdminMode,
  selectedMarker,
  setSelectedMarkerId,
  connectingFromId,
  setConnectingFromId,
  markers,
  connections,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onAddConnection,
  onDeleteConnection,
  onUpdateConnection,
  onUpdateAllConnections,
  pendingCoords,
  setPendingCoords,
}: MapaAdminControlsProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [icono, setIcono] = useState('shuriken');
  const [colorHex, setColorHex] = useState('#d97706');
  const [colorOpacity, setColorOpacity] = useState(100);
  const [colorIcono, setColorIcono] = useState('#ffffff');
  const [imagenSala, setImagenSala] = useState('');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Marker states
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editIcono, setEditIcono] = useState('shuriken');
  const [editColorHex, setEditColorHex] = useState('#d97706');
  const [editColorOpacity, setEditColorOpacity] = useState(100);
  const [editColorIcono, setEditColorIcono] = useState('#ffffff');
  const [editImagenSala, setEditImagenSala] = useState('');
  const [editCustomIconUrl, setEditCustomIconUrl] = useState('');
  const [updatingMarker, setUpdatingMarker] = useState(false);

  useEffect(() => {
    if (selectedMarker) {
      setEditNombre(selectedMarker.nombre);
      setEditDescripcion(selectedMarker.descripcion || '');

      const isUrl = selectedMarker.icono.startsWith('http') || selectedMarker.icono.startsWith('/');

      if (isUrl) {
        setEditIcono('url');
        setEditCustomIconUrl(selectedMarker.icono);
      } else {
        setEditIcono(selectedMarker.icono);
        setEditCustomIconUrl('');
      }

      const parsedColor = parseStoredColor(selectedMarker.color_fondo);
      setEditColorHex(parsedColor.hex);
      setEditColorOpacity(parsedColor.opacity);
      setEditColorIcono(parsedColor.iconColor);
      setEditImagenSala(selectedMarker.imagen_sala || '');
    }
  }, [selectedMarker]);

  // Connection config
  const [connectionDestId, setConnectionDestId] = useState('');
  const [connectionColor, setConnectionColor] = useState('#d97706');
  const [connectionImagenIda, setConnectionImagenIda] = useState('');
  const [connectionImagenVuelta, setConnectionImagenVuelta] = useState('');
  const [connectionTipoIcono, setConnectionTipoIcono] = useState<'linea' | 'url'>('linea');
  const [connectionIconoUrl, setConnectionIconoUrl] = useState('');
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [showDestResults, setShowDestResults] = useState(false);

  // Connection editing
  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [editConnColor, setEditConnColor] = useState('#d97706');
  const [editConnImagenIda, setEditConnImagenIda] = useState('');
  const [editConnImagenVuelta, setEditConnImagenVuelta] = useState('');
  const [editConnTipoIcono, setEditConnTipoIcono] = useState<'linea' | 'url'>('linea');
  const [editConnIconoUrl, setEditConnIconoUrl] = useState('');

  // Bulk connection update states
  const [bulkTipoIcono, setBulkTipoIcono] = useState<'linea' | 'url'>('linea');
  const [bulkColor, setBulkColor] = useState('#d97706');
  const [bulkIconoUrl, setBulkIconoUrl] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const { confirm: confirmAction } = useConfirmStore();
  const addToast = useToastStore((state) => state.addToast);

  const handleSaveMarkerChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarker || !editNombre.trim()) return;

    setUpdatingMarker(true);
    try {
      let finalIcon = editIcono;

      if (editIcono === 'url') {
        if (!editCustomIconUrl.trim()) {
          addToast('Por favor introduce una URL válida para el icono.', 'error');
          setUpdatingMarker(false);
          return;
        }
        finalIcon = editCustomIconUrl.trim();
      }

      // Convert opacity to hex alpha byte
      const alphaHex = Math.round((editColorOpacity / 100) * 255).toString(16).padStart(2, '0');
      const finalColor = `${editColorHex}${alphaHex}|${editColorIcono}`;

      await onUpdateMarker(
        selectedMarker.id,
        editNombre,
        editDescripcion || null,
        finalIcon,
        finalColor,
        editImagenSala.trim() || null
      );
    } catch (err: any) {
      addToast(err.message || 'Error al actualizar el marcador.', 'error');
    } finally {
      setUpdatingMarker(false);
    }
  };

  const handleCreateMarker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingCoords || !nombre.trim()) return;

    setSubmitting(true);
    try {
      let finalIcon = icono;

      if (icono === 'url') {
        if (!customIconUrl.trim()) {
          addToast('Por favor introduce una URL de imagen.', 'error');
          setSubmitting(false);
          return;
        }
        finalIcon = customIconUrl.trim();
      }

      // Convert opacity to hex alpha byte
      const alphaHex = Math.round((colorOpacity / 100) * 255).toString(16).padStart(2, '0');
      const finalColor = `${colorHex}${alphaHex}|${colorIcono}`;

      await onAddMarker(
        nombre,
        descripcion || null,
        finalIcon,
        finalColor,
        pendingCoords.lat,
        pendingCoords.lng,
        imagenSala.trim() || null
      );
      setNombre('');
      setDescripcion('');
      setIcono('shuriken');
      setCustomIconUrl('');
      setColorIcono('#ffffff');
      setImagenSala('');
      setPendingCoords(null);
    } catch (err: any) {
      addToast(err.message || 'Error al guardar el marcador.', 'error');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMarkerClick = async () => {
    if (!selectedMarker) return;

    const ok = await confirmAction({
      title: '¿Eliminar Marcador?',
      message: `Esto eliminará de forma permanente el marcador "${selectedMarker.nombre}" y todas las conexiones asociadas a él.`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });

    if (ok) {
      await onDeleteMarker(selectedMarker.id);
      setSelectedMarkerId(null);
    }
  };

  const handleStartConnection = () => {
    if (!selectedMarker) return;
    setConnectingFromId(selectedMarker.id);
  };

  const handleCreateConnection = async () => {
    if (!selectedMarker || !connectionDestId) return;
    await onAddConnection(
      selectedMarker.id,
      connectionDestId,
      connectionColor,
      connectionImagenIda.trim() || null,
      connectionImagenVuelta.trim() || null,
      connectionTipoIcono,
      connectionIconoUrl.trim() || null
    );
    setConnectionDestId('');
    setDestSearchQuery('');
    setConnectionImagenIda('');
    setConnectionImagenVuelta('');
    setConnectionTipoIcono('linea');
    setConnectionIconoUrl('');
    setConnectingFromId(null);
  };

  const handleStartEditConn = (conn: MapaConexion) => {
    setEditingConnId(conn.id);
    setEditConnColor(conn.color);
    setEditConnImagenIda(conn.imagen_ida || '');
    setEditConnImagenVuelta(conn.imagen_vuelta || '');
    setEditConnTipoIcono(conn.tipo_icono || 'linea');
    setEditConnIconoUrl(conn.icono_url || '');
  };

  const handleSaveConn = async (conn: MapaConexion) => {
    if (!onUpdateConnection) return;
    await onUpdateConnection(
      conn.origen_id,
      conn.destino_id,
      editConnColor,
      editConnImagenIda.trim() || null,
      editConnImagenVuelta.trim() || null,
      editConnTipoIcono,
      editConnIconoUrl.trim() || null
    );
    setEditingConnId(null);
  };

  const handleBulkUpdateConnections = async () => {
    if (!onUpdateAllConnections) return;
    const ok = await confirmAction({
      title: '¿Actualizar todas las conexiones?',
      message: 'Esta acción cambiará el estilo, color e icono de todas las conexiones activas en el mapa. ¿Deseas continuar?',
      variant: 'danger',
      confirmLabel: 'Actualizar Todas',
      cancelLabel: 'Cancelar',
    });

    if (!ok) return;

    setBulkUpdating(true);
    try {
      await onUpdateAllConnections(
        bulkTipoIcono,
        bulkColor,
        bulkTipoIcono === 'url' ? bulkIconoUrl.trim() || null : null
      );
    } catch (err: any) {
      addToast(err.message || 'Error al actualizar en masa.', 'error');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleRemoveConnection = async (conn: MapaConexion) => {
    const orig = markers.find((m) => m.id === conn.origen_id);
    const dest = markers.find((m) => m.id === conn.destino_id);
    const label = `${orig?.nombre || 'Desconocido'} ↔ ${dest?.nombre || 'Desconocido'}`;

    const ok = await confirmAction({
      title: '¿Eliminar Conexión?',
      message: `¿Estás seguro de que quieres eliminar la línea de conexión entre ${label}?`,
      variant: 'danger',
      confirmLabel: 'Eliminar Conexión',
      cancelLabel: 'Cancelar',
    });

    if (ok) {
      await onDeleteConnection(conn.origen_id, conn.destino_id);
    }
  };

  // Find connections related to the selected marker
  const markerConnections = connections.filter(
    (c) => c.origen_id === selectedMarker?.id || c.destino_id === selectedMarker?.id
  );

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
      {/* Edit Mode Toggle Card */}
      <div className="ninja-card-oro p-6 w-full lg:w-80 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-oro" />
            <h2 className="text-md font-black text-white uppercase tracking-wider">Modo Editor</h2>
          </div>
          <button
            onClick={() => {
              setAdminMode(!adminMode);
              setSelectedMarkerId(null);
              setConnectingFromId(null);
              setPendingCoords(null);
            }}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${adminMode ? 'ninja-btn-rojo' : 'ninja-btn-oro'
              }`}
          >
            {adminMode ? 'Desactivar' : 'Activar'}
          </button>
        </div>
        <p className="text-xs text-oro/40 font-semibold tracking-wide mt-2">
          {adminMode
            ? 'Haz clic en el mapa para colocar un marcador o selecciona uno existente para editarlo/conectarlo.'
            : 'Estás viendo el mapa interactivo como jugador.'}
        </p>
      </div>

      {/* Editor Active Panel */}
      {adminMode && (
        <div className="flex-1 flex flex-col gap-6">
          {/* New Marker Modal/Form overlay */}
          {pendingCoords && (
            <div className="ninja-card-oro p-6 border-emerald-500/20 bg-zinc-950 animate-in fade-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-oro/10 pb-3 mb-4">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Nuevo Marcador
                </span>
                <button
                  type="button"
                  onClick={() => setPendingCoords(null)}
                  className="text-oro/40 hover:text-oro transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateMarker} className="flex flex-col gap-4">
                <DataField
                  label="Nombre del Punto"
                  value={nombre}
                  onChange={setNombre}
                  placeholder="Ej. Bosque de la Muerte"
                />

                <DataField
                  label="Descripción corta"
                  value={descripcion}
                  onChange={setDescripcion}
                  placeholder="Ej. Bosque de entrenamiento de rango genin"
                />

                <DataField
                  label="URL de la Imagen de la Sala"
                  value={imagenSala}
                  onChange={setImagenSala}
                  placeholder="Ej. https://images.com/sala_bosque.jpg"
                />

                <SelectField
                  label="Tipo de Icono"
                  value={icono}
                  onChange={setIcono}
                  options={ICON_OPTIONS}
                />

                {icono === 'url' && (
                  <DataField
                    label="URL del Icono"
                    value={customIconUrl}
                    onChange={setCustomIconUrl}
                    placeholder="https://example.com/icon.png"
                  />
                )}

                <div className="space-y-3">
                  <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">Color de Fondo del Icono</label>
                  <div className="flex items-center gap-4 bg-black/40 border border-oro/10 px-4 py-3 rounded-xl">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-10 h-10 rounded border border-oro/20 cursor-pointer bg-transparent"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-caption text-oro/40 font-black uppercase tracking-wider">
                        <span>Opacidad</span>
                        <span>{colorOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={colorOpacity}
                        onChange={(e) => setColorOpacity(Number(e.target.value))}
                        className="w-full accent-oro cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">Color del Símbolo/Icono</label>
                  <div className="flex items-center gap-4 bg-black/40 border border-oro/10 px-4 py-3 rounded-xl">
                    <input
                      type="color"
                      value={colorIcono}
                      onChange={(e) => setColorIcono(e.target.value)}
                      className="w-10 h-10 rounded border border-oro/20 cursor-pointer bg-transparent"
                    />
                    <span className="text-caption font-black text-oro/40 uppercase tracking-widest">
                      Color de las líneas del símbolo
                    </span>
                  </div>
                </div>

                <div className="text-caption text-oro/40 font-bold uppercase tracking-wider mt-1">
                  Coordenadas: {pendingCoords.lat.toFixed(1)}, {pendingCoords.lng.toFixed(1)}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-[48px] ninja-btn-oro font-black text-xs uppercase tracking-widest mt-2"
                >
                  {submitting ? 'Guardando...' : 'Crear Marcador'}
                </button>
              </form>
            </div>
          )}

          {/* Selected Marker Edit Panel */}
          {selectedMarker ? (
            <div className="ninja-card-oro p-6 animate-in fade-in duration-200 flex flex-col md:flex-row gap-8 w-full items-start">
              {/* Column 1: Properties Form */}
              <div className="flex-1 w-full flex flex-col gap-4">
                <span className="text-xs font-black text-oro/60 uppercase tracking-widest flex items-center gap-1.5 border-b border-oro/10 pb-2 mb-2">
                  Editar Marcador: {selectedMarker.nombre}
                </span>

                <form onSubmit={handleSaveMarkerChanges} className="flex flex-col gap-4">
                  <DataField
                    label="Nombre"
                    value={editNombre}
                    onChange={setEditNombre}
                  />

                  <DataField
                    label="Descripción"
                    value={editDescripcion}
                    onChange={setEditDescripcion}
                  />

                  <DataField
                    label="URL de la Imagen de la Sala"
                    value={editImagenSala}
                    onChange={setEditImagenSala}
                    placeholder="Ej. https://images.com/sala_bosque.jpg"
                  />

                  <SelectField
                    label="Icono"
                    value={editIcono}
                    onChange={setEditIcono}
                    options={ICON_OPTIONS}
                  />

                  {editIcono === 'url' && (
                    <DataField
                      label="URL del Icono"
                      value={editCustomIconUrl}
                      onChange={setEditCustomIconUrl}
                      placeholder="https://example.com/icon.png"
                    />
                  )}

                  <div className="space-y-3">
                    <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">Color de Fondo del Icono</label>
                    <div className="flex items-center gap-4 bg-black/40 border border-oro/10 px-4 py-3 rounded-xl">
                      <input
                        type="color"
                        value={editColorHex}
                        onChange={(e) => setEditColorHex(e.target.value)}
                        className="w-10 h-10 rounded border border-oro/20 cursor-pointer bg-transparent"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-caption text-oro/40 font-black uppercase tracking-wider">
                          <span>Opacidad</span>
                          <span>{editColorOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={editColorOpacity}
                          onChange={(e) => setEditColorOpacity(Number(e.target.value))}
                          className="w-full accent-oro cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">Color del Símbolo/Icono</label>
                    <div className="flex items-center gap-4 bg-black/40 border border-oro/10 px-4 py-3 rounded-xl">
                      <input
                        type="color"
                        value={editColorIcono}
                        onChange={(e) => setEditColorIcono(e.target.value)}
                        className="w-10 h-10 rounded border border-oro/20 cursor-pointer bg-transparent"
                      />
                      <span className="text-caption font-black text-oro/40 uppercase tracking-widest">
                        Color de las líneas del símbolo
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingMarker}
                    className="w-full h-[48px] ninja-btn-oro font-black text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> {updatingMarker ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </form>
              </div>

              {/* Vertical Divider */}
              <div className="hidden md:block w-[1px] self-stretch bg-oro/10" />

              {/* Column 2: Connections and Actions */}
              <div className="w-full md:w-80 shrink-0 flex flex-col gap-6">
                {/* Trazar Conexiones */}
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-black text-oro uppercase tracking-wider flex items-center gap-1.5 border-b border-oro/10 pb-2">
                    <Link2 className="w-4 h-4" /> Conectar con otro punto
                  </span>

                  {connectingFromId === selectedMarker.id ? (
                    <div className="flex flex-col gap-3 bg-oro/[0.02] border border-oro/10 p-4 rounded-xl">
                      {/* Searchable Connection Destination Selector */}
                      <div className="space-y-1 relative">
                        <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">
                          Conectar con:
                        </label>
                        
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Buscar destino..."
                            value={destSearchQuery}
                            onChange={(e) => {
                              setDestSearchQuery(e.target.value);
                              setConnectionDestId(''); // Reset selection if typing
                              setShowDestResults(true);
                            }}
                            onFocus={() => setShowDestResults(true)}
                            onBlur={() => setTimeout(() => setShowDestResults(false), 200)}
                            className="w-full bg-black/40 border border-oro/10 hover:border-oro/30 focus:border-oro/60 rounded-xl py-3 px-4 text-xs text-white placeholder-oro/30 uppercase tracking-widest font-black outline-none transition-all duration-300 shadow-xl"
                          />
                          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40 pointer-events-none" />
                        </div>

                        {/* Dropdown list of matching destinations */}
                        {showDestResults && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950/95 border border-oro/20 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.9)] overflow-hidden z-[100] max-h-48 overflow-y-auto divide-y divide-oro/5">
                            {markers
                              .filter((m) => m.id !== selectedMarker.id)
                              .filter((m) =>
                                m.nombre.toLowerCase().includes(destSearchQuery.toLowerCase())
                              )
                              .map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setConnectionDestId(m.id);
                                    setDestSearchQuery(m.nombre);
                                    setShowDestResults(false);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-white hover:bg-oro/10 hover:text-oro transition-all duration-200"
                                >
                                  {m.nombre}
                                </button>
                              ))}
                            {markers
                              .filter((m) => m.id !== selectedMarker.id)
                              .filter((m) =>
                                m.nombre.toLowerCase().includes(destSearchQuery.toLowerCase())
                              ).length === 0 && (
                              <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-oro/40 text-center">
                                No hay coincidencias
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <SelectField
                        label="Color de la línea"
                        value={connectionColor}
                        onChange={setConnectionColor}
                        options={COLOR_OPTIONS}
                      />

                      {/* Icon type selector */}
                      <div className="space-y-1">
                        <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">Tipo de Icono en el Mapa</label>
                        <div className="flex gap-2">
                          {(['linea', 'url'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setConnectionTipoIcono(t)}
                              className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest border rounded transition-all ${
                                connectionTipoIcono === t
                                  ? 'bg-oro text-zinc-950 border-oro'
                                  : 'bg-black/40 text-oro/60 border-oro/10 hover:border-oro/30'
                              }`}
                            >
                              {t === 'linea' ? '➖ Línea' : '🖼️ URL'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {connectionTipoIcono === 'url' && (
                        <DataField
                          label="URL del Icono Personalizado"
                          value={connectionIconoUrl}
                          onChange={setConnectionIconoUrl}
                          placeholder="https://example.com/icono.png"
                        />
                      )}

                      <DataField
                        label={`Imagen Ida (${selectedMarker.nombre} → destino)`}
                        value={connectionImagenIda}
                        onChange={setConnectionImagenIda}
                        placeholder="URL imagen yendo desde este punto"
                      />

                      <DataField
                        label={`Imagen Vuelta (destino → ${selectedMarker.nombre})`}
                        value={connectionImagenVuelta}
                        onChange={setConnectionImagenVuelta}
                        placeholder="URL imagen volviendo hacia este punto"
                      />

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleCreateConnection}
                          disabled={!connectionDestId}
                          className="flex-1 py-2 bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all"
                        >
                          Establecer Línea
                        </button>
                        <button
                          onClick={() => setConnectingFromId(null)}
                          className="px-4 py-2 border border-rojo-sangre/40 hover:bg-rojo-sangre/10 text-rojo-sangre font-black text-xs uppercase tracking-widest transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleStartConnection}
                      className="w-full py-2 bg-oro/10 border border-oro/20 hover:bg-oro/20 text-oro font-black text-xs uppercase tracking-widest transition-all"
                    >
                      Trazar Línea de Conexión
                    </button>
                  )}
                </div>

                {/* List current connections of this marker */}
                {markerConnections.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-black text-oro/60 uppercase tracking-wider">
                      Conexiones Activas ({markerConnections.length})
                    </span>
                    <div className="max-h-[400px] overflow-y-auto space-y-2 border border-oro/5 p-2 rounded bg-black/20 custom-scrollbar">
                      {markerConnections.map((conn) => {
                        const otherId = conn.origen_id === selectedMarker.id ? conn.destino_id : conn.origen_id;
                        const otherMarker = markers.find((m) => m.id === otherId);
                        const isEditing = editingConnId === conn.id;
                        return (
                          <div
                            key={conn.id}
                            className="flex flex-col text-xs text-oro/70 bg-black/40 border border-oro/5 hover:border-oro/15 rounded overflow-hidden"
                          >
                            {/* Header row */}
                            <div className="flex items-center justify-between px-3 py-2">
                              <span className="font-bold uppercase tracking-wider truncate">
                                {otherMarker?.nombre || 'Desconocido'}
                              </span>
                              <div className="flex items-center gap-1.5 ml-2">
                                <button
                                  onClick={() => isEditing ? setEditingConnId(null) : handleStartEditConn(conn)}
                                  className="text-oro/60 hover:text-oro transition-colors"
                                  title={isEditing ? 'Cancelar edición' : 'Editar conexión'}
                                >
                                  {isEditing ? <X className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleRemoveConnection(conn)}
                                  className="text-rojo-sangre/60 hover:text-rojo-sangre transition-colors"
                                  title="Eliminar conexión"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Inline Edit Form */}
                              {isEditing && (
                              <div className="flex flex-col gap-2.5 px-3 pb-3 pt-1 border-t border-oro/5 bg-black/20">
                                <SelectField
                                  label="Color"
                                  value={editConnColor}
                                  onChange={setEditConnColor}
                                  options={COLOR_OPTIONS}
                                />

                                {/* Icon type selector */}
                                <div className="space-y-1">
                                  <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">Tipo de Icono</label>
                                  <div className="flex gap-2">
                                    {(['linea', 'url'] as const).map((t) => (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => setEditConnTipoIcono(t)}
                                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest border rounded transition-all ${
                                          editConnTipoIcono === t
                                            ? 'bg-oro text-zinc-950 border-oro'
                                            : 'bg-black/40 text-oro/60 border-oro/10 hover:border-oro/30'
                                        }`}
                                      >
                                        {t === 'linea' ? '➖ Línea' : '🖼️ URL'}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {editConnTipoIcono === 'url' && (
                                  <DataField
                                    label="URL del Icono Personalizado"
                                    value={editConnIconoUrl}
                                    onChange={setEditConnIconoUrl}
                                    placeholder="https://example.com/icono.png"
                                  />
                                )}

                                <DataField
                                  label={`Imagen Ida (${selectedMarker.nombre} → ${otherMarker?.nombre})`}
                                  value={editConnImagenIda}
                                  onChange={setEditConnImagenIda}
                                  placeholder="URL imagen yendo desde este punto"
                                />
                                <DataField
                                  label={`Imagen Vuelta (${otherMarker?.nombre} → ${selectedMarker.nombre})`}
                                  value={editConnImagenVuelta}
                                  onChange={setEditConnImagenVuelta}
                                  placeholder="URL imagen volviendo hacia este punto"
                                />
                                <button
                                  onClick={() => handleSaveConn(conn)}
                                  className="w-full py-2 bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                >
                                  <Save className="w-3.5 h-3.5" /> Guardar Cambios
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="h-[1px] bg-oro/10" />

                {/* Delete marker action */}
                <button
                  onClick={handleDeleteMarkerClick}
                  className="w-full py-3 bg-rojo-sangre/10 border border-rojo-sangre/20 hover:bg-rojo-sangre hover:text-white text-rojo-sangre font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar Marcador
                </button>
              </div>
            </div>
          ) : (
            !pendingCoords && (
              <div className="ninja-card-oro p-6 text-center text-oro/40 font-semibold tracking-wide text-xs italic py-12">
                Haz clic en el mapa para colocar un marcador o selecciona un marcador existente para ver sus controles.
              </div>
            )
          )}

          {/* Bulk Update Connections Panel (Always visible at the bottom of Editor Mode) */}
          <div className="ninja-card-oro p-6 animate-in fade-in duration-200 flex flex-col gap-4">
            <span className="text-xs font-black text-oro uppercase tracking-wider flex items-center gap-1.5 border-b border-oro/10 pb-2">
              <Layers className="w-4 h-4" /> Acciones Globales (Conexiones)
            </span>
            <p className="text-[11px] text-oro/40 font-semibold leading-relaxed">
              Cambia el tipo, color o icono de todas las conexiones existentes en el mapa simultáneamente.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-2">
              <SelectField
                label="Color de línea global"
                value={bulkColor}
                onChange={setBulkColor}
                options={COLOR_OPTIONS}
              />

              <div className="space-y-1">
                <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">Tipo de Icono Global</label>
                <div className="flex gap-2">
                  {(['linea', 'url'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBulkTipoIcono(t)}
                      className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest border rounded transition-all ${
                        bulkTipoIcono === t
                          ? 'bg-oro text-zinc-950 border-oro'
                          : 'bg-black/40 text-oro/60 border-oro/10 hover:border-oro/30'
                      }`}
                    >
                      {t === 'linea' ? '➖ Líneas' : '🖼️ Icono URL'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBulkUpdateConnections}
                  disabled={bulkUpdating}
                  className="w-full py-3 bg-oro hover:bg-amber-500 text-zinc-950 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {bulkUpdating ? 'Aplicando...' : 'Aplicar a Todas'}
                </button>
              </div>
            </div>

            {bulkTipoIcono === 'url' && (
              <div className="max-w-md">
                <DataField
                  label="URL del Icono Personalizado Global"
                  value={bulkIconoUrl}
                  onChange={setBulkIconoUrl}
                  placeholder="https://example.com/icono.png"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
