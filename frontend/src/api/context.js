import { apiClient } from './client.js';

/**
 * Fetches real-time solar illumination and environmental weather conditions for Chennai (Asia/Kolkata).
 * @returns {Promise<Object>} CurrentContextResponse
 */
export async function fetchCurrentContext() {
  return await apiClient.get('/context/current');
}

/**
 * Evaluates contextual factors (solar phase, weather telemetry, segment modifiers) for a target departure.
 * @param {Object} params
 * @param {string} [params.journeyDate] - YYYY-MM-DD
 * @param {string} [params.departureTime] - HH:MM
 * @param {string[]} [params.segmentCodes] - Optional segment codes to evaluate
 * @returns {Promise<Object>} ContextEvaluateResponse
 */
export async function evaluateJourneyContext({ journeyDate, departureTime, segmentCodes = [] } = {}) {
  return await apiClient.post('/context/evaluate', {
    journey_date: journeyDate,
    departure_time: departureTime,
    segment_codes: segmentCodes,
  });
}

/**
 * Reassesses an existing route alternative with new journey time and environmental conditions.
 * Preserves route kinematics (distance, geometry, duration) while updating safety score and confidence.
 * @param {Object} params
 * @param {Object} params.route - Existing RouteAlternative object
 * @param {string} [params.journeyDate] - New YYYY-MM-DD
 * @param {string} [params.departureTime] - New HH:MM
 * @returns {Promise<Object>} Reassessment result containing updated route and contextual report
 */
export async function reassessRouteContext({ route, journeyDate, departureTime }) {
  return await apiClient.post('/context/reassess-route', {
    route,
    journey_date: journeyDate,
    departure_time: departureTime,
  });
}
