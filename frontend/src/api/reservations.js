import { apiRequest } from './client.js';

// Reservas de clases grupales (specs/004-reservas-clases/contracts/api.md)
export async function createReservation(datos) {
  const { data } = await apiRequest('/reservations', { method: 'POST', body: datos });
  return data;
}
