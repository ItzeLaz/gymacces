import { apiRequest } from './client.js';

export async function getClientMemberships(idCliente) {
  const { data } = await apiRequest(`/clients/${idCliente}/memberships`);
  return data;
}

export async function assignMembership(idCliente, datos) {
  const { data } = await apiRequest(`/clients/${idCliente}/memberships`, { method: 'POST', body: datos });
  return data;
}

export async function renewMembership(idCliente, datos) {
  const { data } = await apiRequest(`/clients/${idCliente}/memberships/renew`, { method: 'POST', body: datos });
  return data;
}

export async function changeMembershipStatus(idMembresia, estado, motivo) {
  const { data } = await apiRequest(`/memberships/${idMembresia}/status`, {
    method: 'PATCH',
    body: { estado, motivo },
  });
  return data;
}
