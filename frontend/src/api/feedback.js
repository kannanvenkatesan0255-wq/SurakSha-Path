/**
 * Feedback & Reassessment API client methods (Phase 12).
 * Supports structured feedback submission, moderator review,
 * controlled segment reassessment, route refreshing, and audit logs.
 */

import { apiClient } from './client.js';

/**
 * Retrieves the catalog of supported feedback categories and operational rules.
 * @returns {Promise<Array>} List of feedback types with descriptions and flags.
 */
export async function fetchFeedbackTypes() {
  return await apiClient.get('/feedback/types');
}

/**
 * Submits structured user feedback regarding a segment, route, community report, or app.
 * @param {Object} data FeedbackCreate payload.
 * @returns {Promise<Object>} FeedbackSubmissionResult.
 */
export async function submitFeedback(data) {
  return await apiClient.post('/feedback/submit', data);
}

/**
 * Queries user feedback records with optional filtering.
 * @param {Object} params Filter parameters (feedback_type, status, segment_code, limit, offset).
 * @returns {Promise<Array>} List of FeedbackResponse records.
 */
export async function fetchFeedbackList(params = {}) {
  const query = new URLSearchParams();
  if (params.feedback_type) query.append('feedback_type', params.feedback_type);
  if (params.status) query.append('status', params.status);
  if (params.segment_code) query.append('segment_code', params.segment_code);
  if (params.target_type) query.append('target_type', params.target_type);
  if (params.limit) query.append('limit', params.limit);
  if (params.offset) query.append('offset', params.offset);

  const qs = query.toString();
  return await apiClient.get(`/feedback${qs ? `?${qs}` : ''}`);
}

/**
 * Fetches a single feedback record by ID.
 * @param {string} feedbackId
 * @returns {Promise<Object>} FeedbackResponse
 */
export async function fetchFeedbackById(feedbackId) {
  return await apiClient.get(`/feedback/${encodeURIComponent(feedbackId)}`);
}

/**
 * Submits an administrative or moderator review action on a feedback record.
 * @param {string} feedbackId
 * @param {Object} reviewData { target_status, moderator_id, moderator_key, review_notes }
 * @returns {Promise<Object>} Updated FeedbackResponse
 */
export async function reviewFeedback(feedbackId, reviewData) {
  return await apiClient.post(`/feedback/${encodeURIComponent(feedbackId)}/review`, reviewData);
}

/**
 * Manually triggers a controlled safety reassessment for a road segment.
 * @param {string} segmentCode
 * @param {string} [departureTime]
 * @returns {Promise<Object>} SegmentReassessmentResult
 */
export async function reassessSegment(segmentCode, departureTime = null) {
  const query = departureTime ? `?departure_time=${encodeURIComponent(departureTime)}` : '';
  return await apiClient.post(`/feedback/reassess-segment/${encodeURIComponent(segmentCode)}${query}`);
}

/**
 * Refreshes an entire route alternative with latest segment assessments without altering geometry.
 * @param {Object} route RouteAlternative object.
 * @param {string} [departureTime]
 * @returns {Promise<Object>} RouteReassessmentResponse with before/after scores and delta.
 */
export async function reassessRoute(route, departureTime = null) {
  return await apiClient.post('/feedback/reassess-route', {
    route,
    departure_time: departureTime,
  });
}

/**
 * Retrieves historical audit logs of safety score and confidence reassessments.
 * @param {Object} params Filter parameters (segment_code, route_id, trigger_type, limit, offset).
 * @returns {Promise<Array>} List of ReassessmentAuditLogItem.
 */
export async function fetchReassessmentAuditLog(params = {}) {
  const query = new URLSearchParams();
  if (params.segment_code) query.append('segment_code', params.segment_code);
  if (params.route_id) query.append('route_id', params.route_id);
  if (params.trigger_type) query.append('trigger_type', params.trigger_type);
  if (params.limit) query.append('limit', params.limit);
  if (params.offset) query.append('offset', params.offset);

  const qs = query.toString();
  return await apiClient.get(`/feedback-audit-log${qs ? `?${qs}` : ''}`);
}

/**
 * Retrieves complete reassessment history and active feedback for a road segment.
 * @param {string} segmentCode
 * @returns {Promise<Object>} Segment history including audit logs and feedback.
 */
export async function fetchSegmentReassessmentHistory(segmentCode) {
  return await apiClient.get(`/feedback/segment/${encodeURIComponent(segmentCode)}/history`);
}

/**
 * Legacy post-journey feedback submission.
 * @param {Object} data JourneyFeedbackCreate.
 * @returns {Promise<Object>} FeedbackReassessmentResponse.
 */
export async function submitLegacyJourneyFeedback(data) {
  return await apiClient.post('/feedback', data);
}
