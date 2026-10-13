import { apiRequest } from './client.js';

export async function getDashboard(query) {
  const { data } = await apiRequest('/dashboard', { query });
  return data;
}
