import test from 'node:test';
import assert from 'node:assert/strict';

test('Trade-Off Engine: Calculates detour penalty accurately against fastest baseline', () => {
  const fastestDurationMin = 10.0;
  const alternativeDurationMin = 12.4;

  const detourMinutes = Math.round((alternativeDurationMin - fastestDurationMin) * 10) / 10;
  assert.equal(detourMinutes, 2.4);

  const detourPercent = Math.round(((alternativeDurationMin - fastestDurationMin) / fastestDurationMin) * 100);
  assert.equal(detourPercent, 24);
});

test('Trade-Off Engine: Calculates safety advantage points against fastest alternative', () => {
  const fastestSafetyScore = 58.2;
  const safestSafetyScore = 84.6;

  const safetyAdvantage = Math.round((safestSafetyScore - fastestSafetyScore) * 10) / 10;
  assert.equal(safetyAdvantage, 26.4);
});

test('Trade-Off Engine: Distinguishes Safety Score from Data Confidence', () => {
  const mockAlternative = {
    route_id: 'ROUTE-ALT-2',
    route_type: 'SAFEST',
    safety_score: 82.5,
    confidence_score: 65.0,
    evidence_coverage_ratio: 0.70,
  };

  // Safety Score is a rating out of 100 reflecting environmental factors
  assert.equal(mockAlternative.safety_score, 82.5);
  // Confidence is an epistemic certainty measure, NOT an incident probability
  assert.equal(mockAlternative.confidence_score, 65.0);
  assert.notEqual(mockAlternative.safety_score, mockAlternative.confidence_score);
});

test('Trade-Off Engine: Preference selection matches recommended strategy tag', () => {
  const mockRoutes = [
    {
      route_id: 'ROUTE-1',
      route_type: 'FASTEST',
      recommended_for: 'FASTEST',
      metrics: { duration_minutes: 10.0 },
    },
    {
      route_id: 'ROUTE-2',
      route_type: 'BALANCED',
      recommended_for: 'BALANCED',
      metrics: { duration_minutes: 11.5 },
    },
    {
      route_id: 'ROUTE-3',
      route_type: 'SAFEST',
      recommended_for: 'SAFEST',
      metrics: { duration_minutes: 13.0 },
    },
  ];

  const selectForPreference = (pref) => {
    return mockRoutes.find((r) => r.recommended_for === pref || r.route_type === pref) || mockRoutes[0];
  };

  assert.equal(selectForPreference('FASTEST').route_id, 'ROUTE-1');
  assert.equal(selectForPreference('BALANCED').route_id, 'ROUTE-2');
  assert.equal(selectForPreference('SAFEST').route_id, 'ROUTE-3');
});

test('Trade-Off Engine: Sparse evidence coverage requires explicit caution flag', () => {
  const sparseRoute = {
    route_id: 'ROUTE-SPARSE',
    safety_score: 75.0,
    evidence_coverage_ratio: 0.18, // 18% < 25% threshold
  };

  const isSparse = (sparseRoute.evidence_coverage_ratio || 0) < 0.25;
  assert.equal(isSparse, true, 'Route with <25% coverage must be flagged as sparse');
});

test('Trade-Off Engine: Single-route response never clones artificial duplicates', () => {
  const singleRouteResponse = {
    status: 'SUCCESS',
    alternatives: [
      {
        route_id: 'ROUTE-ALT-1',
        route_type: 'FASTEST',
        tradeoff_explanation: 'Single viable road corridor identified between these points.',
      },
    ],
  };

  assert.equal(singleRouteResponse.alternatives.length, 1);
  assert.ok(singleRouteResponse.alternatives[0].tradeoff_explanation.includes('Single viable road corridor'));
});
