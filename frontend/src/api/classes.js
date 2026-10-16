import { apiRequest } from './client.js';

// Clases grupales (specs/004-reservas-clases/contracts/api.md)
export async function listClasses(estado) {
  const { data } = await apiRequest('/classes', { query: { estado } });
  return data;
}

export async function listInstructors() {
  const { data } = await apiRequest('/classes/instructors');
  return data;
}

// Devuelve { data, message } para mostrar "Clase registrada." (US1, criterio 1)
export async function createClass(datos) {
  return apiRequest('/classes', { method: 'POST', body: datos });
}

export async function updateClass(id, datos) {
  const { data } = await apiRequest(`/classes/${id}`, { method: 'PATCH', body: datos });
  return data;
}

export async function deactivateClass(id) {
  const { data } = await apiRequest(`/classes/${id}/status`, { method: 'PATCH', body: { estado: 'inactiva' } });
  return data;
}
