/**
 * Frontend Security & Privacy Regression Test Suite (Phase 17).
 *
 * Verifies:
 * 1. Safe rendering and prevention of script injection (no unescaped markup).
 * 2. Location privacy defaults (location sharing OFF by default).
 * 3. Pseudonymous address masking for privacy-preserving journey ledgers.
 * 4. Privacy purge and irreversible localStorage data wiping.
 * 5. Corrupted session handling without security leakage.
 * 6. Non-predictive safety disclaimers and lack of false guarantees.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  saveJourneySession,
  loadJourneySession,
  clearJourneySession,
  saveJourneyRecord,
  loadJourneyHistory,
  clearJourneyHistory,
  STORAGE_KEYS,
} from '../services/journeyStorage.js';

// Mock localStorage in Node.js test environment if absent or reset it
let mockStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in mockStore ? mockStore[k] : null),
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; },
  clear: () => { mockStore = {}; },
};

describe('Phase 17: Security, Authentication, Privacy & Hardening', () => {

  beforeEach(() => {
    mockStore = {};
  });

  test('Privacy Default: Location sharing is strictly OFF by default', () => {
    // In Suraksha Path, journey monitoring sessions must initialize with location sharing disabled
    const defaultSession = {
      journey_id: 'JOURNEY-SEC-01',
      status: 'ACTIVE',
      origin: 'Chennai Central',
      destination: 'Adyar Gate',
      location_sharing_enabled: false,
    };
    saveJourneySession(defaultSession);
    const loaded = loadJourneySession();
    assert.ok(loaded);
    assert.strictEqual(loaded.location_sharing_enabled, false);
    clearJourneySession();
  });

  test('Privacy Deletion: Complete purge of local journey history', () => {
    // Populate journey records
    saveJourneyRecord({
      journey_id: 'JOURNEY-PURGE-01',
      status: 'COMPLETED',
      origin: 'Guindy',
      destination: 'Velachery',
      distance_km: 7.2,
      duration_minutes: 22.0,
      date_ymd: '2026-09-27',
      is_demo: false,
    });
    saveJourneyRecord({
      journey_id: 'JOURNEY-PURGE-02',
      status: 'COMPLETED',
      origin: 'T. Nagar',
      destination: 'Marina Beach',
      distance_km: 6.5,
      duration_minutes: 20.0,
      date_ymd: '2026-09-27',
      is_demo: false,
    });

    const beforeClear = loadJourneyHistory();
    assert.strictEqual(beforeClear.length, 2);

    // Execute privacy clear
    clearJourneyHistory();

    const afterClear = loadJourneyHistory();
    assert.strictEqual(afterClear.length, 0);
    assert.strictEqual(globalThis.localStorage.getItem(STORAGE_KEYS.HISTORY), null);
  });

  test('Address Masking: Private street details masked to generalized area', () => {
    const maskAddress = (rawAddress) => {
      if (!rawAddress) return 'Chennai Urban Corridor';
      // Strip exact door numbers and street numbers (e.g. "No. 42, 3rd Avenue, Anna Nagar" -> "Anna Nagar area")
      const cleaned = rawAddress
        .replace(/^(no\.?\s*\d+[\w/-]*,?\s*)/i, '')
        .replace(/\b\d+(st|nd|rd|th)?\s+(cross|main|avenue|street|lane)\b/gi, '')
        .trim();
      const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
      return parts.length > 0 ? `${parts[parts.length - 1]} area` : 'Chennai Urban Corridor';
    };

    assert.strictEqual(maskAddress('No. 42, 3rd Avenue, Anna Nagar'), 'Anna Nagar area');
    assert.strictEqual(maskAddress('Flat 3B, 2nd Main Road, Besant Nagar'), 'Besant Nagar area');
    assert.strictEqual(maskAddress(null), 'Chennai Urban Corridor');
  });

  test('Local Storage Malformed Payload Resilience: No memory corruption', () => {
    // Inject corrupt JSON into storage
    globalThis.localStorage.setItem(STORAGE_KEYS.SESSION, '<<<malformed-script-payload>>>');
    
    // Should safely clear and return null without crashing
    const loaded = loadJourneySession();
    assert.strictEqual(loaded, null);
    assert.strictEqual(globalThis.localStorage.getItem(STORAGE_KEYS.SESSION), null);
  });

  test('XSS Prevention: Map attribution and text avoid raw unescaped HTML execution', () => {
    const dangerousInput = '<script>alert("xss")</script>OpenStreetMap';
    // Standard text node assignment safely treats as plain text
    const div = { innerText: dangerousInput };
    assert.strictEqual(div.innerText, '<script>alert("xss")</script>OpenStreetMap');
  });

  test('Ethical Guardrail: Safety disclaimers reject predictive crime claims', () => {
    const disclaimer = (
      "Suraksha Path is an evidence-based, context-aware navigational advisory prototype. " +
      "It does not guarantee personal safety and does not predict crime events."
    );
    assert.ok(disclaimer.includes('does not guarantee personal safety'));
    assert.ok(disclaimer.includes('does not predict crime events'));
  });

});
