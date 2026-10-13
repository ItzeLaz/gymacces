import { apiRequest } from './client.js';

export async function getFaceStatus(idCliente) {
  const { data } = await apiRequest(`/clients/${idCliente}/face`);
  return data;
}

export async function registerFace(idCliente, datos) {
  const { data } = await apiRequest(`/clients/${idCliente}/face`, { method: 'PUT', body: datos });
  return data;
}

export async function deactivateFace(idCliente) {
  const { data } = await apiRequest(`/clients/${idCliente}/face/status`, {
    method: 'PATCH',
    body: { estado: 'inactivo' },
  });
  return data;
}
