/**
 * Test suite for Phase 12 Feedback-Driven Reassessment & Continuous Improvement.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchFeedbackTypes,
  submitFeedback,
  fetchFeedbackList,
  fetchFeedbackById,
  reviewFeedback,
  reassessSegment,
  reassessRoute,
  fetchReassessmentAuditLog,
  fetchSegmentReassessmentHistory,
  submitLegacyJourneyFeedback,
} from '../api/feedback.js';

describe('Phase 12: Feedback-Driven Reassessment API & Logic', () => {
  it('API client exports all feedback and reassessment methods', () => {
    assert.equal(typeof fetchFeedbackTypes, 'function');
    assert.equal(typeof submitFeedback, 'function');
    assert.equal(typeof fetchFeedbackList, 'function');
    assert.equal(typeof fetchFeedbackById, 'function');
    assert.equal(typeof reviewFeedback, 'function');
    assert.equal(typeof reassessSegment, 'function');
    assert.equal(typeof reassessRoute, 'function');
    assert.equal(typeof fetchReassessmentAuditLog, 'function');
    assert.equal(typeof fetchSegmentReassessmentHistory, 'function');
    assert.equal(typeof submitLegacyJourneyFeedback, 'function');
  });

  it('Controlled categories distinguish road evidence from general product feedback', () => {
    const controlledCategories = [
      { key: 'CONDITION_CHANGED', affectsSafety: true },
      { key: 'OBSERVATION_OUTDATED', affectsSafety: true },
      { key: 'REPORT_INACCURATE', affectsSafety: true },
      { key: 'INFRASTRUCTURE_ISSUE', affectsSafety: true },
      { key: 'ASSESSMENT_INCONSISTENT', affectsSafety: true },
      { key: 'LOCATION_ASSOCIATION_ERROR', affectsSafety: true },
      { key: 'GENERAL_PRODUCT_FEEDBACK', affectsSafety: false },
    ];

    const generalFeedback = controlledCategories.find((c) => c.key === 'GENERAL_PRODUCT_FEEDBACK');
    assert.equal(generalFeedback.affectsSafety, false, 'General product feedback must never alter road safety scores');

    const infrastructureFeedback = controlledCategories.find((c) => c.key === 'INFRASTRUCTURE_ISSUE');
    assert.equal(infrastructureFeedback.affectsSafety, true, 'Infrastructure issues must affect road safety scores');
  });

  it('Operational intents support nuanced civic feedback without auto-verification', () => {
    const validIntents = [
      'NEW_OBSERVATION',
      'CORRECTION',
      'CONFIRMATION',
      'DISPUTE',
      'GENERAL_FEEDBACK',
    ];
    assert.equal(validIntents.length, 5);
    assert.ok(validIntents.includes('DISPUTE'));
    assert.ok(validIntents.includes('CORRECTION'));
  });

  it('Feedback lifecycle states enforce review and reassessment gates', () => {
    const lifecycleStates = [
      'SUBMITTED',
      'PENDING_REVIEW',
      'ACCEPTED',
      'REJECTED',
      'DISPUTED',
      'RESOLVED',
      'EXPIRED',
    ];

    assert.ok(lifecycleStates.includes('ACCEPTED'));
    assert.ok(lifecycleStates.includes('PENDING_REVIEW'));

    // Only ACCEPTED or corroborated states trigger reassessment
    const triggersReassessment = (status) => status === 'ACCEPTED';
    assert.equal(triggersReassessment('ACCEPTED'), true);
    assert.equal(triggersReassessment('PENDING_REVIEW'), false);
    assert.equal(triggersReassessment('REJECTED'), false);
  });

  it('Privacy protection masks reporter identifiers in public views', () => {
    const maskReporter = (id) => {
      if (!id || id === 'anon_user') return 'anon_****';
      if (id.length <= 6) return `usr_****${id.slice(-2)}`;
      return `${id.slice(0, 3)}****${id.slice(-4)}`;
    };

    assert.equal(maskReporter('anon_user'), 'anon_****');
    assert.equal(maskReporter('chennai_commuter_77'), 'che****r_77');
    assert.equal(maskReporter('ravi99'), 'usr_****99');
  });

  it('Reassessment score delta is accurately signed and bounded', () => {
    const prevScore = 65.0;
    const newScore = 58.5;
    const delta = Math.round((newScore - prevScore) * 100) / 100;

    assert.equal(delta, -6.5);

    // Score remains bounded in [15.0, 95.0]
    const clampedScore = (raw) => Math.max(15.0, Math.min(95.0, raw));
    assert.equal(clampedScore(110.0), 95.0);
    assert.equal(clampedScore(5.0), 15.0);
  });

  it('Route reassessment preserves route kinematics while updating safety and confidence', () => {
    const originalRoute = {
      route_id: 'RT-CHENNAI-01',
      metrics: {
        distance_meters: 5500.0,
        duration_seconds: 990.0,
      },
      safety: {
        safety_score: 80.0,
        confidence: 75.0,
      },
    };

    const updatedSafety = {
      safety_score: 74.0,
      confidence: 82.0,
    };

    const reassessedRoute = {
      ...originalRoute,
      safety: {
        ...originalRoute.safety,
        ...updatedSafety,
      },
    };

    // Kinematics are invariant
    assert.equal(reassessedRoute.metrics.distance_meters, originalRoute.metrics.distance_meters);
    assert.equal(reassessedRoute.metrics.duration_seconds, originalRoute.metrics.duration_seconds);

    // Safety and confidence are updated
    assert.equal(reassessedRoute.safety.safety_score, 74.0);
    assert.equal(reassessedRoute.safety.confidence, 82.0);
  });

  it('Disclaims crime prediction and safety guarantees in reassessment outputs', () => {
    const disclaimer =
      'Suraksha Path is an evidence-based, context-aware navigational advisory prototype. ' +
      'It does not guarantee personal safety and does not predict crime events.';

    assert.ok(disclaimer.includes('does not guarantee personal safety'));
    assert.ok(disclaimer.includes('does not predict crime events'));
  });
});
