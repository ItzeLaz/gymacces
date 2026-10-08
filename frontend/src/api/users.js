import { apiRequest } from './client.js';

export const listUsers = (query) => apiRequest('/users', { query });

export async function getUser(id) {
  const { data } = await apiRequest(`/users/${id}`);
  return data;
}

export async function createUser(datos) {
  const { data } = await apiRequest('/users', { method: 'POST', body: datos });
  return data;
}

export async function updateUser(id, datos) {
  const { data } = await apiRequest(`/users/${id}`, { method: 'PATCH', body: datos });
  return data;
}

export async function changeUserStatus(id, estado) {
  const { data } = await apiRequest(`/users/${id}/status`, { method: 'PATCH', body: { estado } });
  return data;
}
