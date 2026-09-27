/**
 * Community Intelligence & Reporting API client for Suraksha Path (Phase 9).
 * Connects frontend to the trust-weighted community reporting engine.
 */

import { apiClient } from './client.js';

/**
 * Fetch the controlled list of observation categories and their decay parameters.
 */
export async function fetchCommunityCategories() {
  return await apiClient.get('/community/categories');
}

/**
 * Fetch paginated community reports with optional filtering.
 */
export async function fetchCommunityReports({
  category = '',
  status = '',
  segmentCode = '',
  isActive = null,
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (status) params.append('status', status);
  if (segmentCode) params.append('segment_code', segmentCode);
  if (isActive !== null && isActive !== undefined) params.append('is_active', isActive);
  params.append('limit', limit);
  params.append('offset', offset);

  return await apiClient.get(`/community/reports?${params.toString()}`);
}

/**
 * Fetch detail and explainability factors for a single report.
 */
export async function fetchCommunityReportDetail(reportId) {
  return await apiClient.get(`/community/reports/${encodeURIComponent(reportId)}`);
}

/**
 * Submit a new location-based community observation.
 */
export async function submitCommunityReport(reportData, userId = null) {
  const headers = {};
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  return await apiClient.post('/community/reports', reportData, { headers });
}

/**
 * Independently corroborate an existing community report.
 */
export async function confirmCommunityReport(reportId, userId, comments = null) {
  const headers = {};
  if (userId) headers['X-User-Id'] = userId;
  return await apiClient.post(
    `/community/reports/${encodeURIComponent(reportId)}/confirm`,
    comments ? { comments } : {},
    { headers }
  );
}

/**
 * Dispute an existing community report (indicate outdated or inaccurate).
 */
export async function disputeCommunityReport(reportId, userId, comments = null) {
  const headers = {};
  if (userId) headers['X-User-Id'] = userId;
  return await apiClient.post(
    `/community/reports/${encodeURIComponent(reportId)}/dispute`,
    { interaction_type: 'DISPUTE', comments },
    { headers }
  );
}

/**
 * Flag an existing community report for moderator inspection.
 */
export async function flagCommunityReport(reportId, userId, comments = null) {
  const headers = {};
  if (userId) headers['X-User-Id'] = userId;
  return await apiClient.post(
    `/community/reports/${encodeURIComponent(reportId)}/flag`,
    { interaction_type: 'FLAG', comments },
    { headers }
  );
}

/**
 * Perform administrative moderation action on a report.
 */
export async function moderateCommunityReport(reportId, targetStatus, adminKey, notes = null) {
  const headers = {};
  if (adminKey) headers['X-Admin-Key'] = adminKey;
  return await apiClient.post(
    `/community/reports/${encodeURIComponent(reportId)}/moderate`,
    { status: targetStatus, notes },
    { headers }
  );
}
