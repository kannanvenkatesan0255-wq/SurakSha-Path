/**
 * API client module for Journey Lifecycle, Safety Check-In, and SOS Workflow (Phase 14).
 */

import { apiClient } from './client.js';

/**
 * Fetch verified Chennai emergency helpline directory.
 * @returns {Promise<{ city: string, helplines: Array, disclaimer: string }>}
 */
export async function fetchChennaiHelplines() {
  try {
    return await apiClient.request('/api/journey/helplines');
  } catch (err) {
    console.warn('Failed to fetch emergency helplines from backend, using fallback:', err);
    return {
      city: 'Chennai',
      helplines: [
        {
          name: 'Greater Chennai Police Control Room',
          number: '100',
          category: 'Police',
          description: 'Unified police dispatch for emergencies across Chennai Metropolitan Police jurisdiction.',
          dial_uri: 'tel:100',
          operating_hours: '24/7 Toll-Free',
        },
        {
          name: 'National Emergency Response Support System',
          number: '112',
          category: 'Police / General',
          description: 'Single emergency number for police, fire, and ambulance across Tamil Nadu.',
          dial_uri: 'tel:112',
          operating_hours: '24/7 Toll-Free',
        },
        {
          name: 'Chennai Police Women Helpline (Kavalan)',
          number: '1091',
          category: 'Women Safety',
          description: 'Dedicated helpline managed by Greater Chennai All-Women Police Stations (AWPS).',
          dial_uri: 'tel:1091',
          operating_hours: '24/7 Toll-Free',
        },
        {
          name: 'Tamil Nadu Emergency Medical & Ambulance Service',
          number: '108',
          category: 'Medical / Ambulance',
          description: 'State ambulance dispatch and emergency trauma assistance (GVK EMRI).',
          dial_uri: 'tel:108',
          operating_hours: '24/7 Toll-Free',
        },
        {
          name: 'Greater Chennai Corporation (GCC) Disaster & Flood Helpline',
          number: '1913',
          category: 'Civic / Disaster',
          description: 'Municipal flood response, subway waterlogging, tree falls, and civic hazards.',
          dial_uri: 'tel:1913',
          operating_hours: '24/7 Toll-Free',
        },
      ],
      disclaimer:
        'These numbers connect to actual Tamil Nadu emergency responders. The in-app prototype does not automatically dial or transmit location data.',
    };
  }
}

/**
 * Start a monitored journey session on the backend.
 * @param {Object} payload - JourneyStartRequest
 * @returns {Promise<Object>} JourneySessionState
 */
export async function startJourneySession(payload) {
  return await apiClient.request('/api/journey/session', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Execute a validated state transition or check-in/SOS action.
 * @param {Object} payload - { journey_id: string, action: string, details?: string }
 * @returns {Promise<Object>} JourneySessionState
 */
export async function transitionJourneySession(payload) {
  return await apiClient.request('/api/journey/transition', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieve session state by journey_id.
 * @param {string} journeyId
 * @returns {Promise<Object>} JourneySessionState
 */
export async function fetchJourneySession(journeyId) {
  return await apiClient.request(`/api/journey/session/${encodeURIComponent(journeyId)}`);
}
