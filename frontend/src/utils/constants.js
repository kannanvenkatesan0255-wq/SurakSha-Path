/**
 * Suraksha Path navigation, domain terminology, and Chennai geospatial constants.
 */

export const NAV_TABS = {
  HOME: 'home',
  PLAN_ROUTE: 'plan_route',
  MONITOR: 'monitor',
  EVIDENCE: 'evidence',
  COMMUNITY: 'community',
  ACTIVITY: 'activity',
};

export const NAV_ITEMS = [
  {
    id: NAV_TABS.HOME,
    label: 'Home',
    icon: '🧭',
    description: 'System overview and journey start',
    ariaLabel: 'Navigate to Home overview',
  },
  {
    id: NAV_TABS.PLAN_ROUTE,
    label: 'Plan Route',
    icon: '🗺️',
    description: 'Multi-route alternatives and map analysis',
    ariaLabel: 'Navigate to Plan Route and map workspace',
  },
  {
    id: NAV_TABS.MONITOR,
    label: 'Journey Monitor',
    icon: '🛡️',
    description: 'Safety check-in, tracking, and SOS',
    ariaLabel: 'Navigate to Journey Monitoring and SOS',
  },
  {
    id: NAV_TABS.EVIDENCE,
    label: 'Evidence',
    icon: '🔍',
    description: 'Segment factors, audits, and confidence',
    ariaLabel: 'Navigate to Evidence Explorer',
  },
  {
    id: NAV_TABS.COMMUNITY,
    label: 'Community',
    icon: '👥',
    description: 'Trust-weighted crowd safety reports',
    ariaLabel: 'Navigate to Community reports',
  },
  {
    id: NAV_TABS.ACTIVITY,
    label: 'Activity',
    icon: '🔄',
    description: 'Journey feedback and reassessment loop',
    ariaLabel: 'Navigate to Journey Activity and reassessment',
  },
];

export const RISK_LEVELS = {
  LOW: {
    key: 'LOW',
    label: 'LOW',
    fullLabel: 'LOW ASSESSED RISK',
    variant: 'risk-low',
    description: 'High visibility, frequent footfall, regular patrol presence',
  },
  MEDIUM: {
    key: 'MEDIUM',
    label: 'MEDIUM',
    fullLabel: 'MEDIUM ASSESSED RISK',
    variant: 'risk-medium',
    description: 'Intermittent lighting or reduced nocturnal activity',
  },
  HIGH: {
    key: 'HIGH',
    label: 'HIGH',
    fullLabel: 'HIGH ASSESSED RISK',
    variant: 'risk-high',
    description: 'Isolated stretch, poor illumination, or active alerts',
  },
  UNKNOWN: {
    key: 'UNKNOWN',
    label: 'UNASSESSED',
    fullLabel: 'UNASSESSED (INSUFFICIENT DATA)',
    variant: 'status',
    description: 'Insufficient verifiable safety evidence to calculate risk',
  },
};

export const STATUS_TYPES = {
  DEMO_MODE: { label: 'DEMO MODE', variant: 'status' },
  EVIDENCE_AVAILABLE: { label: 'EVIDENCE AVAILABLE', variant: 'info' },
  LIMITED_EVIDENCE: { label: 'LIMITED EVIDENCE', variant: 'risk-medium' },
  UNDER_REVIEW: { label: 'UNDER REVIEW', variant: 'confidence' },
  SYNTHETIC_DATA: { label: 'SYNTHETIC DATA', variant: 'status' },
  INSUFFICIENT_DATA: { label: 'INSUFFICIENT DATA', variant: 'status' },
  ASSESSED: { label: 'ASSESSED', variant: 'info' },
  PARTIALLY_ASSESSED: { label: 'PARTIALLY ASSESSED', variant: 'risk-medium' },
  STALE_EVIDENCE: { label: 'STALE EVIDENCE', variant: 'risk-medium' },
};

export const ROUTE_TYPES = {
  FASTEST: {
    key: 'FASTEST',
    title: 'Fastest Route',
    tag: 'MIN TIME',
    description: 'Direct arterial routing optimizing purely for travel duration.',
  },
  BALANCED: {
    key: 'BALANCED',
    title: 'Balanced Route',
    tag: 'RECOMMENDED',
    description: 'Optimized trade-off between travel time and segment safety.',
  },
  SAFEST: {
    key: 'SAFEST',
    title: 'Safest Route',
    tag: 'MAX SAFETY',
    description: 'Prioritizes continuous illumination, high footfall, and surveillance.',
  },
};

export const CHENNAI_PRESETS = [
  {
    id: 'central-to-tnagar',
    name: 'Chennai Central ➔ T. Nagar Bus Terminus',
    origin: 'Chennai Central Railway Station',
    destination: 'T. Nagar Bus Terminus',
    corridor: 'Anna Salai / Mount Road Corridor',
    distanceEst: '8.4 km',
  },
  {
    id: 'guindy-to-omr',
    name: 'Guindy Metro ➔ OMR TIDEL Park',
    origin: 'Guindy Metro Station',
    destination: 'TIDEL Park, Rajiv Gandhi IT Expressway',
    corridor: 'Sardar Patel Road / OMR Corridor',
    distanceEst: '7.8 km',
  },
  {
    id: 'marina-to-adyar',
    name: 'Marina Beach Light House ➔ Adyar Signal',
    origin: 'Marina Beach Light House',
    destination: 'Adyar Signal (Lattice Bridge Road)',
    corridor: 'Kamarajar Salai / Santhome High Road',
    distanceEst: '6.2 km',
  },
  {
    id: 'velachery-to-annuniv',
    name: 'Velachery Bypass ➔ Anna University (Guindy)',
    origin: 'Velachery Vijayanagar Junction',
    destination: 'Anna University Main Gate, Guindy',
    corridor: 'Velachery Main Road Corridor',
    distanceEst: '5.6 km',
  },
];

export const JOURNEY_STATUSES = {
  NOT_STARTED: {
    key: 'NOT_STARTED',
    label: 'STANDBY',
    fullLabel: 'MONITORING STANDBY',
    badgeVariant: 'neutral',
    description: 'Route selected, monitoring standby',
  },
  ACTIVE: {
    key: 'ACTIVE',
    label: 'ACTIVE',
    fullLabel: 'ACTIVE JOURNEY MONITORING',
    badgeVariant: 'success',
    description: 'Journey underway; safety check-ins active',
  },
  PAUSED: {
    key: 'PAUSED',
    label: 'PAUSED',
    fullLabel: 'JOURNEY PAUSED',
    badgeVariant: 'warning',
    description: 'Monitoring temporarily paused by commuter',
  },
  COMPLETED: {
    key: 'COMPLETED',
    label: 'COMPLETED',
    fullLabel: 'JOURNEY COMPLETED',
    badgeVariant: 'info',
    description: 'Commuter reached destination safely',
  },
  CANCELLED: {
    key: 'CANCELLED',
    label: 'CANCELLED',
    fullLabel: 'JOURNEY CANCELLED',
    badgeVariant: 'neutral',
    description: 'Journey terminated before destination',
  },
};

export const CHECK_IN_INTERVALS = [
  { label: '30 seconds (Fast Demo)', value: 0.5, isDemo: true },
  { label: '1 minute (Short Demo)', value: 1, isDemo: true },
  { label: '5 minutes', value: 5, isDemo: false },
  { label: '10 minutes', value: 10, isDemo: false },
  { label: '15 minutes (Standard)', value: 15, isDemo: false },
  { label: '30 minutes', value: 30, isDemo: false },
];

export const CHENNAI_EMERGENCY_HELPLINES = [
  { name: 'Police Control Room', number: '100', category: 'Police', dialUri: 'tel:100' },
  { name: 'National Emergency ERSS', number: '112', category: 'Police / General', dialUri: 'tel:112' },
  { name: 'Chennai Police Women Helpline (Kavalan)', number: '1091', category: 'Women Safety', dialUri: 'tel:1091' },
  { name: 'Tamil Nadu Ambulance & Medical', number: '108', category: 'Medical', dialUri: 'tel:108' },
  { name: 'Greater Chennai Corp (GCC) Flood Helpline', number: '1913', category: 'Civic / Flood', dialUri: 'tel:1913' },
  { name: 'Chennai Traffic Police Control', number: '103', category: 'Traffic', dialUri: 'tel:103' },
  { name: 'Tamil Nadu Fire & Rescue', number: '101', category: 'Fire', dialUri: 'tel:101' },
];

