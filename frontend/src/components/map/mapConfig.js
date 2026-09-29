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
};

/**
 * Resolves the Mapbox API access token from environment variables or global scope.
 */
export function getMapboxToken() {
  return (
    import.meta.env?.VITE_MAPBOX_TOKEN ||
    (typeof window !== 'undefined' && window.__MAPBOX_TOKEN__) ||
    ''
  );
}

/**
 * Returns the active basemap configuration, honoring any environment variable overrides.
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
    effectiveKey = mapboxToken ? 'MAPBOX_DARK' : 'DARK_MATTER';
  }

  // If specific Mapbox provider requested or resolved
  if (effectiveKey === 'MAPBOX_DARK' || effectiveKey === 'MAPBOX_STREETS') {
    const selected = BASEMAP_PROVIDERS[effectiveKey];
    if (mapboxToken) {
      return {
        ...selected,
        url: selected.url.replace('{token}', mapboxToken),
      };
    }
    // Graceful fallback if token is missing
    return BASEMAP_PROVIDERS.DARK_MATTER;
  }

  return BASEMAP_PROVIDERS[effectiveKey] || BASEMAP_PROVIDERS.DARK_MATTER;
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
