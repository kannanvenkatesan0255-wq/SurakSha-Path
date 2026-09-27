/**
 * Map Overlays Schema & Extensibility Interfaces for Suraksha Path.
 * Establishes typed structures and registration points for future safety layers:
 *  - Alternative route polylines (Phase 6/7)
 *  - Road-segment safety indicators & heatmaps (Phase 8/9)
 *  - Community crowd reports (Phase 10)
 *  - Verified urban infrastructure: lighting, police posts, CCTV (Phase 11+)
 *
 * NOTE: Keeps cartographic display decoupled from scoring engines and routing graphs.
 * All preview infrastructure points here are explicitly marked as demonstration references.
 */

export const LAYER_TYPES = {
  LIGHTING: 'lighting',
  POLICE: 'police',
  CCTV: 'cctv',
  CROWD: 'crowd',
  ROUTES: 'routes',
  ROAD_SEGMENTS: 'road_segments',
};

export const LAYER_METADATA = {
  [LAYER_TYPES.ROAD_SEGMENTS]: {
    id: LAYER_TYPES.ROAD_SEGMENTS,
    label: 'Road Network Segments (OSM)',
    shortLabel: '🛣️ Road Segments',
    description: 'Sourced OpenStreetMap discrete road segments and arterial corridors',
    color: '#0ea5e9', // Sky blue
    isDemoOnly: false,
  },
  [LAYER_TYPES.LIGHTING]: {
    id: LAYER_TYPES.LIGHTING,
    label: 'Street Illumination',
    shortLabel: '💡 Lighting',
    description: 'High-mast and continuous street lighting coverage audits',
    color: '#38bdf8', // Light sky blue
    isDemoOnly: true,
  },
  [LAYER_TYPES.POLICE]: {
    id: LAYER_TYPES.POLICE,
    label: 'Police Booths & Outposts',
    shortLabel: '👮 Police Posts',
    description: 'Greater Chennai Police stations, outposts, and verified 24/7 patrol points',
    color: '#3b82f6', // Cobalt blue
    isDemoOnly: true,
  },
  [LAYER_TYPES.CCTV]: {
    id: LAYER_TYPES.CCTV,
    label: 'Municipal Surveillance (CCTV)',
    shortLabel: '📹 CCTV Coverage',
    description: 'Greater Chennai Corporation public safety camera zones',
    color: '#8b5cf6', // Violet
    isDemoOnly: true,
  },
  [LAYER_TYPES.CROWD]: {
    id: LAYER_TYPES.CROWD,
    label: 'Pedestrian Density Audits',
    shortLabel: '👥 Crowd Density',
    description: 'Aggregated pedestrian footfall density during nocturnal hours',
    color: '#10b981', // Emerald
    isDemoOnly: true,
  },
};

/**
 * Curated reference infrastructure points in Chennai.
 * Explicitly identified as verified static reference/demo points for layer calibration.
 */
export const CHENNAI_INFRASTRUCTURE_POINTS = [
  {
    id: 'police-central-01',
    layer: LAYER_TYPES.POLICE,
    name: 'Chennai Central Railway Police Station',
    lat: 13.0833,
    lng: 80.2715,
    details: '24/7 GRP & RPF Command Post • High Patrol Frequency',
    isDemonstrationData: true,
  },
  {
    id: 'police-egmore-02',
    layer: LAYER_TYPES.POLICE,
    name: 'Egmore Police Station (F-1)',
    lat: 13.0788,
    lng: 80.2615,
    details: 'Law & Order Police Station • Poonamallee High Rd',
    isDemonstrationData: true,
  },
  {
    id: 'police-tnagar-03',
    layer: LAYER_TYPES.POLICE,
    name: 'T. Nagar Police Assistance Booth',
    lat: 13.0425,
    lng: 80.2355,
    details: 'Usman Road Commercial Patrol Point',
    isDemonstrationData: true,
  },
  {
    id: 'police-marina-04',
    layer: LAYER_TYPES.POLICE,
    name: 'Marina Coastal Security Police Booth',
    lat: 13.0410,
    lng: 80.2790,
    details: 'Kamarajar Salai Promenade Patrol Station',
    isDemonstrationData: true,
  },
  {
    id: 'police-guindy-05',
    layer: LAYER_TYPES.POLICE,
    name: 'Guindy Police Station (J-3)',
    lat: 13.0075,
    lng: 80.2035,
    details: 'Kathipara / GST Road Hub Outpost',
    isDemonstrationData: true,
  },
  {
    id: 'lighting-annasalai-01',
    layer: LAYER_TYPES.LIGHTING,
    name: 'Anna Salai Arterial High-Mast Corridor',
    lat: 13.0575,
    lng: 80.2545,
    details: 'Dual-sided high lumen LED street lighting • Continuous audit',
    isDemonstrationData: true,
  },
  {
    id: 'lighting-omr-02',
    layer: LAYER_TYPES.LIGHTING,
    name: 'OMR IT Corridor Illumination Stretch',
    lat: 12.9890,
    lng: 80.2495,
    details: 'Pedestrian and vehicular illuminated walkway',
    isDemonstrationData: true,
  },
];
