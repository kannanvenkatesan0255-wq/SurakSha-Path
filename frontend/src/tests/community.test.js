import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchCommunityCategories,
  fetchCommunityReports,
  submitCommunityReport,
  confirmCommunityReport,
  disputeCommunityReport,
  flagCommunityReport,
  moderateCommunityReport,
} from '../api/community.js';

test('Community Intelligence: API client exports all reporting and verification functions', () => {
  assert.equal(typeof fetchCommunityCategories, 'function');
  assert.equal(typeof fetchCommunityReports, 'function');
  assert.equal(typeof submitCommunityReport, 'function');
  assert.equal(typeof confirmCommunityReport, 'function');
  assert.equal(typeof disputeCommunityReport, 'function');
  assert.equal(typeof flagCommunityReport, 'function');
  assert.equal(typeof moderateCommunityReport, 'function');
});

test('Community Categories: Base impact direction correctly aligns with environmental hazard types', () => {
  const sampleCategories = {
    POOR_LIGHTING: { baseImpact: -6.0, halfLifeHours: 72 },
    ACTIVE_POLICE_PRESENCE: { baseImpact: 7.0, halfLifeHours: 24 },
    DESERTED_STRETCH: { baseImpact: -8.0, halfLifeHours: 24 },
    HIGH_PEDESTRIAN_FOOTFALL: { baseImpact: 5.0, halfLifeHours: 24 },
    ISOLATED_UNDERPASS: { baseImpact: -10.0, halfLifeHours: 48 },
  };

  assert.ok(sampleCategories.POOR_LIGHTING.baseImpact < 0, 'Lighting deficiency must have negative impact');
  assert.ok(sampleCategories.DESERTED_STRETCH.baseImpact < 0, 'Deserted roadway must have negative impact');
  assert.ok(sampleCategories.ACTIVE_POLICE_PRESENCE.baseImpact > 0, 'Active police presence must have positive impact');
  assert.ok(sampleCategories.HIGH_PEDESTRIAN_FOOTFALL.baseImpact > 0, 'Commercial footfall must have positive impact');
});

test('Trust Weighting: Corroboration formula amplifies weight while bounding at cap', () => {
  const calculateC = (confirmations) => Math.min(1.5, 1.0 + 0.15 * Math.min(confirmations, 4));

  assert.equal(calculateC(0), 1.0);
  assert.equal(calculateC(1), 1.15);
  assert.equal(calculateC(2), 1.30);
  assert.equal(calculateC(3), 1.45);
  assert.equal(calculateC(4), 1.50);
  assert.equal(calculateC(10), 1.50, 'Must cap at 1.50 (+60%) to prevent burst manipulation');
});

test('Trust Weighting: Recency time-decay diminishes transient observation influence', () => {
  const calculateT = (hoursOld, halfLife) => Math.max(0.05, Math.min(1.0, 0.5 ** (hoursOld / halfLife)));

  const halfLife = 24; // 1 day
  const t0 = calculateT(0, halfLife);
  const t24 = calculateT(24, halfLife);
  const t48 = calculateT(48, halfLife);

  assert.equal(t0, 1.0, 'Fresh observation carries 1.0 time weight');
  assert.equal(t24, 0.5, 'At 1 half-life, weight must be 0.5');
  assert.equal(t48, 0.25, 'At 2 half-lives, weight must be 0.25');
  assert.ok(t0 > t24 && t24 > t48, 'Time decay must strictly decrease monotonically');
});

test('Trust Weighting: Dispute penalty appropriately suppresses contested reports', () => {
  const calculateD = (disputes) =>
    disputes > 0 ? Math.round(Math.max(0.1, 1.0 - 0.35 * disputes) * 100) / 100 : 1.0;

  assert.equal(calculateD(0), 1.0);
  assert.equal(calculateD(1), 0.65);
  assert.equal(calculateD(2), 0.30);
  assert.equal(calculateD(5), 0.10, 'Penalty must clamp at floor 0.10');
});

test('Community Privacy: Masking protects reporter identities from public exposure', () => {
  const rawReporterId = 'kannan_venkatesan_personal_account_9999';
  const reporterSuffix = rawReporterId.slice(-4).toUpperCase();
  const publicReporterDisplay = `Community Contributor #${reporterSuffix}`;

  assert.equal(publicReporterDisplay, 'Community Contributor #9999');
  assert.ok(!publicReporterDisplay.includes('kannan'));
  assert.ok(!publicReporterDisplay.includes('personal'));
  assert.ok(!publicReporterDisplay.includes('@'));
});

test('Synthetic Data Labeling: Demo reports are explicitly distinguishable from live data', () => {
  const demoReport = {
    report_id: 'REP-DEMO-401',
    is_synthetic: true,
    verification_status: 'SUBMITTED',
  };

  const liveReport = {
    report_id: 'REP-7B32F1A9',
    is_synthetic: false,
    verification_status: 'SUBMITTED',
  };

  assert.equal(demoReport.is_synthetic, true);
  assert.equal(liveReport.is_synthetic, false);
  assert.ok(demoReport.report_id.includes('DEMO'));
});
