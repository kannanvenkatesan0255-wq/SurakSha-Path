/**
 * InteractiveMap Component for Suraksha Path.
 * Leaflet-powered cartographic canvas for Chennai Metropolitan Area.
 *
 * Implements:
 *  - Responsive Leaflet map container lifecycle
 *  - Configurable basemaps (CartoDB Dark Matter / Voyager / OSM)
 *  - Origin and Destination marker synchronization with form state
 *  - Click-to-select location workflow with catalog proximity resolution
 *  - Demo safety infrastructure overlay layers
 *  - Accessible viewport controls (Zoom, Reset, Fit Bounds, Basemap toggle)
 *  - Non-intrusive error & offline tile handling
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DEFAULT_CHENNAI_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  CHENNAI_METRO_BOUNDS,
  getActiveBasemap,
  isValidCoordinate,
  formatCoordinates,
  haversineDistanceKm,
} from './mapConfig';
import {
  createOriginDivIcon,
  createDestinationDivIcon,
  createSelectionDivIcon,
  createInfrastructureDivIcon,
  formatMarkerPopup,
} from './markerUtils';
import { CHENNAI_INFRASTRUCTURE_POINTS } from './mapOverlays';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { CHENNAI_LOCATION_CATALOG } from '../../services/locationService';

export function InteractiveMap({
  originLocation = null, // { name, lat, lng, address }
  destinationLocation = null, // { name, lat, lng, address }
  routes = [], // Array of RouteAlternative from routing engine
  selectedRouteId = null,
  onSelectRoute = null,
  onSelectOrigin,
  onSelectDestination,
  onClearOrigin,
  onClearDestination,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const selectionMarkerRef = useRef(null);
  const infraLayerGroupRef = useRef(null);
  const routeLayerGroupRef = useRef(null);

  // Keep latest callbacks in ref to avoid reinitializing map
  const callbacksRef = useRef({ onSelectOrigin, onSelectDestination });
  useEffect(() => {
    callbacksRef.current = { onSelectOrigin, onSelectDestination };
  }, [onSelectOrigin, onSelectDestination]);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [tileWarning, setTileWarning] = useState(null);

  const [currentCenter, setCurrentCenter] = useState(DEFAULT_CHENNAI_CENTER);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [activeBasemap, setActiveBasemap] = useState('DARK_MATTER');
  const [clickMode, setClickMode] = useState('INSPECT');
  const [activeLayers, setActiveLayers] = useState({
    lighting: true,
    police: true,
    cctv: false,
    crowd: false,
  });

  // Calculate straight-line distance if both endpoints have coordinates
  const straightLineDistance =
    originLocation?.lat &&
    originLocation?.lng &&
    destinationLocation?.lat &&
    destinationLocation?.lng &&
    isValidCoordinate(originLocation.lat, originLocation.lng) &&
    isValidCoordinate(destinationLocation.lat, destinationLocation.lng)
      ? haversineDistanceKm(
          originLocation.lat,
          originLocation.lng,
          destinationLocation.lat,
          destinationLocation.lng
        )
      : null;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // Prevent double-initialization in React 19 StrictMode

    try {
      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CHENNAI_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        maxBounds: CHENNAI_METRO_BOUNDS,
        maxBoundsViscosity: 0.8,
        zoomControl: false,
        attributionControl: false,
      });

      const basemapConfig = getActiveBasemap('DARK_MATTER');
      const tileLayer = L.tileLayer(basemapConfig.url, {
        attribution: basemapConfig.attribution,
        subdomains: basemapConfig.subdomains,
        maxZoom: basemapConfig.maxZoom,
      });

      tileLayer.on('tileerror', () => {
        setTileWarning('Notice: Some basemap tiles failed to load. Check internet connectivity.');
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      // Track center & zoom changes
      map.on('moveend', () => {
        const center = map.getCenter();
        setCurrentCenter([Number(center.lat.toFixed(4)), Number(center.lng.toFixed(4))]);
        setCurrentZoom(map.getZoom());
      });

      // Layer group for infrastructure pins
      const infraGroup = L.layerGroup().addTo(map);
      infraLayerGroupRef.current = infraGroup;

      // Layer group for route polylines
      const routeGroup = L.layerGroup().addTo(map);
      routeLayerGroupRef.current = routeGroup;

      // Handle Map Click for Location Selection
      map.on('click', (e) => {
        const clickLat = Number(e.latlng.lat.toFixed(4));
        const clickLng = Number(e.latlng.lng.toFixed(4));

        // Check if clicked location is near any known Chennai catalog landmark (<= 400m)
        let matchedLocation = null;
        let minDistance = 0.4; // 400 meters

        for (const item of CHENNAI_LOCATION_CATALOG) {
          const dist = haversineDistanceKm(clickLat, clickLng, item.lat, item.lng);
          if (dist < minDistance) {
            minDistance = dist;
            matchedLocation = item;
          }
        }

        const pointName = matchedLocation
          ? `${matchedLocation.name} (Vicinity)`
          : `Selected Point (${formatCoordinates(clickLat, clickLng)})`;
        const pointAddress = matchedLocation ? matchedLocation.address : 'Chennai Metropolitan Area';

        // Temporary selection marker popup
        if (selectionMarkerRef.current) {
          map.removeLayer(selectionMarkerRef.current);
        }

        const popupHtml = `
          <div style="font-family: var(--font-sans); min-width: 200px; padding: 4px;">
            <div style="font-size: 0.7rem; font-weight: 700; color: #06b6d4; margin-bottom: 4px;">
              MAP CLICK SELECTION
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #f8fafc; margin-bottom: 4px;">
              ${pointName}
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 6px;">
              ${pointAddress}
            </div>
            <div style="font-size: 0.7rem; color: #64748b; font-family: var(--font-mono); margin-bottom: 8px;">
              ${formatCoordinates(clickLat, clickLng)}
            </div>
            <div style="display: flex; gap: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;">
              <button id="btn-popup-set-origin" class="btn btn-sm btn-primary" style="flex: 1; font-size: 0.7rem; padding: 3px 6px;">
                📍 Set Origin
              </button>
              <button id="btn-popup-set-dest" class="btn btn-sm btn-secondary" style="flex: 1; font-size: 0.7rem; padding: 3px 6px;">
                🏁 Set Dest
              </button>
            </div>
          </div>
        `;

        const selMarker = L.marker([clickLat, clickLng], {
          icon: createSelectionDivIcon(),
        })
          .addTo(map)
          .bindPopup(popupHtml, { closeButton: true, autoClose: true })
          .openPopup();

        selectionMarkerRef.current = selMarker;

        // Attach popup button event handlers
        setTimeout(() => {
          const btnOrigin = document.getElementById('btn-popup-set-origin');
          const btnDest = document.getElementById('btn-popup-set-dest');

          if (btnOrigin) {
            btnOrigin.onclick = () => {
              if (callbacksRef.current.onSelectOrigin) {
                callbacksRef.current.onSelectOrigin({
                  name: pointName,
                  address: pointAddress,
                  lat: clickLat,
                  lng: clickLng,
                  isResolved: true,
                });
              }
              map.closePopup();
              if (selectionMarkerRef.current) {
                map.removeLayer(selectionMarkerRef.current);
                selectionMarkerRef.current = null;
              }
            };
          }

          if (btnDest) {
            btnDest.onclick = () => {
              if (callbacksRef.current.onSelectDestination) {
                callbacksRef.current.onSelectDestination({
                  name: pointName,
                  address: pointAddress,
                  lat: clickLat,
                  lng: clickLng,
                  isResolved: true,
                });
              }
              map.closePopup();
              if (selectionMarkerRef.current) {
                map.removeLayer(selectionMarkerRef.current);
                selectionMarkerRef.current = null;
              }
            };
          }
        }, 50);
      });

      // ResizeObserver to handle layout and sidebar changes
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      mapRef.current = map;
      setMapReady(true);
    } catch (err) {
      console.error('Failed to initialize Leaflet map:', err);
      setMapError(err.message || 'Unable to initialize map.');
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Basemap when toggled
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const config = getActiveBasemap(activeBasemap);
    const newTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: config.subdomains,
      maxZoom: config.maxZoom,
    });

    newTileLayer.addTo(mapRef.current);
    tileLayerRef.current = newTileLayer;
  }, [activeBasemap, mapReady]);

  // Update Origin Marker
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    if (originMarkerRef.current) {
      mapRef.current.removeLayer(originMarkerRef.current);
      originMarkerRef.current = null;
    }

    if (
      originLocation &&
      isValidCoordinate(originLocation.lat, originLocation.lng)
    ) {
      const { lat, lng, name, address } = originLocation;
      const popupContent = formatMarkerPopup({
        role: 'ORIGIN',
        title: name || 'Origin Location',
        address: address || '',
        lat,
        lng,
        details: 'Active Journey Start Point',
        actionHtml: `
          <button id="btn-clear-origin" class="btn btn-sm btn-subtle" style="font-size: 0.7rem; padding: 2px 6px; width: 100%;">
            Clear Origin
          </button>
        `,
      });

      const marker = L.marker([lat, lng], {
        icon: createOriginDivIcon(name || 'Origin'),
        zIndexOffset: 1000,
      })
        .addTo(mapRef.current)
        .bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btnClear = document.getElementById('btn-clear-origin');
        if (btnClear && onClearOrigin) {
          btnClear.onclick = () => {
            onClearOrigin();
            mapRef.current.closePopup();
          };
        }
      });

      originMarkerRef.current = marker;
    }
  }, [originLocation, mapReady, onClearOrigin]);

  // Update Destination Marker
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    if (destMarkerRef.current) {
      mapRef.current.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    if (
      destinationLocation &&
      isValidCoordinate(destinationLocation.lat, destinationLocation.lng)
    ) {
      const { lat, lng, name, address } = destinationLocation;
      const popupContent = formatMarkerPopup({
        role: 'DESTINATION',
        title: name || 'Destination Location',
        address: address || '',
        lat,
        lng,
        details: 'Active Target Destination',
        actionHtml: `
          <button id="btn-clear-dest" class="btn btn-sm btn-subtle" style="font-size: 0.7rem; padding: 2px 6px; width: 100%;">
            Clear Destination
          </button>
        `,
      });

      const marker = L.marker([lat, lng], {
        icon: createDestinationDivIcon(name || 'Destination'),
        zIndexOffset: 1000,
      })
        .addTo(mapRef.current)
        .bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btnClear = document.getElementById('btn-clear-dest');
        if (btnClear && onClearDestination) {
          btnClear.onclick = () => {
            onClearDestination();
            mapRef.current.closePopup();
          };
        }
      });

      destMarkerRef.current = marker;
    }
  }, [destinationLocation, mapReady, onClearDestination]);

  // Update Infrastructure Layer Pins
  useEffect(() => {
    if (!mapRef.current || !mapReady || !infraLayerGroupRef.current) return;

    infraLayerGroupRef.current.clearLayers();

    CHENNAI_INFRASTRUCTURE_POINTS.forEach((point) => {
      // Check if this layer is currently enabled
      if (!activeLayers[point.layer]) return;

      const marker = L.marker([point.lat, point.lng], {
        icon: createInfrastructureDivIcon(point.layer),
        zIndexOffset: 500,
      }).bindPopup(
        formatMarkerPopup({
          role: 'INFRASTRUCTURE',
          title: point.name,
          details: point.details,
          lat: point.lat,
          lng: point.lng,
        })
      );

      infraLayerGroupRef.current.addLayer(marker);
    });
  }, [activeLayers, mapReady]);

  // Update Route Polylines from Routing Engine (Phase 6)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !routeLayerGroupRef.current) return;

    routeLayerGroupRef.current.clearLayers();

    if (!routes || routes.length === 0) return;

    let selectedPolyline = null;

    routes.forEach((route) => {
      const isSelected = route.route_id === selectedRouteId;
      const coords = route.coordinates || [];
      if (coords.length < 2) return;

      // GeoJSON coordinates are [lng, lat] -> convert to Leaflet [lat, lng]
      const latLngs = coords.map(([lng, lat]) => [lat, lng]);

      const distText = route.metrics?.distance_km ? `${route.metrics.distance_km} km` : '';
      const durText = route.metrics?.duration_minutes ? `${route.metrics.duration_minutes} min` : '';

      if (isSelected) {
        // High-contrast background casing glow
        const casing = L.polyline(latLngs, {
          color: '#0284c7',
          weight: 9,
          opacity: 0.45,
          lineCap: 'round',
          lineJoin: 'round',
        });
        routeLayerGroupRef.current.addLayer(casing);

        // Active foreground polyline
        const line = L.polyline(latLngs, {
          color: '#06b6d4',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });

        line.bindTooltip(
          `<strong>${route.title}</strong><br/>${distText} • ${durText} (Active Route)`,
          { sticky: true, className: 'suraksha-route-tooltip' }
        );

        routeLayerGroupRef.current.addLayer(line);
        selectedPolyline = line;
      } else {
        // Subdued unselected alternative
        const line = L.polyline(latLngs, {
          color: '#64748b',
          weight: 4,
          opacity: 0.6,
          dashArray: '6, 8',
          lineCap: 'round',
          lineJoin: 'round',
        });

        line.bindTooltip(
          `<strong>${route.title}</strong><br/>${distText} • ${durText} (Click to Select)`,
          { sticky: true, className: 'suraksha-route-tooltip' }
        );

        line.on('click', () => {
          if (onSelectRoute) {
            onSelectRoute(route.route_id);
          }
        });

        routeLayerGroupRef.current.addLayer(line);
      }
    });

    if (selectedPolyline) {
      selectedPolyline.bringToFront();
      mapRef.current.fitBounds(selectedPolyline.getBounds(), {
        padding: [60, 60],
        maxZoom: 15,
      });
    }
  }, [routes, selectedRouteId, mapReady, onSelectRoute]);

  // Map Navigation Handlers
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.flyTo(DEFAULT_CHENNAI_CENTER, DEFAULT_ZOOM, {
        duration: 0.8,
      });
    }
  }, []);

  const handleFitBounds = useCallback(() => {
    if (!mapRef.current) return;

    if (routes && routes.length > 0) {
      const activeRoute = routes.find((r) => r.route_id === selectedRouteId) || routes[0];
      if (activeRoute?.coordinates?.length > 1) {
        const latLngs = activeRoute.coordinates.map(([lng, lat]) => [lat, lng]);
        const polyline = L.polyline(latLngs);
        mapRef.current.fitBounds(polyline.getBounds(), {
          padding: [60, 60],
          maxZoom: 15,
        });
        return;
      }
    }

    const points = [];
    if (
      originLocation &&
      isValidCoordinate(originLocation.lat, originLocation.lng)
    ) {
      points.push([originLocation.lat, originLocation.lng]);
    }
    if (
      destinationLocation &&
      isValidCoordinate(destinationLocation.lat, destinationLocation.lng)
    ) {
      points.push([destinationLocation.lat, destinationLocation.lng]);
    }

    if (points.length === 2) {
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
      });
    } else if (points.length === 1) {
      mapRef.current.flyTo(points[0], 14, { duration: 0.6 });
    }
  }, [routes, selectedRouteId, originLocation, destinationLocation]);

  const handleToggleBasemap = useCallback(() => {
    setActiveBasemap((prev) => (prev === 'DARK_MATTER' ? 'VOYAGER' : 'DARK_MATTER'));
  }, []);

  const handleToggleLayer = useCallback((layerKey) => {
    setActiveLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }, []);

  const hasEndpoints = Boolean(
    (originLocation?.lat && destinationLocation?.lat) || (routes && routes.length > 0)
  );

  const selectedRoute =
    routes && routes.length > 0
      ? routes.find((r) => r.route_id === selectedRouteId) || routes[0]
      : null;

  if (mapError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '480px',
          background: 'var(--color-surface-panel)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-6)',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>⚠️</span>
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
          Map Initialization Failed
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', fontSize: '0.85rem', marginBottom: 'var(--space-4)' }}>
          {mapError}
        </p>
        <button
          type="button"
          onClick={() => {
            setMapError(null);
            setMapReady(false);
          }}
          className="btn btn-primary btn-sm"
        >
          Retry Loading Map
        </button>
      </div>
    );
  }

  const activeBasemapConfig = getActiveBasemap(activeBasemap);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '520px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#070b12',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-medium)',
      }}
      role="region"
      aria-label="Interactive Chennai Geospatial Workspace"
    >
      {/* Offline / Tile Failure Banner (Non-intrusive) */}
      {tileWarning && (
        <div
          style={{
            position: 'absolute',
            top: 'var(--space-3)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 500,
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#ffffff',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⚠️ {tileWarning}</span>
          <button
            type="button"
            onClick={() => setTileWarning(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Interactive Map Canvas Container */}
      <div
        ref={mapContainerRef}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          minHeight: '480px',
          cursor: clickMode === 'INSPECT' ? 'crosshair' : 'pointer',
        }}
        id="suraksha-leaflet-map"
      />

      {/* Floating Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onFitBounds={handleFitBounds}
        hasEndpoints={hasEndpoints}
        activeBasemap={activeBasemap}
        onToggleBasemap={handleToggleBasemap}
        activeLayers={activeLayers}
        onToggleLayer={handleToggleLayer}
        clickMode={clickMode}
        onChangeClickMode={setClickMode}
      />

      {/* Bottom Cartographic Status HUD & Legend */}
      <MapLegend
        center={currentCenter}
        zoom={currentZoom}
        origin={originLocation}
        destination={destinationLocation}
        straightLineDistanceKm={straightLineDistance}
        selectedRoute={selectedRoute}
        attributionText={activeBasemapConfig.attribution}
      />
    </div>
  );
}
