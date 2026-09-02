'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapaMarcador, MapaConexion } from '@/services/supabase/mapa.service';

interface MapaInteractivoProps {
  markers: MapaMarcador[];
  connections: MapaConexion[];
  adminMode: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (marker: MapaMarcador) => void;
  onMarkerDragEnd?: (id: string, lat: number, lng: number) => Promise<void> | void;
  selectedMarkerId?: string | null;
  connectingFromId?: string | null;
}

// Icon dictionary mapped to HTML representing premium UI designs with Tailwind
const getIconHtml = (icono: string, colorFondo: string, isSelected: boolean, isConnecting: boolean) => {
  const parts = colorFondo.split('|');
  const bgVal = parts[0];
  const iconColor = parts[1] || '#ffffff';

  let opacity = 1;
  if (bgVal.startsWith('#') && bgVal.length === 9) {
    const alphaHex = bgVal.substring(7, 9);
    opacity = parseInt(alphaHex, 16) / 255;
  }

  let borderStyle = '';
  if (opacity === 0) {
    borderStyle = 'border-color: transparent !important; box-shadow: none !important;';
  } else if (bgVal.startsWith('#')) {
    if (!isSelected && !isConnecting) {
      // Scale border-oro/30 opacity based on background opacity
      const alphaHex = Math.round(opacity * 0.3 * 255).toString(16).padStart(2, '0');
      borderStyle = `border-color: #d97706${alphaHex};`;
    }
  }

  let borderRingClass = 'border-oro/30';
  if (isSelected) {
    borderRingClass = opacity === 0 ? '' : 'border-emerald-400 ring-4 ring-emerald-500/30';
  } else if (isConnecting) {
    borderRingClass = opacity === 0 ? 'animate-bounce' : 'border-amber-400 animate-bounce ring-4 ring-amber-500/30';
  }

  // Check if colorFondo is hex or tailwind class
  const bgStyle = bgVal.startsWith('#') ? `style="background-color: ${bgVal}; color: ${iconColor}; ${borderStyle}"` : `style="color: ${iconColor};"`;
  const bgClass = bgVal.startsWith('#') ? '' : bgVal;

  const isUrl = icono.startsWith('http://') || icono.startsWith('https://') || icono.startsWith('/');
  const isMuralla = icono === 'muralla';
  const sizeClass = isMuralla ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
  const svgSizeClass = isMuralla ? 'w-4 h-4' : 'w-5 h-5';
  const imgSizeClass = isMuralla ? 'w-5.5 h-5.5' : 'w-7 h-7';

  let contentHtml = '';
  if (isUrl) {
    // Custom uploaded image icon
    contentHtml = `<img src="${icono}" class="${imgSizeClass} object-contain rounded-lg" alt="icon" />`;
  } else {
    // SVG options
    let iconSvg = '';
    switch (icono) {
      case 'aldea':
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${svgSizeClass}">
            <path d="M2 22h20M12 2v6M9 8h6M5 12h14M7 16h10M4 22V12M20 22V12M9 12v10M15 12v10"/>
          </svg>
        `;
        break;
      case 'cueva':
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${svgSizeClass}">
            <path d="M12 2L2 22h20L12 2zM12 12v6M9 15h6"/>
          </svg>
        `;
        break;
      case 'bosque':
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${svgSizeClass}">
            <path d="M12 2L3 9h18L12 2zM12 8L5 15h14L12 8zM12 14v8M9 22h6"/>
          </svg>
        `;
        break;
      case 'templo':
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${svgSizeClass}">
            <path d="M3 5h18M5 5v17M19 5v17M2 9h20M9 9v13M15 9v13"/>
          </svg>
        `;
        break;
      case 'lago':
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${svgSizeClass}">
            <path d="M2 6c4-2 6-2 10 0s6 2 10 0M2 12c4-2 6-2 10 0s6 2 10 0M2 18c4-2 6-2 10 0s6 2 10 0"/>
          </svg>
        `;
        break;
      case 'muralla':
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${svgSizeClass}">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <path d="M2 12h20M7 5v7M17 5v7M12 12v7"/>
          </svg>
        `;
        break;
      case 'shuriken':
      default:
        iconSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-black">
            <circle cx="12" cy="12" r="10" />
          </svg>
        `;
        break;
    }
    contentHtml = iconSvg;
  }

  return `
    <div class="relative group flex items-center justify-center">
      <!-- Glow effect -->
      <div class="absolute inset-0 rounded-full bg-oro/20 blur-md group-hover:scale-150 transition-all duration-300"></div>
      
      <!-- Icon body -->
      <div ${bgStyle} class="relative ${sizeClass} border flex items-center justify-center transition-all duration-300 shadow-xl ${bgClass} ${borderRingClass}">
        ${contentHtml}
      </div>
    </div>
  `;
};

export default function MapaInteractivo({
  markers,
  connections,
  adminMode,
  onMapClick,
  onMarkerClick,
  onMarkerDragEnd,
  selectedMarkerId,
  connectingFromId,
}: MapaInteractivoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayersRef = useRef<{ [id: string]: L.Marker }>({});
  const polylineLayersRef = useRef<L.Layer[]>([]);

  // Dimensions of the coordinate space (matches image aspect ratio approximately)
  const mapHeight = 819;
  const mapWidth = 1024;
  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [mapHeight, mapWidth],
  ];

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 768;

    // Initialize Leaflet map with Simple Coordinate Reference System
    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      dragging: isMobileInit,
      tap: false,
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      keyboard: false,
      attributionControl: false,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
    } as any);

    // Image overlay for the fantasy map
    L.imageOverlay('/assets/images/mapa.webp', bounds).addTo(map);

    // Fit map to show the whole image perfectly
    map.fitBounds(bounds);

    // Keep covering container or enabling drag on window/container resize
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        map.dragging.enable();
      } else {
        map.dragging.disable();
        map.fitBounds(bounds);
      }
    };
    map.on('resize', handleResize);

    mapRef.current = map;

    // Click handler on map (for placing markers in admin mode)
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      // Trigger callback if we clicked on the map canvas itself
      // (Leaflet propagates but we can filter clicks on markers)
      if (adminMode && onMapClick) {
        onMapClick(lat, lng);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [adminMode, onMapClick]);

  // Redraw Markers and Connections when they change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old marker layers
    Object.values(markerLayersRef.current).forEach((m) => m.remove());
    markerLayersRef.current = {};

    // Clear old connections
    polylineLayersRef.current.forEach((l) => l.remove());
    polylineLayersRef.current = [];

    // 1. Draw Connections (Lines or custom url icon trails) as curved paths
    connections.forEach((conn) => {
      const orig = markers.find((m) => m.id === conn.origen_id);
      const dest = markers.find((m) => m.id === conn.destino_id);

      if (orig && dest) {
        const color = conn.color || '#d97706';
        const tipoIcono = conn.tipo_icono || 'linea';

        // Calculate control point for a quadratic Bezier curve
        const P0 = [orig.lat, orig.lng];
        const P1 = [dest.lat, dest.lng];

        // Midpoint
        const midLat = (P0[0] + P1[0]) / 2;
        const midLng = (P0[1] + P1[1]) / 2;

        // Vector and perpendicular direction
        const dLat = P1[0] - P0[0];
        const dLng = P1[1] - P0[1];
        const len = Math.sqrt(dLat * dLat + dLng * dLng);

        // Normalize perpendicular vector
        const normLat = -dLng / len;
        const normLng = dLat / len;

        // Curve offset: 12% of length, giving a subtle premium curve
        const curveOffset = len * 0.12;

        const ctrlLat = midLat + normLat * curveOffset;
        const ctrlLng = midLng + normLng * curveOffset;

        if (tipoIcono === 'url' && conn.icono_url) {
          // Draw as a trail of custom icons along the curve
          const stepCount = Math.max(2, Math.min(30, Math.round(len / 28)));
          const stepSize = 1 / (stepCount + 1);

          for (let i = 1; i <= stepCount; i++) {
            const t = i * stepSize;
            
            // Quadratic Bezier formula
            const lat = (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * ctrlLat + t * t * P1[0];
            const lng = (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * ctrlLng + t * t * P1[1];

            // Tangent vector to rotate the icon along the curve
            const tLat = 2 * (1 - t) * (ctrlLat - P0[0]) + 2 * t * (P1[0] - ctrlLat);
            const tLng = 2 * (1 - t) * (ctrlLng - P0[1]) + 2 * t * (P1[1] - ctrlLng);
            const angleDeg = (Math.atan2(tLng, tLat) * 180) / Math.PI;

            const htmlContent = `
              <img src="${conn.icono_url}" 
                style="width:18px;height:18px;object-fit:contain;transform:rotate(${angleDeg}deg);display:block;opacity:0.9;" 
                alt="icono-camino" 
              />
            `;

            const fpIcon = L.divIcon({
              className: '',
              html: htmlContent,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });

            const fpMarker = L.marker([lat, lng], { icon: fpIcon, interactive: false }).addTo(map);
            polylineLayersRef.current.push(fpMarker);
          }
        } else {
          // Default: generate segment points along the Bezier curve and draw a curved polyline
          const curvePoints: [number, number][] = [];
          const segments = 20;

          for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const lat = (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * ctrlLat + t * t * P1[0];
            const lng = (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * ctrlLng + t * t * P1[1];
            curvePoints.push([lat, lng]);
          }

          const polyline = L.polyline(curvePoints, {
            color: color,
            weight: 4,
            opacity: 0.85,
            dashArray: color === '#d97706' ? undefined : '5, 10', // Dotted line if custom color
          }).addTo(map);

          polylineLayersRef.current.push(polyline);
        }
      }
    });

    // 2. Draw Markers
    markers.forEach((marker) => {
      const isSelected = marker.id === selectedMarkerId;
      const isConnecting = marker.id === connectingFromId;

      const isMuralla = marker.icono === 'muralla';
      const size = isMuralla ? 32 : 40;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: getIconHtml(marker.icono, marker.color_fondo || 'bg-oro', isSelected, isConnecting),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const mapMarker = L.marker([marker.lat, marker.lng], {
        icon: customIcon,
        draggable: adminMode,
      }).addTo(map);

      // Tooltip/label on hover
      mapMarker.bindTooltip(
        `<div class="bg-zinc-950/95 text-oro border border-oro/30 px-3 py-1.5 rounded-lg text-sm font-black tracking-wider uppercase">${marker.nombre}</div>`,
        {
          direction: 'top',
          offset: [0, -15],
          opacity: 0.9,
          className: 'leaflet-tooltip-custom',
        }
      );

      // Click handler
      mapMarker.on('click', (e) => {
        // Prevent map click trigger
        L.DomEvent.stopPropagation(e);
        if (onMarkerClick) {
          onMarkerClick(marker);
        }
      });

      // Dragend handler
      mapMarker.on('dragend', (e) => {
        const markerTarget = e.target;
        const position = markerTarget.getLatLng();
        if (onMarkerDragEnd) {
          onMarkerDragEnd(marker.id, position.lat, position.lng);
        }
      });

      markerLayersRef.current[marker.id] = mapMarker;
    });
  }, [markers, connections, selectedMarkerId, connectingFromId, onMarkerClick, onMarkerDragEnd, adminMode]);

  // Center map on searched/selected marker on mobile format
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedMarkerId) return;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      const marker = markers.find((m) => m.id === selectedMarkerId);
      if (marker) {
        map.setView([marker.lat, marker.lng], map.getZoom() || 0, { animate: true });
      }
    }
  }, [selectedMarkerId, markers]);

  return (
    <div className="relative w-full max-w-[1024px] mx-auto overflow-hidden md:overflow-visible rounded-2xl shadow-2xl">
      {/* Map Target Element */}
      <div
        ref={containerRef}
        className="w-full aspect-[1024/819] max-h-[819px] bg-zinc-950 border border-oro/10 rounded-2xl cursor-default overflow-hidden md:overflow-visible"
      />

      {/* Embedded style overrides for Leaflet tooltip & container */}
      <style jsx global>{`
        @media (min-width: 768px) {
          .leaflet-container {
            background-color: #09090b !important;
            overflow: visible !important;
            border-radius: 1rem !important;
            touch-action: none !important;
          }
        }
        @media (max-width: 767px) {
          .leaflet-container {
            background-color: #09090b !important;
            overflow: hidden !important;
            border-radius: 1rem !important;
            touch-action: pan-x pan-y !important;
          }
        }
        .leaflet-tooltip-custom {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          z-index: 4000 !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: rgba(9, 9, 11, 0.95) !important;
        }
      `}</style>
    </div>
  );
}
