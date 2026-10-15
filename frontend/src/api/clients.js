import { apiRequest } from './client.js';

export const listClients = (query) => apiRequest('/clients', { query });

export async function getClient(id) {
  const { data } = await apiRequest(`/clients/${id}`);
  return data;
}

export async function createClient(datos) {
  const { data } = await apiRequest('/clients', { method: 'POST', body: datos });
  return data;
}

export async function updateClient(id, datos) {
  const { data } = await apiRequest(`/clients/${id}`, { method: 'PATCH', body: datos });
  return data;
}

export async function changeClientStatus(id, estado) {
  const { data } = await apiRequest(`/clients/${id}/status`, { method: 'PATCH', body: { estado } });
  return data;
}

export async function getMyProfile() {
  const { data } = await apiRequest('/clients/me');
  return data;
}
