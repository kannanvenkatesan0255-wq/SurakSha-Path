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
  getMapboxToken,
  setMapboxToken,
  isValidCoordinate,
  formatCoordinates,
  haversineDistanceKm,
} from './mapConfig';
import { MapTokenModal } from './MapTokenModal';
import {
  createOriginDivIcon,
  createDestinationDivIcon,
  createSelectionDivIcon,
  createInfrastructureDivIcon,
  createCurrentLocationDivIcon,
  formatMarkerPopup,
} from './markerUtils';
import { CHENNAI_INFRASTRUCTURE_POINTS } from './mapOverlays';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { CHENNAI_LOCATION_CATALOG } from '../../services/locationService';
import { getRoadSegments } from '../../api/roadNetwork';

export function InteractiveMap({
  mapId = 'suraksha-leaflet-map',
  originLocation = null, // { name, lat, lng, address }
  destinationLocation = null, // { name, lat, lng, address }
  currentLocation = null, // Phase 14: { lat, lng, isSimulated, label }
  routes = [], // Array of RouteAlternative from routing engine
  selectedRouteId = null,
  onSelectRoute = null,
  highlightedSegmentCode = null, // Phase 11: synchronized segment highlighting
  onSelectSegment = null, // Phase 11: map-to-panel segment selection
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
  const currentLocationMarkerRef = useRef(null);
  const selectionMarkerRef = useRef(null);
  const infraLayerGroupRef = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const roadSegmentsLayerGroupRef = useRef(null);
  const highlightedSegmentLayerGroupRef = useRef(null);

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
  const [activeBasemap, setActiveBasemap] = useState(() =>
    getMapboxToken() ? 'MAPBOX_OUTDOORS' : 'FREE_OUTDOORS'
  );
  const [clickMode, setClickMode] = useState('INSPECT');
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [activeLayers, setActiveLayers] = useState({
    lighting: true,
    police: true,
    cctv: false,
    crowd: false,
    road_segments: false,
  });

  const [roadSegmentsData, setRoadSegmentsData] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);

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

    // Clean up stale leaflet identifier from previous instance if any
    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }

    let resizeTimer = null;
    let handleResize = null;
    let resizeObserver = null;

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

      const basemapConfig = getActiveBasemap();
      const tileLayer = L.tileLayer(basemapConfig.url, {
        attribution: basemapConfig.attribution,
        subdomains: basemapConfig.subdomains || '',
        maxZoom: basemapConfig.maxZoom || 19,
        tileSize: basemapConfig.tileSize || 256,
        zoomOffset: basemapConfig.zoomOffset || 0,
      });

      tileLayer.on('tileerror', () => {
        setTileWarning('Notice: Some basemap tiles failed to load. Falling back to open tile service if persistent.');
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

      // Layer group for road network segments (Phase 7)
      const roadSegmentGroup = L.layerGroup().addTo(map);
      roadSegmentsLayerGroupRef.current = roadSegmentGroup;

      // Layer group for synchronized highlighted segment (Phase 11)
      const highlightGroup = L.layerGroup().addTo(map);
      highlightedSegmentLayerGroupRef.current = highlightGroup;

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

      // Debounced resize handler for smooth responsive transitions & mobile orientation flips
      handleResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 80);
      };

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        if (mapContainerRef.current) {
          resizeObserver.observe(mapContainerRef.current);
        }
      }
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      mapRef.current = map;
      setMapReady(true);
    } catch (err) {
      console.error('Failed to initialize Leaflet map:', err);
      setMapError(err.message || 'Unable to initialize map.');
    }

    return () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      }
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch {
          // ignore
        }
        resizeObserver = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('Failed to cleanly remove Leaflet map instance:', e);
        }
        mapRef.current = null;
      }
      if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }
      setMapReady(false);
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
      subdomains: config.subdomains || '',
      maxZoom: config.maxZoom || 19,
      tileSize: config.tileSize || 256,
      zoomOffset: config.zoomOffset || 0,
    });

    let tileErrorCount = 0;
    newTileLayer.on('tileerror', () => {
      tileErrorCount += 1;
      if (tileErrorCount >= 4 && activeBasemap.startsWith('MAPBOX_')) {
        setTileWarning('Mapbox tiles could not load. Automatically switched to OpenStreetMap / CartoDB.');
        setActiveBasemap('DARK_MATTER');
      } else {
        setTileWarning('Notice: Basemap tiles encountering network issues. Falling back to open tile service if persistent.');
      }
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

  // Phase 14: Update Current Location Marker (Live Device GPS or Demo Simulated)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
      currentLocationMarkerRef.current = null;
    }

    if (currentLocation && isValidCoordinate(currentLocation.lat, currentLocation.lng)) {
      const isSim = Boolean(currentLocation.isSimulated);
      const icon = createCurrentLocationDivIcon(isSim, currentLocation.label || 'Commuter Position');
      const marker = L.marker([currentLocation.lat, currentLocation.lng], {
        icon,
        zIndexOffset: 1200,
      }).addTo(mapRef.current);

      marker.bindPopup(
        formatMarkerPopup({
          role: 'COMMUTER_LOCATION',
          title: currentLocation.label || (isSim ? 'Demo Simulated Position' : 'Current GPS Position'),
          address: isSim ? 'Simulated progression along route' : 'Live device location sharing active',
          coordText: formatCoordinates(currentLocation.lat, currentLocation.lng),
          details: isSim
            ? 'Simulated coordinates for demonstration purposes'
            : 'Device coordinates processed locally in browser',
        })
      );

      currentLocationMarkerRef.current = marker;
    }
  }, [currentLocation, mapReady]);

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

  // Load and render road network segments when layer is enabled (Phase 7)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !roadSegmentsLayerGroupRef.current) return;

    roadSegmentsLayerGroupRef.current.clearLayers();

    if (!activeLayers.road_segments) {
      return;
    }

    const renderSegments = (segments) => {
      if (!roadSegmentsLayerGroupRef.current) return;
      roadSegmentsLayerGroupRef.current.clearLayers();

      segments.forEach((segment) => {
        const coords = segment.geometry?.coordinates || [];
        if (coords.length < 2) return;

        // GeoJSON [lng, lat] -> Leaflet [lat, lng]
        const latLngs = coords.map(([lng, lat]) => [lat, lng]);

        const polyline = L.polyline(latLngs, {
          color: '#38bdf8', // Sourced road geometry: distinct slate/cyan tone
          weight: 4,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
        });

        const popupHtml = `
          <div style="font-family: var(--font-sans); min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #38bdf8; text-transform: uppercase;">
                Road Segment
              </span>
              <span style="font-size: 0.65rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 1px 5px; border-radius: 3px; font-family: var(--font-mono);">
                ${segment.segment_code}
              </span>
            </div>
            <div style="font-size: 0.88rem; font-weight: 600; color: #f8fafc; margin-bottom: 4px;">
              ${segment.road_name || 'Unnamed Segment'}
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 6px; line-height: 1.4;">
              <div>Classification: <strong style="color: #e2e8f0;">${segment.road_classification || 'Unclassified'}</strong></div>
              <div>Length: <strong style="color: #e2e8f0;">${segment.length_meters ? (segment.length_meters / 1000).toFixed(2) + ' km' : 'N/A'}</strong></div>
              <div>Source: <strong style="color: #e2e8f0;">${segment.source_dataset || 'OpenStreetMap'} (${segment.source_feature_id || 'N/A'})</strong></div>
            </div>
            <div style="font-size: 0.68rem; color: #64748b; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
              Open Database License (ODbL) • No safety scoring applied
            </div>
          </div>
        `;

        polyline.bindPopup(popupHtml);

        polyline.on('mouseover', () => {
          polyline.setStyle({ weight: 6, opacity: 1.0, color: '#06b6d4' });
        });

        polyline.on('mouseout', () => {
          polyline.setStyle({ weight: 4, opacity: 0.8, color: '#38bdf8' });
        });

        polyline.on('click', () => {
          setSelectedSegment(segment);
          if (onSelectSegment) {
            onSelectSegment(segment);
          }
        });

        roadSegmentsLayerGroupRef.current.addLayer(polyline);
      });
    };

    if (roadSegmentsData.length > 0) {
      renderSegments(roadSegmentsData);
    } else {
      getRoadSegments({ limit: 100 })
        .then((data) => {
          const segments = data?.segments || [];
          setRoadSegmentsData(segments);
          renderSegments(segments);
        })
        .catch((err) => {
          console.warn('Failed to load road segments for map overlay:', err);
        });
    }
  }, [activeLayers.road_segments, roadSegmentsData, mapReady, onSelectSegment]);

  // Synchronized Road Segment Highlighting (Phase 11 Map-Panel Sync)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !highlightedSegmentLayerGroupRef.current) return;

    highlightedSegmentLayerGroupRef.current.clearLayers();
    if (!highlightedSegmentCode) return;

    const activeRoute = routes?.find((r) => r.route_id === selectedRouteId) || routes?.[0];
    let matchedSeg = activeRoute?.segments?.find((s) => s.segment_code === highlightedSegmentCode);
    let coords = matchedSeg?.coordinates;

    if (!coords || coords.length < 2) {
      const fromRoadNetwork = roadSegmentsData.find((s) => s.segment_code === highlightedSegmentCode);
      if (fromRoadNetwork?.geometry?.coordinates) {
        coords = fromRoadNetwork.geometry.coordinates;
        if (!matchedSeg) matchedSeg = fromRoadNetwork;
      }
    }

    if (coords && coords.length >= 2) {
      const latLngs = coords.map((c) => {
        if (c[0] > 70.0 && c[1] < 20.0) return [c[1], c[0]];
        return c;
      });

      // Luminous casing glow
      const casing = L.polyline(latLngs, {
        color: '#f59e0b',
        weight: 12,
        opacity: 0.65,
        lineCap: 'round',
        lineJoin: 'round',
      });
      highlightedSegmentLayerGroupRef.current.addLayer(casing);

      // Foreground sharp line
      const line = L.polyline(latLngs, {
        color: '#fbbf24',
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
      });

      const sScore = matchedSeg?.safety_score;
      const popupHtml = `
        <div style="font-family: var(--font-sans); min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 0.68rem; font-weight: 700; color: #f59e0b; text-transform: uppercase;">
              Highlighted Segment
            </span>
            <span style="font-size: 0.65rem; background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 1px 5px; border-radius: 3px; font-family: var(--font-mono);">
              ${highlightedSegmentCode}
            </span>
          </div>
          <div style="font-size: 0.88rem; font-weight: 600; color: #f8fafc; margin-bottom: 4px;">
            ${matchedSeg?.name || matchedSeg?.road_name || 'Road Segment'}
          </div>
          <div style="font-size: 0.75rem; color: #cbd5e1; margin-bottom: 4px;">
            ${sScore !== null && sScore !== undefined ? `Safety Score: <strong>${typeof sScore === 'number' ? sScore.toFixed(1) : sScore}/100</strong>` : 'Unassessed Segment'}
          </div>
          ${matchedSeg?.is_bottleneck ? `<div style="font-size: 0.7rem; color: #ef4444; font-weight: 600;">⚠️ Bottleneck: ${matchedSeg?.bottleneck_reason || 'Higher modeled risk'}</div>` : ''}
        </div>
      `;

      line.bindPopup(popupHtml);
      highlightedSegmentLayerGroupRef.current.addLayer(line);

      try {
        line.bringToFront();
        mapRef.current.fitBounds(line.getBounds(), {
          padding: [80, 80],
          maxZoom: 16,
        });
        line.openPopup();
      } catch (err) {
        console.warn('Could not fit bounds to highlighted segment:', err);
      }
    }
  }, [highlightedSegmentCode, routes, selectedRouteId, roadSegmentsData, mapReady]);

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
  }, [routes, selectedRouteId, originLocation, destinationLocation, mapReady]);

  const handleSelectBasemap = useCallback((basemapKey) => {
    if (basemapKey) {
      setActiveBasemap(basemapKey);
    }
  }, []);

  const handleToggleBasemap = useCallback(() => {
    setActiveBasemap((prev) => {
      const isOutdoors = prev === 'MAPBOX_OUTDOORS' || prev === 'FREE_OUTDOORS';
      const isSatellite = prev === 'MAPBOX_SATELLITE' || prev === 'FREE_SATELLITE';
      const isStreets = prev === 'MAPBOX_STREETS' || prev === 'VOYAGER' || prev === 'OSM_STANDARD';
      const hasToken = Boolean(getMapboxToken());

      if (isOutdoors) return hasToken ? 'MAPBOX_SATELLITE' : 'FREE_SATELLITE';
      if (isSatellite) return hasToken ? 'MAPBOX_STREETS' : 'VOYAGER';
      if (isStreets) return hasToken ? 'MAPBOX_DARK' : 'DARK_MATTER';
      return hasToken ? 'MAPBOX_OUTDOORS' : 'FREE_OUTDOORS';
    });
  }, []);

  const handleToggleLayer = useCallback((layerKey) => {
    setActiveLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }, []);

  const handleSaveToken = useCallback((newToken) => {
    setMapboxToken(newToken);
    setActiveBasemap('MAPBOX_OUTDOORS');
    setTileWarning(null);
  }, []);

  const handleResetToken = useCallback(() => {
    setMapboxToken('');
    setActiveBasemap('FREE_OUTDOORS');
    setTileWarning(null);
  }, []);

  const handleSwitchToOpenTiles = useCallback(() => {
    setActiveBasemap('DARK_MATTER');
    setTileWarning(null);
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
        id={mapId}
      />

      {/* Selected Road Segment Inspector Panel (Phase 7) */}
      {selectedSegment && (
        <div
          className="map-segment-inspector"
          style={{
            position: 'absolute',
            bottom: 'var(--space-8)',
            left: 'var(--space-3)',
            zIndex: 450,
            background: 'rgba(13, 20, 36, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-brand-cyan)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            maxWidth: 'min(320px, calc(100% - 24px))',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-brand-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🛣️ Road Segment Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedSegment(null)}
              aria-label="Close segment inspector"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {selectedSegment.road_name || 'Unnamed Segment'}
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
            <span>Code: <code style={{ color: 'var(--color-brand-cyan)', fontFamily: 'var(--font-mono)' }}>{selectedSegment.segment_code}</code></span>
            <span>Class: <strong>{selectedSegment.road_classification || 'Unclassified'}</strong></span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Length: {selectedSegment.length_meters ? `${(selectedSegment.length_meters / 1000).toFixed(2)} km` : 'N/A'}</span>
            <span>Source: {selectedSegment.source_dataset || 'OpenStreetMap'}</span>
          </div>
        </div>
      )}

      {/* Tile Issue Warning Notification with Dismissal */}
      {tileWarning && (
        <div
          style={{
            position: 'absolute',
            top: 'var(--space-3)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1500,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--color-brand-amber)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-lg)',
            maxWidth: 'min(460px, calc(100% - 24px))',
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>⚠️</span>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-primary)', flex: 1, lineHeight: 1.3 }}>
            {tileWarning}
          </span>
          <button
            type="button"
            onClick={() => setTileWarning(null)}
            aria-label="Dismiss warning"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              padding: '2px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onFitBounds={handleFitBounds}
        hasEndpoints={hasEndpoints}
        activeBasemap={activeBasemap}
        onToggleBasemap={handleToggleBasemap}
        onSelectBasemap={handleSelectBasemap}
        activeLayers={activeLayers}
        onToggleLayer={handleToggleLayer}
        clickMode={clickMode}
        onChangeClickMode={setClickMode}
        onOpenTokenModal={() => setIsTokenModalOpen(true)}
      />

      {/* Mapbox Token Configuration Modal */}
      <MapTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        currentToken={getMapboxToken()}
        onSaveToken={handleSaveToken}
        onResetToken={handleResetToken}
        onSwitchToOpenTiles={handleSwitchToOpenTiles}
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
