import { apiRequest } from './client.js';

export async function registerAccessAttempt(descriptor) {
  const { data } = await apiRequest('/access/attempts', { method: 'POST', body: { descriptor } });
  return data;
}

export const listAccesses = (query) => apiRequest('/access', { query });

export const listOwnAccesses = (query) => apiRequest('/clients/me/access', { query });
