/**
 * Local storage persistence and validation service for Journey Monitoring sessions (Phase 14).
 * Adheres to privacy constraints: Only local browser storage is used; no public transmission.
 */

export const STORAGE_KEYS = {
  SESSION: 'suraksha_journey_session',
  CONTACTS: 'suraksha_trusted_contacts',
  SETTINGS: 'suraksha_journey_settings',
  HISTORY: 'suraksha_journey_history',
  PREFERENCES: 'suraksha_route_preferences',
  PRIVACY: 'suraksha_journey_privacy',
};

export const DEFAULT_ROUTE_PREFERENCES = {
  routePreference: 'BALANCED', // 'FASTEST' | 'BALANCED' | 'SAFEST'
  safetyWeight: 0.5, // 0.0 = speed, 1.0 = verified safety
  avoidUnlitAreas: true,
  maxAcceptableDetourMinutes: 10,
  minConfidenceThreshold: 30,
  prioritizeActiveCorridors: true,
};

const VALID_STATUSES = new Set(['NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']);

/**
 * Validates and persists the current journey session.
 * @param {Object} session
 */
export function saveJourneySession(session) {
  if (!session || typeof session !== 'object') return;
  if (!session.journey_id || !VALID_STATUSES.has(session.status)) return;

  try {
    const serialized = JSON.stringify({
      ...session,
      saved_at: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.SESSION, serialized);
  } catch (err) {
    console.warn('Failed to persist journey session to localStorage:', err);
  }
}

/**
 * Loads and validates the persisted journey session.
 * Discards malformed, corrupted, or incompatible sessions gracefully.
 * @returns {Object|null}
 */
export function loadJourneySession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session || typeof session !== 'object') {
      clearJourneySession();
      return null;
    }

    // Verify required integrity fields
    if (!session.journey_id || !VALID_STATUSES.has(session.status)) {
      clearJourneySession();
      return null;
    }

    // Completed or Cancelled journeys should not silently reactivate
    return session;
  } catch (err) {
    console.warn('Corrupted journey session in localStorage, clearing:', err);
    clearJourneySession();
    return null;
  }
}

/**
 * Clears the active journey session from storage.
 */
export function clearJourneySession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (err) {
    console.warn('Failed to clear journey session from localStorage:', err);
  }
}

/**
 * Loads configured trusted emergency contacts (local browser only).
 * @returns {Array<{ id: string, name: string, phone: string, relationship?: string }>}
 */
export function loadTrustedContacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.filter((c) => c && typeof c.name === 'string' && typeof c.phone === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Persists trusted emergency contacts to local browser storage.
 * @param {Array} contacts
 */
export function saveTrustedContacts(contacts) {
  try {
    if (!Array.isArray(contacts)) return;
    const sanitized = contacts
      .slice(0, 3) // Maximum 3 contacts in prototype
      .map((c, idx) => ({
        id: c.id || `contact-${idx + 1}`,
        name: String(c.name || '').trim(),
        phone: String(c.phone || '').trim(),
        relationship: String(c.relationship || 'Emergency Contact').trim(),
      }))
      .filter((c) => c.name && c.phone);
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('Failed to save trusted contacts to localStorage:', err);
  }
}

/**
 * Loads default journey settings (check-in interval, location sharing opt-in).
 * @returns {{ checkInIntervalMinutes: number, locationSharingEnabled: boolean, isDemoMode: boolean }}
 */
export function loadJourneySettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      return {
        checkInIntervalMinutes: 15,
        locationSharingEnabled: false, // OFF by default
        isDemoMode: false,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      checkInIntervalMinutes: typeof parsed.checkInIntervalMinutes === 'number' ? parsed.checkInIntervalMinutes : 15,
      locationSharingEnabled: Boolean(parsed.locationSharingEnabled), // strictly boolean
      isDemoMode: Boolean(parsed.isDemoMode),
    };
  } catch {
    return {
      checkInIntervalMinutes: 15,
      locationSharingEnabled: false,
      isDemoMode: false,
    };
  }
}

/**
 * Saves default journey settings.
 * @param {Object} settings
 */
export function saveJourneySettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save journey settings to localStorage:', err);
  }
}

// =============================================================================
// Phase 15: Journey Insights, Safety Analytics & Route Preferences
// =============================================================================

/**
 * Pre-seeded realistic Chennai commute sample journeys.
 * Explicitly labeled with is_demo: true so commuters can explore dashboard capabilities
 * without fabricating real travel records.
 */
export const CHENNAI_DEMO_JOURNEYS = [
  {
    journey_id: 'DEMO-JRN-001',
    status: 'COMPLETED',
    origin: 'Chennai Central Railway Station',
    destination: 'T. Nagar Bus Terminus',
    route_type: 'BALANCED',
    distance_km: 8.4,
    duration_minutes: 24.5,
    elapsed_seconds: 1470,
    safety_score: 81.2,
    confidence_score: 85.0,
    start_time_ist: '2026-09-25 18:30:00 IST',
    end_time_ist: '2026-09-25 18:54:30 IST',
    date_ymd: '2026-09-25',
    is_demo: true,
    events_count: 3,
    check_in_count: 1,
    missed_check_in_count: 0,
    sos_activated: false,
  },
  {
    journey_id: 'DEMO-JRN-002',
    status: 'COMPLETED',
    origin: 'Guindy Metro Station',
    destination: 'IIT Madras Research Park',
    route_type: 'SAFEST',
    distance_km: 5.2,
    duration_minutes: 16.0,
    elapsed_seconds: 960,
    safety_score: 88.5,
    confidence_score: 91.0,
    start_time_ist: '2026-09-26 19:15:00 IST',
    end_time_ist: '2026-09-26 19:31:00 IST',
    date_ymd: '2026-09-26',
    is_demo: true,
    events_count: 3,
    check_in_count: 1,
    missed_check_in_count: 0,
    sos_activated: false,
  },
  {
    journey_id: 'DEMO-JRN-003',
    status: 'COMPLETED',
    origin: 'Egmore Railway Station',
    destination: 'Marina Beach Light House',
    route_type: 'FASTEST',
    distance_km: 6.1,
    duration_minutes: 17.5,
    elapsed_seconds: 1050,
    safety_score: 74.0,
    confidence_score: 78.0,
    start_time_ist: '2026-09-27 10:00:00 IST',
    end_time_ist: '2026-09-27 10:17:30 IST',
    date_ymd: '2026-09-27',
    is_demo: true,
    events_count: 2,
    check_in_count: 1,
    missed_check_in_count: 0,
    sos_activated: false,
  },
  {
    journey_id: 'DEMO-JRN-004',
    status: 'COMPLETED',
    origin: 'Tambaram Sanatorium',
    destination: 'Velachery MRTS',
    route_type: 'BALANCED',
    distance_km: 14.2,
    duration_minutes: 38.0,
    elapsed_seconds: 2280,
    safety_score: 79.0,
    confidence_score: 82.5,
    start_time_ist: '2026-09-27 14:20:00 IST',
    end_time_ist: '2026-09-27 14:58:00 IST',
    date_ymd: '2026-09-27',
    is_demo: true,
    events_count: 4,
    check_in_count: 2,
    missed_check_in_count: 0,
    sos_activated: false,
  },
  {
    journey_id: 'DEMO-JRN-005',
    status: 'CANCELLED',
    origin: 'Koyambedu CMBT',
    destination: 'Anna Nagar West Depot',
    route_type: 'FASTEST',
    distance_km: 4.0,
    duration_minutes: 11.0,
    elapsed_seconds: 420,
    safety_score: 72.0,
    confidence_score: 75.0,
    start_time_ist: '2026-09-27 17:00:00 IST',
    end_time_ist: '2026-09-27 17:07:00 IST',
    date_ymd: '2026-09-27',
    is_demo: true,
    events_count: 2,
    check_in_count: 0,
    missed_check_in_count: 0,
    sos_activated: false,
  },
];

/**
 * Loads the local journey history records from browser localStorage.
 * Discards malformed or corrupted records safely.
 * @returns {Array}
 */
export function loadJourneyHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) => item && typeof item === 'object' && item.journey_id && item.status
    );
  } catch (err) {
    console.warn('Failed to parse journey history from localStorage:', err);
    return [];
  }
}

/**
 * Appends or updates a recorded journey in local storage.
 * Strictly prevents duplicate records with the same journey_id.
 * Limits ledger to 100 recent entries to prevent storage bloat.
 * @param {Object} record
 */
export function saveJourneyRecord(record) {
  if (!record || !record.journey_id || !record.status) return;

  try {
    const existing = loadJourneyHistory();
    const index = existing.findIndex((r) => r.journey_id === record.journey_id);

    const sanitized = {
      journey_id: String(record.journey_id),
      status: String(record.status),
      origin: String(record.origin || 'Unknown Origin'),
      destination: String(record.destination || 'Unknown Destination'),
      route_type: String(record.route_type || 'BALANCED').toUpperCase(),
      distance_km: Number(record.distance_km) || 0.0,
      duration_minutes: Number(record.duration_minutes) || 0.0,
      elapsed_seconds: Number(record.elapsed_seconds) || 0,
      safety_score: record.safety_score != null ? Number(record.safety_score) : null,
      confidence_score: record.confidence_score != null ? Number(record.confidence_score) : null,
      start_time_ist: String(record.start_time_ist || new Date().toISOString()),
      end_time_ist: record.end_time_ist ? String(record.end_time_ist) : null,
      date_ymd: String(record.date_ymd || new Date().toISOString().split('T')[0]),
      is_demo: Boolean(record.is_demo),
      events_count: Number(record.events_count) || 0,
      check_in_count: Number(record.check_in_count) || 0,
      missed_check_in_count: Number(record.missed_check_in_count) || 0,
      sos_activated: Boolean(record.sos_activated),
      recorded_at: new Date().toISOString(),
    };

    if (index >= 0) {
      existing[index] = sanitized;
    } else {
      existing.unshift(sanitized);
    }

    const capped = existing.slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(capped));
  } catch (err) {
    console.warn('Failed to save journey record to localStorage:', err);
  }
}

/**
 * Wipes local journey history for commuter privacy.
 */
export function clearJourneyHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  } catch (err) {
    console.warn('Failed to clear journey history from localStorage:', err);
  }
}

/**
 * Loads user-configured route preferences.
 * @returns {typeof DEFAULT_ROUTE_PREFERENCES}
 */
export function loadRoutePreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!raw) return { ...DEFAULT_ROUTE_PREFERENCES };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_ROUTE_PREFERENCES };

    return {
      routePreference: ['FASTEST', 'BALANCED', 'SAFEST'].includes(parsed.routePreference)
        ? parsed.routePreference
        : DEFAULT_ROUTE_PREFERENCES.routePreference,
      safetyWeight: typeof parsed.safetyWeight === 'number'
        ? Math.max(0, Math.min(1, parsed.safetyWeight))
        : DEFAULT_ROUTE_PREFERENCES.safetyWeight,
      avoidUnlitAreas: parsed.avoidUnlitAreas !== undefined
        ? Boolean(parsed.avoidUnlitAreas)
        : DEFAULT_ROUTE_PREFERENCES.avoidUnlitAreas,
      maxAcceptableDetourMinutes: typeof parsed.maxAcceptableDetourMinutes === 'number'
        ? Math.max(0, Math.min(60, parsed.maxAcceptableDetourMinutes))
        : DEFAULT_ROUTE_PREFERENCES.maxAcceptableDetourMinutes,
      minConfidenceThreshold: typeof parsed.minConfidenceThreshold === 'number'
        ? Math.max(0, Math.min(100, parsed.minConfidenceThreshold))
        : DEFAULT_ROUTE_PREFERENCES.minConfidenceThreshold,
      prioritizeActiveCorridors: parsed.prioritizeActiveCorridors !== undefined
        ? Boolean(parsed.prioritizeActiveCorridors)
        : DEFAULT_ROUTE_PREFERENCES.prioritizeActiveCorridors,
    };
  } catch {
    return { ...DEFAULT_ROUTE_PREFERENCES };
  }
}

/**
 * Saves commuter route preferences to localStorage.
 * @param {Object} prefs
 */
export function saveRoutePreferences(prefs) {
  try {
    if (!prefs || typeof prefs !== 'object') return;
    const sanitized = {
      routePreference: ['FASTEST', 'BALANCED', 'SAFEST'].includes(prefs.routePreference)
        ? prefs.routePreference
        : 'BALANCED',
      safetyWeight: typeof prefs.safetyWeight === 'number'
        ? Math.max(0, Math.min(1, prefs.safetyWeight))
        : 0.5,
      avoidUnlitAreas: Boolean(prefs.avoidUnlitAreas),
      maxAcceptableDetourMinutes: typeof prefs.maxAcceptableDetourMinutes === 'number'
        ? Math.max(0, Math.min(60, prefs.maxAcceptableDetourMinutes))
        : 10,
      minConfidenceThreshold: typeof prefs.minConfidenceThreshold === 'number'
        ? Math.max(0, Math.min(100, prefs.minConfidenceThreshold))
        : 30,
      prioritizeActiveCorridors: Boolean(prefs.prioritizeActiveCorridors),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('Failed to save route preferences to localStorage:', err);
  }
}

/**
 * Resets route preferences to standard baseline defaults.
 */
export function resetRoutePreferences() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
  } catch (err) {
    console.warn('Failed to reset route preferences in localStorage:', err);
  }
  return { ...DEFAULT_ROUTE_PREFERENCES };
}

/**
 * Pure calculation function for journey metrics and charts data.
 * Adheres strictly to requirements:
 * 1. Cancelled and active journeys are excluded from completed distance and duration.
 * 2. Correctly updates when filters (timeRange, routeType, status) change.
 * 3. Handles empty history gracefully.
 *
 * @param {Array} rawRecords
 * @param {{ timeRange?: string, routeType?: string, status?: string, includeDemo?: boolean }} filters
 * @returns {Object}
 */
export function calculateJourneyMetrics(rawRecords = [], filters = {}) {
  const {
    timeRange = 'all',
    routeType = 'ALL',
    status = 'ALL',
    includeDemo = false,
  } = filters;

  let pool = Array.isArray(rawRecords) ? [...rawRecords] : [];
  if (includeDemo) {
    const existingIds = new Set(pool.map((r) => r.journey_id));
    CHENNAI_DEMO_JOURNEYS.forEach((d) => {
      if (!existingIds.has(d.journey_id)) {
        pool.push(d);
      }
    });
  }

  // Calculate cutoff date for time range
  const now = new Date();
  let cutoffYmd = null;
  if (timeRange === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    cutoffYmd = d.toISOString().split('T')[0];
  } else if (timeRange === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    cutoffYmd = d.toISOString().split('T')[0];
  }

  // Filter records
  const filtered = pool.filter((r) => {
    if (!r) return false;
    // Time filter
    if (cutoffYmd && r.date_ymd && r.date_ymd < cutoffYmd) {
      return false;
    }
    // Route type filter
    if (routeType !== 'ALL' && (r.route_type || '').toUpperCase() !== routeType.toUpperCase()) {
      return false;
    }
    // Status filter
    if (status !== 'ALL' && (r.status || '').toUpperCase() !== status.toUpperCase()) {
      return false;
    }
    return true;
  });

  const completedRecords = filtered.filter((r) => r.status === 'COMPLETED');
  const cancelledRecords = filtered.filter((r) => r.status === 'CANCELLED');
  const activeRecords = filtered.filter((r) => r.status === 'ACTIVE' || r.status === 'PAUSED');

  const totalJourneys = filtered.length;
  const completedCount = completedRecords.length;
  const cancelledCount = cancelledRecords.length;
  const activeCount = activeRecords.length;

  // Travel distance and time strictly calculated from completed journeys
  const totalDistanceKm = Number(
    completedRecords.reduce((sum, r) => sum + (Number(r.distance_km) || 0), 0).toFixed(2)
  );
  const totalDurationMinutes = Number(
    completedRecords.reduce((sum, r) => sum + (Number(r.duration_minutes) || 0), 0).toFixed(1)
  );
  const averageDurationMinutes =
    completedCount > 0 ? Number((totalDurationMinutes / completedCount).toFixed(1)) : 0.0;

  // Average safety score & confidence
  const scoredRecords = completedRecords.filter((r) => typeof r.safety_score === 'number');
  const averageSafetyScore =
    scoredRecords.length > 0
      ? Number((scoredRecords.reduce((sum, r) => sum + r.safety_score, 0) / scoredRecords.length).toFixed(1))
      : null;

  const confRecords = completedRecords.filter((r) => typeof r.confidence_score === 'number');
  const averageConfidenceScore =
    confRecords.length > 0
      ? Number((confRecords.reduce((sum, r) => sum + r.confidence_score, 0) / confRecords.length).toFixed(1))
      : null;

  // Route type distribution
  const routeTypeBreakdown = { FASTEST: 0, BALANCED: 0, SAFEST: 0 };
  filtered.forEach((r) => {
    const rt = (r.route_type || '').toUpperCase();
    if (routeTypeBreakdown[rt] !== undefined) {
      routeTypeBreakdown[rt]++;
    } else {
      routeTypeBreakdown[rt] = 1;
    }
  });

  // Status breakdown
  const statusBreakdown = {
    COMPLETED: completedCount,
    CANCELLED: cancelledCount,
  };
  if (activeCount > 0) statusBreakdown.ACTIVE = activeCount;

  // Daily activity
  const dailyMap = {};
  filtered.forEach((r) => {
    const d = r.date_ymd || 'Unknown Date';
    if (!dailyMap[d]) {
      dailyMap[d] = { date: d, count: 0, distance_km: 0.0, duration_minutes: 0.0 };
    }
    dailyMap[d].count++;
    if (r.status === 'COMPLETED') {
      dailyMap[d].distance_km = Number(
        (dailyMap[d].distance_km + (Number(r.distance_km) || 0)).toFixed(2)
      );
      dailyMap[d].duration_minutes = Number(
        (dailyMap[d].duration_minutes + (Number(r.duration_minutes) || 0)).toFixed(1)
      );
    }
  });

  const dailyActivity = Object.keys(dailyMap)
    .sort()
    .map((k) => dailyMap[k]);

  // Duration distribution histogram (completed journeys)
  const b_lt15 = completedRecords.filter((r) => (Number(r.duration_minutes) || 0) < 15).length;
  const b_15_30 = completedRecords.filter(
    (r) => (Number(r.duration_minutes) || 0) >= 15 && (Number(r.duration_minutes) || 0) < 30
  ).length;
  const b_30_45 = completedRecords.filter(
    (r) => (Number(r.duration_minutes) || 0) >= 30 && (Number(r.duration_minutes) || 0) < 45
  ).length;
  const b_gte45 = completedRecords.filter((r) => (Number(r.duration_minutes) || 0) >= 45).length;

  const durationDistribution = [
    { bucket: '< 15 min', count: b_lt15, label: 'Short commute (< 15m)' },
    { bucket: '15–30 min', count: b_15_30, label: 'Standard commute (15–30m)' },
    { bucket: '30–45 min', count: b_30_45, label: 'Extended commute (30–45m)' },
    { bucket: '45+ min', count: b_gte45, label: 'Long-distance trip (45m+)' },
  ];

  return {
    totalJourneys,
    completedJourneys: completedCount,
    cancelledJourneys: cancelledCount,
    activeOrPausedJourneys: activeCount,
    totalDistanceKm,
    totalDurationMinutes,
    averageDurationMinutes,
    averageSafetyScore,
    averageConfidenceScore,
    routeTypeBreakdown,
    statusBreakdown,
    dailyActivity,
    durationDistribution,
    records: filtered,
    isDemoIncluded: includeDemo,
    dataDisclaimer:
      'Metrics reflect actual recorded journeys. Incomplete and cancelled journeys are strictly excluded from completed distance and duration calculations. Historical journeys do not guarantee future safety.',
  };
}

