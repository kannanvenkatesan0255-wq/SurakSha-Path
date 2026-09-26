/**
 * Health check API module.
 */

import { apiClient } from './client';

export async function fetchSystemHealth() {
  return await apiClient.get('/health');
}
