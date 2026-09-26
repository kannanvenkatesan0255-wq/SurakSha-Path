/**
 * Suraksha Path navigation and system constants.
 */

export const NAV_TABS = {
  HOME: 'home',
  PLAN_ROUTE: 'plan_route',
  ROUTE_RESULTS: 'route_results',
  EVIDENCE: 'evidence',
  COMMUNITY: 'community',
  ACTIVITY: 'activity',
};

export const NAV_ITEMS = [
  { id: NAV_TABS.HOME, label: 'Overview', icon: '🛡️', description: 'System overview & telemetry' },
  { id: NAV_TABS.PLAN_ROUTE, label: 'Plan Route', icon: '📍', description: 'Origin & destination routing' },
  { id: NAV_TABS.ROUTE_RESULTS, label: 'Comparison', icon: '⚡', description: 'Fastest vs Balanced vs Safest' },
  { id: NAV_TABS.EVIDENCE, label: 'Evidence', icon: '🔍', description: 'Segment factors & confidence' },
  { id: NAV_TABS.COMMUNITY, label: 'Community', icon: '👥', description: 'Trust-weighted reporting' },
  { id: NAV_TABS.ACTIVITY, label: 'Reassessment', icon: '🔄', description: 'Journey feedback & updates' },
];

export const CHENNAI_CORRIDORS = [
  'Anna Salai (Mount Road)',
  'Rajiv Gandhi IT Expressway (OMR)',
  'Grand Southern Trunk (GST) Road',
  'Poonamallee High Road',
  'Kamarajar Salai (Marina Beach)',
  'Velachery Main Road',
  'Sardar Patel Road (Guindy - Adyar)',
];
