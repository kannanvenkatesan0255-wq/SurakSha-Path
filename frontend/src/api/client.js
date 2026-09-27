/**
 * Centralized API Client for Suraksha Path.
 * Handles timeouts, network errors, non-2xx responses, and response parsing.
 */

import { APP_CONFIG } from '../config/appConfig.js';

class ApiClient {
  constructor(baseUrl = APP_CONFIG.API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    // Timeout mechanism (default 10s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 10000);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      // Handle non-2xx responses
      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText || 'Unknown server error' };
        }

        const error = new Error(
          (errorData && (errorData.detail || errorData.message)) ||
          `Request failed with status ${response.status}`
        );
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // Parse JSON response
      try {
        return await response.json();
      } catch (parseError) {
        throw new Error(`Malformed JSON response received from ${url}: ${parseError.message}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        const timeoutError = new Error(`Request to ${url} timed out after ${options.timeoutMs || 10000}ms`);
        timeoutError.isTimeout = true;
        throw timeoutError;
      }

      // If already has status, rethrow
      if (err.status) {
        throw err;
      }

      // Network unreachable or CORS failure
      const networkError = new Error(
        `Unable to connect to Suraksha Path backend at ${this.baseUrl}. Please verify the backend server is running.`
      );
      networkError.isNetworkError = true;
      networkError.originalError = err;
      throw networkError;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

export const apiClient = new ApiClient();
