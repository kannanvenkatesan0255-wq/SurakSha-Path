/**
 * Location resolution and suggestion service for Suraksha Path.
 * Demonstration scope: Chennai Metropolitan Area, Tamil Nadu, India.
 *
 * Provides a clean interface for place name suggestions and coordinates resolution.
 * External geocoding provider (e.g. OSM Nominatim / Mapbox) can be connected cleanly.
 */

// Curated verified catalog of Chennai demonstration locations across key corridors
export const CHENNAI_LOCATION_CATALOG = [
  {
    id: 'loc-central',
    name: 'Chennai Central Railway Station',
    category: 'TRANSIT_HUB',
    corridor: 'Central / Wall Tax Road',
    address: 'Kannappar Thidal, Periyamet, Chennai, Tamil Nadu 600003',
    lat: 13.0827,
    lng: 80.2707,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-tnagar-bus',
    name: 'T. Nagar Bus Terminus',
    category: 'TRANSIT_HUB',
    corridor: 'South Usman Road Corridor',
    address: 'Usman Road, T. Nagar, Chennai, Tamil Nadu 600017',
    lat: 13.0418,
    lng: 80.2341,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-guindy-metro',
    name: 'Guindy Metro & Suburban Station',
    category: 'TRANSIT_HUB',
    corridor: 'GST Road / Kathipara Junction',
    address: 'Race Course Road, Guindy, Chennai, Tamil Nadu 600032',
    lat: 13.0067,
    lng: 80.2025,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-omr-tidel',
    name: 'TIDEL Park, Rajiv Gandhi IT Expressway (OMR)',
    category: 'COMMERCIAL',
    corridor: 'Old Mahabalipuram Road (OMR)',
    address: 'Tharamani, Chennai, Tamil Nadu 600113',
    lat: 12.9897,
    lng: 80.2486,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-marina-light',
    name: 'Marina Beach Light House',
    category: 'LANDMARK',
    corridor: 'Kamarajar Salai Corridor',
    address: 'Marina Beach Road, Santhome, Chennai, Tamil Nadu 600004',
    lat: 13.0399,
    lng: 80.2785,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-adyar-signal',
    name: 'Adyar Signal (Lattice Bridge Road Junction)',
    category: 'COMMERCIAL',
    corridor: 'Sardar Patel Road / LB Road',
    address: 'Lattice Bridge Road, Adyar, Chennai, Tamil Nadu 600020',
    lat: 13.0064,
    lng: 80.2575,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-velachery-vijay',
    name: 'Velachery Vijayanagar Bus Junction',
    category: 'TRANSIT_HUB',
    corridor: 'Velachery Main Road Corridor',
    address: 'Vijayanagar, Velachery, Chennai, Tamil Nadu 600042',
    lat: 12.9759,
    lng: 80.2212,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-anna-univ',
    name: 'Anna University Main Campus, Guindy',
    category: 'EDUCATIONAL',
    corridor: 'Sardar Patel Road',
    address: '12, Sardar Patel Rd, Guindy, Chennai, Tamil Nadu 600025',
    lat: 13.0102,
    lng: 80.2354,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-iit-madras',
    name: 'IIT Madras Main Gate (Adyar)',
    category: 'EDUCATIONAL',
    corridor: 'Sardar Patel Road',
    address: 'Sardar Patel Rd, Opposite CLRI, Adyar, Chennai 600036',
    lat: 13.0067,
    lng: 80.2435,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-egmore',
    name: 'Chennai Egmore Railway Station',
    category: 'TRANSIT_HUB',
    corridor: 'Poonamallee High Road',
    address: 'Gandhi Irwin Rd, Egmore, Chennai, Tamil Nadu 600008',
    lat: 13.0782,
    lng: 80.2608,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-thousand-lights',
    name: 'Thousand Lights Mosque, Anna Salai',
    category: 'LANDMARK',
    corridor: 'Anna Salai / Mount Road',
    address: 'Anna Salai, Thousand Lights, Chennai, Tamil Nadu 600006',
    lat: 13.0569,
    lng: 80.2536,
    source: 'CHENNAI_DEMO_CATALOG',
  },
  {
    id: 'loc-nandanam',
    name: 'Nandanam YMCA Junction',
    category: 'COMMERCIAL',
    corridor: 'Anna Salai Corridor',
    address: 'Anna Salai, Nandanam, Chennai, Tamil Nadu 600035',
    lat: 13.0298,
    lng: 80.2384,
    source: 'CHENNAI_DEMO_CATALOG',
  },
];

/**
 * Searches the location catalog for matching place names, neighbourhoods, or corridors.
 * Returns suggestions with clear provenance labeling.
 */
export function searchChennaiLocations(query, maxResults = 5) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  const normalized = query.trim().toLowerCase();

  const matches = CHENNAI_LOCATION_CATALOG.filter((item) => {
    return (
      item.name.toLowerCase().includes(normalized) ||
      item.corridor.toLowerCase().includes(normalized) ||
      item.address.toLowerCase().includes(normalized) ||
      item.category.toLowerCase().includes(normalized)
    );
  });

  return matches.slice(0, maxResults);
}

/**
 * Resolves a location name against verified Chennai coordinates if recognized.
 * If not in local catalog, marks as unverified / custom address rather than fabricating coordinates.
 */
export function resolveLocationQuery(query) {
  if (!query || typeof query !== 'string') {
    return {
      name: '',
      isResolved: false,
      lat: null,
      lng: null,
      source: null,
    };
  }

  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();

  const exactMatch = CHENNAI_LOCATION_CATALOG.find(
    (item) => item.name.toLowerCase() === normalized
  );

  if (exactMatch) {
    return {
      name: exactMatch.name,
      address: exactMatch.address,
      lat: exactMatch.lat,
      lng: exactMatch.lng,
      isResolved: true,
      source: exactMatch.source,
      corridor: exactMatch.corridor,
    };
  }

  const partialMatch = CHENNAI_LOCATION_CATALOG.find((item) =>
    item.name.toLowerCase().includes(normalized)
  );

  if (partialMatch) {
    return {
      name: trimmed,
      address: partialMatch.address,
      lat: partialMatch.lat,
      lng: partialMatch.lng,
      isResolved: true,
      source: 'CHENNAI_DEMO_CATALOG (Partial Match)',
      corridor: partialMatch.corridor,
    };
  }

  // Not in local catalog: return unverified without fabricating fake coordinates
  return {
    name: trimmed,
    address: null,
    lat: null,
    lng: null,
    isResolved: false,
    source: 'CUSTOM_USER_INPUT (Pending Geocoding)',
  };
}

/**
 * Swaps two location values.
 */
export function swapLocations(origin, destination) {
  return {
    swappedOrigin: destination,
    swappedDestination: origin,
  };
}
