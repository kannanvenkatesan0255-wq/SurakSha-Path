/**
 * Suraksha Path navigation, domain terminology, and Chennai geospatial constants.
 */

export const NAV_TABS = {
  HOME: 'home',
  PLAN_ROUTE: 'plan_route',
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
