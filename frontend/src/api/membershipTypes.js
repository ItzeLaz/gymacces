import { apiRequest } from './client.js';

export const listMembershipTypes = (query) => apiRequest('/membership-types', { query });

export async function createMembershipType(datos) {
  const { data } = await apiRequest('/membership-types', { method: 'POST', body: datos });
  return data;
}

export async function updateMembershipType(id, datos) {
  const { data } = await apiRequest(`/membership-types/${id}`, { method: 'PATCH', body: datos });
  return data;
}

export async function changeMembershipTypeStatus(id, estado) {
  const { data } = await apiRequest(`/membership-types/${id}/status`, { method: 'PATCH', body: { estado } });
  return data;
}
