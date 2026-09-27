/**
 * Safety & Evidence API client for Suraksha Path (Phase 8).
 * Connects frontend to the evidence-based risk assessment engine.
 */

import { apiClient } from './client.js';

/**
 * Fetch segment-level safety assessment and explainability breakdown.
 */
export async function fetchSegmentSafety(segmentCode, departureTime = null) {
  const params = new URLSearchParams();
  if (departureTime) params.append('departure_time', departureTime);
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiClient.get(`/safety/segments/${encodeURIComponent(segmentCode)}${query}`);
}

/**
 * Evaluate aggregate safety profile for a route corridor.
 */
export async function evaluateRouteSafety({ routeId, segmentCodes, departureTime = null }) {
  return await apiClient.post('/safety/routes/evaluate', {
    route_id: routeId,
    segment_codes: segmentCodes,
    departure_time: departureTime,
  });
}

/**
 * Query safety evidence records with optional category/segment filters.
 */
export async function fetchSafetyEvidence({
  segmentCode = '',
  category = '',
  sourceType = '',
  verificationStatus = '',
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (segmentCode) params.append('segment_code', segmentCode);
  if (category) params.append('category', category);
  if (sourceType) params.append('source_type', sourceType);
  if (verificationStatus) params.append('verification_status', verificationStatus);
  params.append('limit', limit);
  params.append('offset', offset);

  return await apiClient.get(`/safety/evidence?${params.toString()}`);
}

/**
 * Fetch single evidence item detail.
 */
export async function fetchEvidenceDetail(evidenceId) {
  return await apiClient.get(`/safety/evidence/${encodeURIComponent(evidenceId)}`);
}

/**
 * Fetch data provenance and licensing reports for active evidence streams.
 */
export async function fetchSafetyProvenance() {
  return await apiClient.get('/safety/provenance');
}

/**
 * Fetch risk assessment methodology details, weights, and assumptions.
 */
export async function fetchSafetyMethodology() {
  return await apiClient.get('/safety/methodology');
}

/**
 * Fetch complete explainability report and dynamic trade-off analysis for a route (Phase 11).
 */
export async function fetchRouteExplainability({ route, allAlternatives = [], departureTime = null }) {
  return await apiClient.post('/safety/routes/explain', {
    route,
    all_alternatives: allAlternatives,
    departure_time: departureTime,
  });
}

/**
 * Fetch official metric semantic definitions (Safety Score, Confidence, Evidence Coverage) (Phase 11).
 */
export async function fetchMetricSemantics() {
  return await apiClient.get('/safety/semantics');
}

