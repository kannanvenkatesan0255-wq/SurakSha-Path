/**
 * Application Configuration for Suraksha Path Frontend.
 * Reads environment variables with safe defaults.
 */

export const APP_CONFIG = {
  APP_NAME: 'Suraksha Path',
  TAGLINE: 'Evidence-Based, Context-Aware Safe Route Navigation',
  CITY: 'Chennai, India',
  API_BASE_URL: (() => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '/api';
    }
    return 'http://127.0.0.1:8000/api';
  })(),
  MAP_DEFAULT_CENTER: [13.0827, 80.2707], // Chennai Central
  MAP_DEFAULT_ZOOM: 12,
  DISCLAIMER: 'Suraksha Path is an evidence-based contextual advisory prototype. It does not guarantee personal safety and does not predict crime.',
};
