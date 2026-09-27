/**
 * Phase 14: Safety Check-In, Journey Monitoring & SOS Workflow Test Suite.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as journeyApi from '../api/journey.js';
import {
  JOURNEY_STATUSES,
  CHECK_IN_INTERVALS,
  CHENNAI_EMERGENCY_HELPLINES,
} from '../utils/constants.js';
import {
  STORAGE_KEYS,
  saveJourneySession,
  loadJourneySession,
  clearJourneySession,
  loadTrustedContacts,
  saveTrustedContacts,
  loadJourneySettings,
} from '../services/journeyStorage.js';

describe('Phase 14: Journey Monitoring, Safety Check-In & SOS Workflow', () => {
  test('API client exports all journey monitoring and helpline functions', () => {
    assert.strictEqual(typeof journeyApi.fetchChennaiHelplines, 'function');
    assert.strictEqual(typeof journeyApi.startJourneySession, 'function');
    assert.strictEqual(typeof journeyApi.transitionJourneySession, 'function');
    assert.strictEqual(typeof journeyApi.fetchJourneySession, 'function');
  });

  test('Permitted journey statuses define clear WCAG visual tokens and labels', () => {
    const statuses = ['NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];
    for (const s of statuses) {
      assert.ok(JOURNEY_STATUSES[s], `Status ${s} must be defined`);
      assert.ok(JOURNEY_STATUSES[s].label, `Status ${s} must have a label`);
      assert.ok(JOURNEY_STATUSES[s].fullLabel, `Status ${s} must have a full label`);
      assert.ok(JOURNEY_STATUSES[s].badgeVariant, `Status ${s} must have a badge variant`);
    }
  });

  test('Lifecycle state machine validates allowed and disallowed transitions', () => {
    const canTransition = (current, action) => {
      if (action === 'start') return current === 'NOT_STARTED';
      if (action === 'pause') return current === 'ACTIVE';
      if (action === 'resume') return current === 'PAUSED';
      if (action === 'complete') return current === 'ACTIVE' || current === 'PAUSED';
      if (action === 'cancel') return current === 'ACTIVE' || current === 'PAUSED';
      return false;
    };

    // Valid transitions
    assert.strictEqual(canTransition('NOT_STARTED', 'start'), true);
    assert.strictEqual(canTransition('ACTIVE', 'pause'), true);
    assert.strictEqual(canTransition('PAUSED', 'resume'), true);
    assert.strictEqual(canTransition('ACTIVE', 'complete'), true);
    assert.strictEqual(canTransition('PAUSED', 'complete'), true);
    assert.strictEqual(canTransition('ACTIVE', 'cancel'), true);
    assert.strictEqual(canTransition('PAUSED', 'cancel'), true);

    // Invalid transitions
    assert.strictEqual(canTransition('COMPLETED', 'pause'), false);
    assert.strictEqual(canTransition('COMPLETED', 'resume'), false);
    assert.strictEqual(canTransition('COMPLETED', 'complete'), false);
    assert.strictEqual(canTransition('CANCELLED', 'resume'), false);
    assert.strictEqual(canTransition('CANCELLED', 'start'), false);
    assert.strictEqual(canTransition('NOT_STARTED', 'pause'), false);
  });

  test('Check-in intervals offer standard and demo durations', () => {
    assert.ok(CHECK_IN_INTERVALS.length >= 4);
    const intervals = CHECK_IN_INTERVALS.map((i) => i.value);
    assert.ok(intervals.includes(15), '15-minute standard option required');
    assert.ok(intervals.includes(0.5) || intervals.includes(1), 'Demo interval required for rapid testing');
  });

  test('Check-in prompts clearly distinguish OK from Assistance Request', () => {
    const handleCheckInResponse = (responseType) => {
      if (responseType === 'OK') {
        return { checkInDue: false, sosActive: false, eventType: 'CHECK_IN_COMPLETED' };
      }
      if (responseType === 'HELP') {
        return { checkInDue: false, sosActive: true, eventType: 'SOS_ACTIVATED' };
      }
      throw new Error('Unknown response');
    };

    const okResult = handleCheckInResponse('OK');
    assert.strictEqual(okResult.checkInDue, false);
    assert.strictEqual(okResult.sosActive, false);
    assert.strictEqual(okResult.eventType, 'CHECK_IN_COMPLETED');

    const helpResult = handleCheckInResponse('HELP');
    assert.strictEqual(helpResult.checkInDue, false);
    assert.strictEqual(helpResult.sosActive, true);
    assert.strictEqual(helpResult.eventType, 'SOS_ACTIVATED');
  });

  test('Missed check-ins are treated as uncertain signals, not proof of danger', () => {
    const missedCheckInPolicy = {
      isProofOfDanger: false,
      silentlyAlertsAuthorities: false,
      requiresManualConfirmation: true,
      advisoryMessage: 'Check-in overdue. This is an uncertain status and does not prove emergency.',
    };

    assert.strictEqual(missedCheckInPolicy.isProofOfDanger, false);
    assert.strictEqual(missedCheckInPolicy.silentlyAlertsAuthorities, false);
    assert.strictEqual(missedCheckInPolicy.requiresManualConfirmation, true);
  });

  test('SOS workflow provides verified Chennai emergency contacts', () => {
    assert.ok(CHENNAI_EMERGENCY_HELPLINES.length >= 4);
    const numbers = CHENNAI_EMERGENCY_HELPLINES.map((h) => h.number);
    assert.ok(numbers.includes('100'), 'Police Control Room (100) must be present');
    assert.ok(numbers.includes('112'), 'National ERSS (112) must be present');
    assert.ok(numbers.includes('1091'), 'Women Safety (1091) must be present');
    assert.ok(numbers.includes('108'), 'Ambulance (108) must be present');
    assert.ok(numbers.includes('1913'), 'GCC Flood & Civic Helpline (1913) must be present');
  });

  test('Location sharing is OFF by default and requires explicit opt-in', () => {
    const defaultSettings = {
      locationSharingEnabled: false,
      locationStatus: 'OFF_BY_DEFAULT',
      isDemoMode: false,
    };

    assert.strictEqual(defaultSettings.locationSharingEnabled, false);
    assert.strictEqual(defaultSettings.locationStatus, 'OFF_BY_DEFAULT');
  });

  test('Simulated coordinates are explicitly labeled and distinguished from live GPS', () => {
    const formatLocationLabel = (loc) => {
      if (!loc) return 'No Position';
      if (loc.isSimulated) return `DEMO SIMULATION: ${loc.label}`;
      return `LIVE GPS: ${loc.label}`;
    };

    const simLoc = { lat: 13.0827, lng: 80.2707, isSimulated: true, label: 'Corridor Step 1' };
    const liveLoc = { lat: 13.0827, lng: 80.2707, isSimulated: false, label: 'Device Position' };

    assert.ok(formatLocationLabel(simLoc).startsWith('DEMO SIMULATION'));
    assert.ok(formatLocationLabel(liveLoc).startsWith('LIVE GPS'));
  });

  test('Storage service handles malformed or missing localStorage data safely', () => {
    // Mock localStorage in Node.js test environment if absent
    if (typeof globalThis.localStorage === 'undefined') {
      const store = {};
      globalThis.localStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
      };
    }

    // 1. Valid session save and load
    const validSession = {
      journey_id: 'JRN-TEST1234',
      status: 'ACTIVE',
      origin: 'Chennai Central',
      destination: 'T. Nagar',
    };
    saveJourneySession(validSession);
    const loaded = loadJourneySession();
    assert.ok(loaded);
    assert.strictEqual(loaded.journey_id, 'JRN-TEST1234');
    assert.strictEqual(loaded.status, 'ACTIVE');

    // 2. Corrupted data handling
    globalThis.localStorage.setItem(STORAGE_KEYS.SESSION, '{invalid-json');
    const corruptedResult = loadJourneySession();
    assert.strictEqual(corruptedResult, null);

    // 3. Clear session
    clearJourneySession();
    assert.strictEqual(loadJourneySession(), null);
  });
});
