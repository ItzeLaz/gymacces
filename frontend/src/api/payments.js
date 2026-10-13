import { apiRequest } from './client.js';

export async function registerPayment(datos) {
  const { data } = await apiRequest('/payments', { method: 'POST', body: datos });
  return data;
}

export async function cancelPayment(idPago, motivo) {
  const { data } = await apiRequest(`/payments/${idPago}/cancel`, { method: 'PATCH', body: { motivo } });
  return data;
}

export async function getClientPayments(idCliente) {
  const { data } = await apiRequest(`/clients/${idCliente}/payments`);
  return data;
}

export const listPayments = (query) => apiRequest('/payments', { query });

export const listDebts = (query) => apiRequest('/debts', { query });
