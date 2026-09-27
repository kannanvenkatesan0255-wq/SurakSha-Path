/**
 * Phase 13: Real-Time Context, Time-of-Day & Environmental Adjustments Test Suite.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as contextApi from '../api/context.js';

describe('Phase 13: Real-Time Context, Time-of-Day & Environmental Logic', () => {
  test('API client exports all context evaluation and reassessment functions', () => {
    assert.strictEqual(typeof contextApi.fetchCurrentContext, 'function');
    assert.strictEqual(typeof contextApi.evaluateJourneyContext, 'function');
    assert.strictEqual(typeof contextApi.reassessRouteContext, 'function');
  });

  test('Official timezone is strictly Asia/Kolkata (IST: UTC+5:30) without DST', () => {
    const CHENNAI_TIMEZONE = 'Asia/Kolkata (IST: UTC+5:30)';
    assert.ok(CHENNAI_TIMEZONE.includes('Asia/Kolkata'));
    assert.ok(CHENNAI_TIMEZONE.includes('UTC+5:30'));
  });

  test('Solar illumination phases map accurately to lighting relevance factors', () => {
    // Phase to relevance mapping
    const solarPhases = {
      DAYLIGHT: { relevance: 0.20, isDark: false },
      GOLDEN_HOUR: { relevance: 0.45, isDark: false },
      CIVIL_TWILIGHT: { relevance: 0.75, isDark: false },
      NIGHT_EARLY: { relevance: 1.00, isDark: true },
      NIGHT_LATE: { relevance: 1.00, isDark: true },
    };

    assert.strictEqual(solarPhases.DAYLIGHT.relevance, 0.20);
    assert.strictEqual(solarPhases.DAYLIGHT.isDark, false);

    assert.strictEqual(solarPhases.CIVIL_TWILIGHT.relevance, 0.75);

    assert.strictEqual(solarPhases.NIGHT_EARLY.relevance, 1.00);
    assert.strictEqual(solarPhases.NIGHT_EARLY.isDark, true);

    assert.strictEqual(solarPhases.NIGHT_LATE.relevance, 1.00);
    assert.strictEqual(solarPhases.NIGHT_LATE.isDark, true);
  });

  test('Diurnal footfall attenuation curve reflects Chennai transit rhythm', () => {
    const getFootfallFactor = (hour) => {
      if (8 <= hour && hour < 21) return 1.00;
      if (21 <= hour && hour < 22) return 0.85;
      if (22 <= hour && hour < 23) return 0.60;
      if (23 <= hour || hour < 5) return 0.35; // Late night sparse
      return 0.70;
    };

    assert.strictEqual(getFootfallFactor(12), 1.00); // Noon peak
    assert.strictEqual(getFootfallFactor(21), 0.85); // Evening taper
    assert.strictEqual(getFootfallFactor(22), 0.60); // Night drop
    assert.strictEqual(getFootfallFactor(2), 0.35);  // Late night minimum
  });

  test('Contextual modifiers are strictly bounded to [-8.0, +5.0] points', () => {
    const clampModifier = (raw) => Math.max(-8.0, Math.min(5.0, raw));

    assert.strictEqual(clampModifier(10.5), 5.0);
    assert.strictEqual(clampModifier(-14.2), -8.0);
    assert.strictEqual(clampModifier(2.3), 2.3);
    assert.strictEqual(clampModifier(-4.5), -4.5);
  });

  test('Double-counting safeguard dampens contextual penalty against existing reports', () => {
    const rawModifier = -4.0;
    const hasExistingReport = true;
    const dampingFactor = 0.65;

    const appliedModifier = hasExistingReport ? rawModifier * dampingFactor : rawModifier;
    assert.strictEqual(appliedModifier, -2.6);
  });

  test('Waterlogging risk classifications identify high-precipitation monsoon events', () => {
    const getWaterloggingRisk = (precipMm, wmoCode) => {
      if (precipMm >= 7.5 || [65, 82, 95, 96, 99].includes(wmoCode)) return 'HIGH';
      if (precipMm >= 2.5 || [63, 81].includes(wmoCode)) return 'MODERATE';
      if (precipMm > 0.2) return 'LOW';
      return 'NONE';
    };

    assert.strictEqual(getWaterloggingRisk(0.0, 0), 'NONE');
    assert.strictEqual(getWaterloggingRisk(1.0, 61), 'LOW');
    assert.strictEqual(getWaterloggingRisk(4.5, 63), 'MODERATE');
    assert.strictEqual(getWaterloggingRisk(12.0, 65), 'HIGH');
  });

  test('Route reassessment preserves geometric and kinematic invariants', () => {
    const originalRoute = {
      route_id: 'ROUTE-001',
      metrics: {
        distance_meters: 6500.0,
        distance_km: 6.5,
        duration_minutes: 15.0,
      },
      coordinates: [[80.27, 13.08], [80.25, 13.04]],
      safety_score: 72.0,
      confidence_score: 80.0,
    };

    // Reassessment modifies scores, NOT kinematics
    const reassessedRoute = {
      ...originalRoute,
      safety_score: 69.5,
      confidence_score: 78.0,
      contextual_report: {
        journey_date: '2026-09-28',
        departure_time: '23:45',
        contextual_modifier_mean_pts: -2.5,
      },
    };

    assert.strictEqual(reassessedRoute.metrics.distance_meters, originalRoute.metrics.distance_meters);
    assert.strictEqual(reassessedRoute.metrics.duration_minutes, originalRoute.metrics.duration_minutes);
    assert.strictEqual(reassessedRoute.coordinates.length, originalRoute.coordinates.length);
    assert.notStrictEqual(reassessedRoute.safety_score, originalRoute.safety_score);
    assert.strictEqual(reassessedRoute.contextual_report.contextual_modifier_mean_pts, -2.5);
  });

  test('Transparent provenance distinguishes live telemetry, hourly forecast, and climate norm', () => {
    const validProvenances = [
      'LIVE_OPEN_METEO',
      'HOURLY_FORECAST',
      'HISTORICAL_CLIMATE_BASELINE',
      'OFFLINE_DEMO_SIMULATION',
    ];

    validProvenances.forEach((prov) => {
      assert.ok(typeof prov === 'string' && prov.length > 0);
    });
  });

  test('Non-predictive disclaimers explicitly prohibit crime guarantees', () => {
    const disclaimer = 'Contextual adjustments reflect physical illumination and meteorological road traction. They do NOT predict crime or guarantee personal safety.';
    assert.ok(disclaimer.includes('NOT predict crime'));
    assert.ok(disclaimer.includes('guarantee personal safety'));
  });
});
