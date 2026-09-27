/**
 * Routing API service client for Suraksha Path.
 */

import { apiClient } from './client.js';
import { resolveLocationQuery } from '../services/locationService.js';

/**
 * Submits a journey route-planning request to the backend API.
 * Adheres strictly to the Phase 4 schema contract.
 */
export async function submitRoutePlan({
  originName,
  destinationName,
  originLat = null,
  originLng = null,
  destLat = null,
  destLng = null,
  journeyDate,
  departureTime,
  routePreference = 'BALANCED',
  safetyWeightPreference = 0.5,
  avoidUnlitAreas = true,
}) {
  // Resolve locations through the location service if coordinates not explicitly passed
  const resolvedOrigin = resolveLocationQuery(originName);
  const resolvedDestination = resolveLocationQuery(destinationName);

  const finalOriginLat = originLat !== null && originLat !== undefined ? originLat : resolvedOrigin.lat;
  const finalOriginLng = originLng !== null && originLng !== undefined ? originLng : resolvedOrigin.lng;
  const finalDestLat = destLat !== null && destLat !== undefined ? destLat : resolvedDestination.lat;
  const finalDestLng = destLng !== null && destLng !== undefined ? destLng : resolvedDestination.lng;

  const payload = {
    origin: {
      name: resolvedOrigin.name || originName,
      address: resolvedOrigin.address || '',
      lat: finalOriginLat,
      lng: finalOriginLng,
      is_resolved: finalOriginLat !== null,
      resolution_source: resolvedOrigin.source || 'CLIENT_INPUT',
    },
    destination: {
      name: resolvedDestination.name || destinationName,
      address: resolvedDestination.address || '',
      lat: finalDestLat,
      lng: finalDestLng,
      is_resolved: finalDestLat !== null,
      resolution_source: resolvedDestination.source || 'CLIENT_INPUT',
    },
    journey_date: journeyDate || undefined,
    departure_time: departureTime || undefined,
    route_preference: routePreference,
    safety_weight_preference: Number(safetyWeightPreference),
    avoid_unlit_areas: Boolean(avoidUnlitAreas),
  };

  return await apiClient.post('/routes/plan', payload);
}
