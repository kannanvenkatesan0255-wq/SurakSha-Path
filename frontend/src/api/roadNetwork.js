/**
 * Road Network API client for Suraksha Path.
 * Sourced OpenStreetMap road-network segmentation, spatial queries, and route matching.
 */

import { apiClient } from './client.js';

/**
 * Fetch paginated list of road segments with optional corridor/classification filters.
 */
export async function fetchSegments({
  corridor = '',
  classification = '',
  search = '',
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  if (corridor) params.append('corridor', corridor);
  if (classification) params.append('classification', classification);
  if (search) params.append('search', search);
  params.append('limit', limit);
  params.append('offset', offset);

  return await apiClient.get(`/segments?${params.toString()}`);
}

/**
 * Fetch a single road segment by its unique stable code.
 */
export async function fetchSegmentByCode(segmentCode) {
  return await apiClient.get(`/segments/${encodeURIComponent(segmentCode)}`);
}

/**
 * Query road segments within a geographic bounding box.
 */
export async function fetchSegmentsBbox({ min_lat, min_lng, max_lat, max_lng, limit = 100 }) {
  return await apiClient.post('/segments/bbox', {
    min_lat,
    min_lng,
    max_lat,
    max_lng,
    limit,
  });
}

/**
 * Query road segments near a coordinate point.
 */
export async function fetchSegmentsNear({ lat, lng, radius_meters = 500.0, limit = 20 }) {
  return await apiClient.post('/segments/near', {
    lat,
    lng,
    radius_meters,
    limit,
  });
}

/**
 * Associate an arbitrary route polyline with Chennai road network segments.
 */
export async function matchRouteToSegments({ coordinates, tolerance_meters = 35.0 }) {
  return await apiClient.post('/segments/match-route', {
    coordinates,
    tolerance_meters,
  });
}

/**
 * Fetch data provenance, licensing, and attribution metadata.
 */
export async function fetchProvenance() {
  return await apiClient.get('/segments/provenance');
}

// Named aliases for clean consumption
export const getRoadSegments = fetchSegments;
export const getRoadSegmentByCode = fetchSegmentByCode;
export const querySegmentsInBbox = fetchSegmentsBbox;
export const querySegmentsNearPoint = fetchSegmentsNear;
export const getRoadNetworkProvenance = fetchProvenance;
