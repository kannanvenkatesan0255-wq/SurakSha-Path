/**
 * Phase 15: Journey Insights, Safety Analytics & Route Preferences Test Suite.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as journeyApi from '../api/journey.js';
import {
  STORAGE_KEYS,
  DEFAULT_ROUTE_PREFERENCES,
  CHENNAI_DEMO_JOURNEYS,
  loadJourneyHistory,
  saveJourneyRecord,
  clearJourneyHistory,
  loadRoutePreferences,
  saveRoutePreferences,
  resetRoutePreferences,
  calculateJourneyMetrics,
} from '../services/journeyStorage.js';

// Polyfill minimal localStorage in node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(String(key)) || null,
    setItem: (key, val) => store.set(String(key), String(val)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
  };
}

describe('Phase 15: Journey Insights, Safety Analytics & Route Preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('API client exports all journey analytics and route preference functions', () => {
    assert.strictEqual(typeof journeyApi.fetchJourneyHistory, 'function');
    assert.strictEqual(typeof journeyApi.fetchJourneyAnalytics, 'function');
    assert.strictEqual(typeof journeyApi.recordJourneySessionApi, 'function');
    assert.strictEqual(typeof journeyApi.clearRemoteJourneyHistory, 'function');
    assert.strictEqual(typeof journeyApi.fetchRoutePreferencesApi, 'function');
    assert.strictEqual(typeof journeyApi.updateRoutePreferencesApi, 'function');
    assert.strictEqual(typeof journeyApi.resetRoutePreferencesApi, 'function');
  });

  test('Empty history yields valid zeroed metrics without crashing', () => {
    const metrics = calculateJourneyMetrics([], { timeRange: 'all', includeDemo: false });
    assert.strictEqual(metrics.totalJourneys, 0);
    assert.strictEqual(metrics.completedJourneys, 0);
    assert.strictEqual(metrics.cancelledJourneys, 0);
    assert.strictEqual(metrics.totalDistanceKm, 0.0);
    assert.strictEqual(metrics.totalDurationMinutes, 0.0);
    assert.strictEqual(metrics.averageDurationMinutes, 0.0);
    assert.strictEqual(metrics.averageSafetyScore, null);
    assert.strictEqual(metrics.averageConfidenceScore, null);
    assert.deepStrictEqual(metrics.dailyActivity, []);
    assert.strictEqual(metrics.durationDistribution.length, 4);
    for (const b of metrics.durationDistribution) {
      assert.strictEqual(b.count, 0);
    }
  });

  test('Journey metrics calculation strictly excludes cancelled trips from distance and duration', () => {
    const today = new Date().toISOString().split('T')[0];
    const records = [
      {
        journey_id: 'J1',
        status: 'COMPLETED',
        origin: 'Central',
        destination: 'T. Nagar',
        route_type: 'BALANCED',
        distance_km: 8.0,
        duration_minutes: 24.0,
        safety_score: 80.0,
        confidence_score: 85.0,
        date_ymd: today,
      },
      {
        journey_id: 'J2',
        status: 'COMPLETED',
        origin: 'Guindy',
        destination: 'Adyar',
        route_type: 'SAFEST',
        distance_km: 6.0,
        duration_minutes: 18.0,
        safety_score: 90.0,
        confidence_score: 95.0,
        date_ymd: today,
      },
      {
        journey_id: 'J3',
        status: 'CANCELLED',
        origin: 'Tambaram',
        destination: 'Velachery',
        route_type: 'FASTEST',
        distance_km: 15.0, // Cancelled: MUST NOT be in distance sum
        duration_minutes: 30.0, // Cancelled: MUST NOT be in duration sum
        safety_score: 70.0,
        confidence_score: 75.0,
        date_ymd: today,
      },
    ];

    const metrics = calculateJourneyMetrics(records, { timeRange: 'all', includeDemo: false });

    assert.strictEqual(metrics.totalJourneys, 3);
    assert.strictEqual(metrics.completedJourneys, 2);
    assert.strictEqual(metrics.cancelledJourneys, 1);

    // Total distance strictly 8.0 + 6.0 = 14.0 km (excluding 15.0 km cancelled)
    assert.strictEqual(metrics.totalDistanceKm, 14.0);
    // Total duration strictly 24.0 + 18.0 = 42.0 min (excluding 30.0 min cancelled)
    assert.strictEqual(metrics.totalDurationMinutes, 42.0);
    // Average duration = 42.0 / 2 = 21.0 min
    assert.strictEqual(metrics.averageDurationMinutes, 21.0);
    // Average safety score = (80.0 + 90.0) / 2 = 85.0
    assert.strictEqual(metrics.averageSafetyScore, 85.0);
    // Average confidence score = (85.0 + 95.0) / 2 = 90.0
    assert.strictEqual(metrics.averageConfidenceScore, 90.0);

    // Route type breakdown includes all attempts
    assert.strictEqual(metrics.routeTypeBreakdown.BALANCED, 1);
    assert.strictEqual(metrics.routeTypeBreakdown.SAFEST, 1);
    assert.strictEqual(metrics.routeTypeBreakdown.FASTEST, 1);
  });

  test('Date-range filtering accurately subsets records across 7d, 30d, and all', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoYmd = fiveDaysAgo.toISOString().split('T')[0];

    const twentyDaysAgo = new Date(now);
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    const twentyDaysAgoYmd = twentyDaysAgo.toISOString().split('T')[0];

    const fortyDaysAgo = new Date(now);
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    const fortyDaysAgoYmd = fortyDaysAgo.toISOString().split('T')[0];

    const records = [
      { journey_id: 'R1', status: 'COMPLETED', distance_km: 5.0, duration_minutes: 15.0, date_ymd: today },
      { journey_id: 'R2', status: 'COMPLETED', distance_km: 10.0, duration_minutes: 25.0, date_ymd: fiveDaysAgoYmd },
      { journey_id: 'R3', status: 'COMPLETED', distance_km: 15.0, duration_minutes: 35.0, date_ymd: twentyDaysAgoYmd },
      { journey_id: 'R4', status: 'COMPLETED', distance_km: 20.0, duration_minutes: 45.0, date_ymd: fortyDaysAgoYmd },
    ];

    // Last 7 days: R1 and R2
    const m7 = calculateJourneyMetrics(records, { timeRange: '7d' });
    assert.strictEqual(m7.totalJourneys, 2);
    assert.strictEqual(m7.totalDistanceKm, 15.0);

    // Last 30 days: R1, R2, R3
    const m30 = calculateJourneyMetrics(records, { timeRange: '30d' });
    assert.strictEqual(m30.totalJourneys, 3);
    assert.strictEqual(m30.totalDistanceKm, 30.0);

    // All: R1, R2, R3, R4
    const mAll = calculateJourneyMetrics(records, { timeRange: 'all' });
    assert.strictEqual(mAll.totalJourneys, 4);
    assert.strictEqual(mAll.totalDistanceKm, 50.0);
  });

  test('Filtering by route type and journey status updates all metrics consistently', () => {
    const today = new Date().toISOString().split('T')[0];
    const records = [
      { journey_id: 'F1', status: 'COMPLETED', route_type: 'FASTEST', distance_km: 5.0, duration_minutes: 10.0, date_ymd: today },
      { journey_id: 'S1', status: 'COMPLETED', route_type: 'SAFEST', distance_km: 8.0, duration_minutes: 20.0, date_ymd: today },
      { journey_id: 'B1', status: 'CANCELLED', route_type: 'BALANCED', distance_km: 12.0, duration_minutes: 25.0, date_ymd: today },
    ];

    // Filter by route_type = 'FASTEST'
    const mFast = calculateJourneyMetrics(records, { routeType: 'FASTEST' });
    assert.strictEqual(mFast.totalJourneys, 1);
    assert.strictEqual(mFast.completedJourneys, 1);
    assert.strictEqual(mFast.totalDistanceKm, 5.0);

    // Filter by status = 'CANCELLED'
    const mCanc = calculateJourneyMetrics(records, { status: 'CANCELLED' });
    assert.strictEqual(mCanc.totalJourneys, 1);
    assert.strictEqual(mCanc.completedJourneys, 0);
    assert.strictEqual(mCanc.cancelledJourneys, 1);
    assert.strictEqual(mCanc.totalDistanceKm, 0.0);
  });

  test('LocalStorage persistence prevents duplicate records with identical journey_id', () => {
    const rec1 = {
      journey_id: 'JRN-DUPLICATE-01',
      status: 'COMPLETED',
      origin: 'Central',
      destination: 'T. Nagar',
      route_type: 'BALANCED',
      distance_km: 8.4,
      duration_minutes: 24.0,
      elapsed_seconds: 1440,
    };

    saveJourneyRecord(rec1);
    // Attempt duplicate save
    saveJourneyRecord(rec1);

    const history = loadJourneyHistory();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].journey_id, 'JRN-DUPLICATE-01');
  });

  test('Privacy control: clearing history removes all local records', () => {
    saveJourneyRecord({
      journey_id: 'PRIV-01',
      status: 'COMPLETED',
      origin: 'A',
      destination: 'B',
    });

    assert.strictEqual(loadJourneyHistory().length, 1);

    clearJourneyHistory();
    assert.strictEqual(loadJourneyHistory().length, 0);
  });

  test('Route preferences can be loaded, updated, and reset to defaults', () => {
    // 1. Initial defaults
    const defPrefs = loadRoutePreferences();
    assert.strictEqual(defPrefs.routePreference, 'BALANCED');
    assert.strictEqual(defPrefs.safetyWeight, 0.5);
    assert.strictEqual(defPrefs.avoidUnlitAreas, true);
    assert.strictEqual(defPrefs.maxAcceptableDetourMinutes, 10);
    assert.strictEqual(defPrefs.minConfidenceThreshold, 30);
    assert.strictEqual(defPrefs.prioritizeActiveCorridors, true);

    // 2. Save custom preferences
    saveRoutePreferences({
      routePreference: 'SAFEST',
      safetyWeight: 0.85,
      avoidUnlitAreas: true,
      maxAcceptableDetourMinutes: 20,
      minConfidenceThreshold: 60,
      prioritizeActiveCorridors: true,
    });

    const saved = loadRoutePreferences();
    assert.strictEqual(saved.routePreference, 'SAFEST');
    assert.strictEqual(saved.safetyWeight, 0.85);
    assert.strictEqual(saved.maxAcceptableDetourMinutes, 20);
    assert.strictEqual(saved.minConfidenceThreshold, 60);

    // 3. Reset to defaults
    const reset = resetRoutePreferences();
    assert.strictEqual(reset.routePreference, 'BALANCED');
    assert.strictEqual(reset.safetyWeight, 0.5);
    assert.strictEqual(reset.maxAcceptableDetourMinutes, 10);
  });

  test('Demo sample journeys are isolated and explicitly labeled with is_demo: true', () => {
    assert.ok(CHENNAI_DEMO_JOURNEYS.length >= 4);
    for (const d of CHENNAI_DEMO_JOURNEYS) {
      assert.strictEqual(d.is_demo, true);
      assert.ok(d.journey_id.startsWith('DEMO-'));
    }

    // When includeDemo is false, demo records are not injected
    const mNoDemo = calculateJourneyMetrics([], { includeDemo: false });
    assert.strictEqual(mNoDemo.totalJourneys, 0);

    // When includeDemo is true, demo records are injected
    const mDemo = calculateJourneyMetrics([], { includeDemo: true });
    assert.strictEqual(mDemo.totalJourneys, CHENNAI_DEMO_JOURNEYS.length);
    assert.strictEqual(mDemo.isDemoIncluded, true);
  });

  test('Safety Score and Epistemic Confidence are strictly distinct metrics', () => {
    const demo = CHENNAI_DEMO_JOURNEYS[0];
    assert.notStrictEqual(demo.safety_score, demo.confidence_score);
    // Safety score is on 15.0 - 95.0 scale
    assert.ok(demo.safety_score >= 15.0 && demo.safety_score <= 95.0);
    // Confidence is on 10.0 - 100.0%
    assert.ok(demo.confidence_score >= 10.0 && demo.confidence_score <= 100.0);
  });
});
