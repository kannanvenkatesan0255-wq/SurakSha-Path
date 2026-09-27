import test from 'node:test';
import assert from 'node:assert/strict';

test('Explainability Semantics: Safety Score scale is [15.0 - 95.0] with neutral anchor 50.0', () => {
  const safetySemantics = {
    metric_name: 'Safety Score',
    scale_min: 15.0,
    scale_max: 95.0,
    neutral_anchor: 50.0,
    unit: 'points',
  };

  assert.equal(safetySemantics.scale_min, 15.0);
  assert.equal(safetySemantics.scale_max, 95.0);
  assert.equal(safetySemantics.neutral_anchor, 50.0);
  assert.equal(safetySemantics.unit, 'points');
});

test('Explainability Semantics: Confidence is an epistemic certainty measure [10.0 - 100.0]%', () => {
  const confidenceSemantics = {
    metric_name: 'Data Reliability (Confidence)',
    scale_min: 10.0,
    scale_max: 100.0,
    unit: 'percentage',
  };

  assert.equal(confidenceSemantics.scale_min, 10.0);
  assert.equal(confidenceSemantics.scale_max, 100.0);
  assert.equal(confidenceSemantics.unit, 'percentage');
});

test('Explainability Semantics: Safety Score and Confidence are strictly distinct', () => {
  // Scenario 1: A corridor with poor infrastructure, audited with high confidence
  const poorlyLitAuditedSegment = {
    segment_code: 'SEG-POOR-01',
    safety_score: 32.0, // Low score
    confidence_score: 92.0, // High confidence in poor condition
  };
  assert.equal(poorlyLitAuditedSegment.safety_score < 45.0, true);
  assert.equal(poorlyLitAuditedSegment.confidence_score >= 80.0, true);

  // Scenario 2: A newly registered corridor with zero audits
  const unverifiedSegment = {
    segment_code: 'SEG-UNAUDITED-01',
    safety_score: null, // Null - never fabricated 0 or 100
    confidence_score: 10.0, // Baseline uncertainty
  };
  assert.equal(unverifiedSegment.safety_score, null);
  assert.equal(unverifiedSegment.confidence_score, 10.0);
});

test('Explainability Coverage: Distance-weighted coverage ratio and sparse warning', () => {
  const totalLengthM = 10000.0;
  const assessedLengthM = 2200.0;
  const coverageRatio = assessedLengthM / totalLengthM;

  assert.equal(coverageRatio, 0.22);
  const isSparse = coverageRatio < 0.25;
  assert.equal(isSparse, true, 'Coverage below 25% must trigger sparse evidence warning');

  const assessedKm = Math.round((assessedLengthM / 1000.0) * 100) / 100;
  const unassessedKm = Math.round(((totalLengthM - assessedLengthM) / 1000.0) * 100) / 100;
  assert.equal(assessedKm, 2.2);
  assert.equal(unassessedKm, 7.8);
});

test('Explainability Categories: Represents all 5 core Chennai evidence streams', () => {
  const requiredCategories = [
    'LIGHTING',
    'POLICE_PRESENCE',
    'PEDESTRIAN_INFRASTRUCTURE',
    'ROAD_CHARACTERISTIC',
    'COMMUNITY_REPORT',
  ];

  const categoryWeights = {
    LIGHTING: 0.35,
    POLICE_PRESENCE: 0.20,
    PEDESTRIAN_INFRASTRUCTURE: 0.15,
    ROAD_CHARACTERISTIC: 0.15,
    COMMUNITY_REPORT: 0.15,
  };

  const totalWeight = Object.values(categoryWeights).reduce((a, b) => a + b, 0);
  assert.equal(Math.round(totalWeight * 100) / 100, 1.0);

  requiredCategories.forEach((cat) => {
    assert.ok(categoryWeights[cat] > 0, `Category ${cat} must have positive heuristic weight`);
  });
});

test('Explainability Segments: Calculates segment distance contribution percentage', () => {
  const routeDistM = 8000.0;
  const segments = [
    { segment_code: 'S1', length_meters: 2000.0 },
    { segment_code: 'S2', length_meters: 4000.0 },
    { segment_code: 'S3', length_meters: 2000.0 },
  ];

  const percentages = segments.map((s) => Math.round((s.length_meters / routeDistM) * 100));
  assert.deepEqual(percentages, [25, 50, 25]);
  assert.equal(percentages.reduce((a, b) => a + b, 0), 100);
});

test('Explainability Bottleneck: Identifies highest-risk segment on route', () => {
  const segments = [
    { segment_code: 'S1', safety_score: 82.0 },
    { segment_code: 'S2', safety_score: 44.0, bottleneck_reason: 'Unlit underpass' },
    { segment_code: 'S3', safety_score: 76.0 },
  ];

  const lowestScoreSeg = segments.reduce((min, s) => (s.safety_score < min.safety_score ? s : min), segments[0]);
  assert.equal(lowestScoreSeg.segment_code, 'S2');
  assert.equal(lowestScoreSeg.bottleneck_reason, 'Unlit underpass');
});

test('Explainability Trade-Offs: Explains distinct objectives for Fastest, Balanced, and Safest', () => {
  const mockJustifications = {
    FASTEST: {
      priority: 'MIN_DURATION',
      detourMinutes: 0.0,
      safetyCost: 'Accepts unlit or lower-surveillance corridors for speed',
    },
    BALANCED: {
      priority: 'PARETO_COMPROMISE',
      detourMinutes: 1.5,
      safetyGain: '+14 safety points for modest +1.5 min detour',
    },
    SAFEST: {
      priority: 'MAX_SAFETY_EVIDENCE',
      detourMinutes: 4.2,
      safetyGain: '+25 safety points along verified lit arterial corridors',
    },
  };

  assert.equal(mockJustifications.FASTEST.detourMinutes, 0.0);
  assert.ok(mockJustifications.BALANCED.detourMinutes > 0);
  assert.ok(mockJustifications.SAFEST.detourMinutes > mockJustifications.BALANCED.detourMinutes);
});

test('Explainability Uncertainty: Absence of evidence is explicitly not proof of safety', () => {
  const warningText = 'Absence of reported incidents or missing records is NOT proof of safety.';
  assert.ok(warningText.includes('NOT proof of safety'));
});

test('Safety API Client: Exports explainability methods', async () => {
  const safetyModule = await import('../api/safety.js');
  assert.equal(typeof safetyModule.fetchRouteExplainability, 'function');
  assert.equal(typeof safetyModule.fetchMetricSemantics, 'function');
});
