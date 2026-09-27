/**
 * Local storage persistence and validation service for Journey Monitoring sessions (Phase 14).
 * Adheres to privacy constraints: Only local browser storage is used; no public transmission.
 */

export const STORAGE_KEYS = {
  SESSION: 'suraksha_journey_session',
  CONTACTS: 'suraksha_trusted_contacts',
  SETTINGS: 'suraksha_journey_settings',
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
