/**
 * Routing API service client for Suraksha Path.
 */

import { apiClient } from './client';
import { resolveLocationQuery } from '../services/locationService';

/**
 * Submits a journey route-planning request to the backend API.
 * Adheres strictly to the Phase 4 schema contract.
 */
export async function submitRoutePlan({
  originName,
  destinationName,
  journeyDate,
  departureTime,
  routePreference = 'BALANCED',
  safetyWeightPreference = 0.5,
  avoidUnlitAreas = true,
}) {
  // Resolve locations through the location service
  const resolvedOrigin = resolveLocationQuery(originName);
  const resolvedDestination = resolveLocationQuery(destinationName);

  const payload = {
    origin: {
      name: resolvedOrigin.name,
      address: resolvedOrigin.address,
      lat: resolvedOrigin.lat,
      lng: resolvedOrigin.lng,
      is_resolved: resolvedOrigin.isResolved,
      resolution_source: resolvedOrigin.source,
    },
    destination: {
      name: resolvedDestination.name,
      address: resolvedDestination.address,
      lat: resolvedDestination.lat,
      lng: resolvedDestination.lng,
      is_resolved: resolvedDestination.isResolved,
      resolution_source: resolvedDestination.source,
    },
    journey_date: journeyDate || undefined,
    departure_time: departureTime || undefined,
    route_preference: routePreference,
    safety_weight_preference: Number(safetyWeightPreference),
    avoid_unlit_areas: Boolean(avoidUnlitAreas),
  };

  return await apiClient.post('/routes/plan', payload);
}
