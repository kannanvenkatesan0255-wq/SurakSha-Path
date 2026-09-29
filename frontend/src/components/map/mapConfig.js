/**
 * Map Configuration and Cartographic Constants for Suraksha Path.
 * Geographic scope: Chennai Metropolitan Area (CMA), Tamil Nadu, India.
 *
 * Provides configurable basemap tile providers, Chennai default viewport bounds,
 * coordinate validation, and extensible layer identifiers.
 */

// Default center of Chennai Metropolitan Area (Central / Greater Chennai Corporation)
export const DEFAULT_CHENNAI_CENTER = [13.0827, 80.2707];
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 9;
export const MAX_ZOOM = 18;

// Bounding box for Chennai Metropolitan Area to prevent disorienting pans outside the region
export const CHENNAI_METRO_BOUNDS = [
  [12.70, 79.85], // South-West (Chengalpattu / Sriperumbudur approach)
  [13.40, 80.45], // North-East (Ennore / Pulicat approach / Bay of Bengal)
];

// Basemap Tile Providers (with open-source / zero-credential defaults and full attribution)
export const BASEMAP_PROVIDERS = {
  MAPBOX_OUTDOORS: {
    id: 'MAPBOX_OUTDOORS',
    name: 'Mapbox Outdoors',
    label: 'Green & White (Outdoors)',
    url: 'https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}?access_token={token}',
    attribution:
      '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    subdomains: '',
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19,
    description: 'Natural green terrain and parks with clean white road network and clear topography',
  },
  MAPBOX_SATELLITE: {
    id: 'MAPBOX_SATELLITE',
    name: 'Mapbox Satellite Hybrid',
    label: 'Satellite (Aerial Imagery)',
    url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}?access_token={token}',
    attribution:
      '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; Maxar',
    subdomains: '',
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19,
    description: 'Real high-resolution photorealistic satellite imagery with street and landmark overlays',
  },
  MAPBOX_STREETS: {
    id: 'MAPBOX_STREETS',
    name: 'Mapbox Streets',
    label: 'Mapbox Streets (Daylight)',
    url: 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}?access_token={token}',
    attribution:
      '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    subdomains: '',
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19,
    description: 'Detailed daylight Mapbox urban basemap with building footprints and transit labels',
  },
  MAPBOX_DARK: {
    id: 'MAPBOX_DARK',
    name: 'Mapbox Dark Navigation',
    label: 'Mapbox Dark (Nocturnal)',
    url: 'https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}?access_token={token}',
    attribution:
      '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    subdomains: '',
    tileSize: 512,
    zoomOffset: -1,
    maxZoom: 19,
    description: 'High-contrast Mapbox nocturnal style calibrated for Chennai road safety overlays',
  },
  DARK_MATTER: {
    id: 'DARK_MATTER',
    name: 'CartoDB Dark Matter',
    label: 'Dark Canvas (Nocturnal)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    subdomains: 'abcd',
    tileSize: 256,
    zoomOffset: 0,
    maxZoom: 19,
    description: 'High-contrast nocturnal basemap optimized for safety evidence visualization',
  },
  VOYAGER: {
    id: 'VOYAGER',
    name: 'CartoDB Voyager',
    label: 'Street Navigation',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    subdomains: 'abcd',
    tileSize: 256,
    zoomOffset: 0,
    maxZoom: 19,
    description: 'Detailed daylight urban basemap with building footprints and transit labels',
  },
  OSM_STANDARD: {
    id: 'OSM_STANDARD',
    name: 'OpenStreetMap Standard',
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    tileSize: 256,
    zoomOffset: 0,
    maxZoom: 19,
    description: 'Standard community OpenStreetMap tiles',
  },
  // Zero-credential high-performance basemaps (100% Free, No API key required):
  FREE_SATELLITE: {
    id: 'FREE_SATELLITE',
    name: 'ESRI World Imagery Satellite',
    label: 'Real Satellite (Zero Key Required)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    subdomains: '',
    tileSize: 256,
    zoomOffset: 0,
    maxZoom: 18,
    description: 'Real high-resolution photorealistic satellite imagery (Zero API key required)',
  },
  FREE_OUTDOORS: {
    id: 'FREE_OUTDOORS',
    name: 'CartoDB Voyager (Green & White)',
    label: 'Green & White (Zero Key Required)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    subdomains: 'abcd',
    tileSize: 256,
    zoomOffset: 0,
    maxZoom: 19,
    description: 'Clean white roads, green parks, and urban topography (Zero API key required)',
  },
};

/**
 * Resolves the Mapbox API access token with layered fallback:
 * 1. Explicit Vite environment variable (VITE_MAPBOX_TOKEN)
 * 2. URL search parameter (?mapbox_token=... or ?map_token=...)
 * 3. Browser localStorage override (suraksha_mapbox_token)
 * 4. Window global override (window.__MAPBOX_TOKEN__)
 */
export function getMapboxToken() {
  const envToken =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAPBOX_TOKEN;
  if (envToken && typeof envToken === 'string' && envToken.trim().length > 0) {
    return envToken.trim();
  }

  if (typeof window !== 'undefined') {
    // Check URL query parameters (e.g. ?mapbox_token=pk.xxx)
    try {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('mapbox_token') || params.get('map_token');
      if (urlToken && urlToken.trim().startsWith('pk.')) {
        window.localStorage?.setItem('suraksha_mapbox_token', urlToken.trim());
        return urlToken.trim();
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Check localStorage
    try {
      const stored = window.localStorage?.getItem('suraksha_mapbox_token');
      if (stored && typeof stored === 'string' && stored.trim().length > 0) {
        return stored.trim();
      }
    } catch {
      // Ignore localStorage access errors
    }

    // Check window global override
    if (window.__MAPBOX_TOKEN__ && typeof window.__MAPBOX_TOKEN__ === 'string') {
      return window.__MAPBOX_TOKEN__.trim();
    }
  }

  return '';
}

/**
 * Persists a user-provided Mapbox token to localStorage for live in-browser updates.
 */
export function setMapboxToken(token) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (token && typeof token === 'string' && token.trim().length > 0) {
        window.localStorage.setItem('suraksha_mapbox_token', token.trim());
      } else {
        window.localStorage.removeItem('suraksha_mapbox_token');
      }
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Returns the active basemap configuration, honoring any environment variable overrides.
 * Provides seamless zero-credential fallback (FREE_SATELLITE & FREE_OUTDOORS) when no token is present,
 * completely preventing any "API key is required" errors.
 */
export function getActiveBasemap(providerKey = null) {
  // Check for custom environment variable overrides (e.g., self-hosted tile server or proxy)
  const envTileUrl = import.meta.env?.VITE_MAP_TILE_URL;
  const envAttribution = import.meta.env?.VITE_MAP_ATTRIBUTION;

  if (envTileUrl) {
    return {
      id: 'CUSTOM_ENV',
      name: 'Custom Tile Provider',
      label: 'Custom Basemap',
      url: envTileUrl,
      attribution: envAttribution || '&copy; Custom Map Provider',
      subdomains: 'abcd',
      tileSize: 256,
      zoomOffset: 0,
      maxZoom: 19,
      description: 'Configured via VITE_MAP_TILE_URL environment variable',
    };
  }

  const mapboxToken = getMapboxToken();

  // Resolve target key
  let effectiveKey = providerKey;
  if (!effectiveKey) {
    effectiveKey = mapboxToken ? 'MAPBOX_OUTDOORS' : 'FREE_OUTDOORS';
  }

  // 1. Green & White / Outdoors View:
  if (effectiveKey === 'MAPBOX_OUTDOORS' || effectiveKey === 'FREE_OUTDOORS') {
    if (mapboxToken) {
      return {
        ...BASEMAP_PROVIDERS.MAPBOX_OUTDOORS,
        url: BASEMAP_PROVIDERS.MAPBOX_OUTDOORS.url.replace('{token}', mapboxToken),
      };
    }
    // Zero-credential fallback: CartoDB Voyager clean white roads & green parks
    return BASEMAP_PROVIDERS.FREE_OUTDOORS;
  }

  // 2. Real Satellite Aerial View:
  if (effectiveKey === 'MAPBOX_SATELLITE' || effectiveKey === 'FREE_SATELLITE') {
    if (mapboxToken) {
      return {
        ...BASEMAP_PROVIDERS.MAPBOX_SATELLITE,
        url: BASEMAP_PROVIDERS.MAPBOX_SATELLITE.url.replace('{token}', mapboxToken),
      };
    }
    // Zero-credential fallback: ESRI World Imagery Photorealistic Satellite
    return BASEMAP_PROVIDERS.FREE_SATELLITE;
  }

  // 3. Daylight Streets View:
  if (effectiveKey === 'MAPBOX_STREETS') {
    if (mapboxToken) {
      return {
        ...BASEMAP_PROVIDERS.MAPBOX_STREETS,
        url: BASEMAP_PROVIDERS.MAPBOX_STREETS.url.replace('{token}', mapboxToken),
      };
    }
    return BASEMAP_PROVIDERS.OSM_STANDARD;
  }

  // 4. Nocturnal Dark View:
  if (effectiveKey === 'MAPBOX_DARK' || effectiveKey === 'DARK_MATTER') {
    if (mapboxToken && BASEMAP_PROVIDERS.MAPBOX_DARK) {
      return {
        ...BASEMAP_PROVIDERS.MAPBOX_DARK,
        url: BASEMAP_PROVIDERS.MAPBOX_DARK.url.replace('{token}', mapboxToken),
      };
    }
    return BASEMAP_PROVIDERS.DARK_MATTER;
  }

  return BASEMAP_PROVIDERS[effectiveKey] || BASEMAP_PROVIDERS.FREE_OUTDOORS;
}

/**
 * Validates whether latitude and longitude are valid numeric geographic coordinates.
 */
export function isValidCoordinate(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    !Number.isNaN(nLat) &&
    !Number.isNaN(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  );
}

/**
 * Formats coordinates for high-precision human-readable display.
 * e.g., "13.0827° N, 80.2707° E"
 */
export function formatCoordinates(lat, lng) {
  if (!isValidCoordinate(lat, lng)) {
    return 'Coordinates Unavailable';
  }
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Calculates Haversine straight-line distance in kilometers between two points.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return 0;
  }
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}
