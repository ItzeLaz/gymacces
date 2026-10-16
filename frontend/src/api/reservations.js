import { apiRequest } from './client.js';

// Reservas de clases grupales (specs/004-reservas-clases/contracts/api.md)
export async function createReservation(datos) {
  const { data } = await apiRequest('/reservations', { method: 'POST', body: datos });
  return data;
}

// Cancela una reserva antes de que empiece la clase (US3)
export async function cancelReservation(id) {
  const { data } = await apiRequest(`/reservations/${id}/cancel`, { method: 'PATCH' });
  return data;
}

// Marca (true) o desmarca (false) la asistencia el día de la clase (US5)
export async function setAttendance(id, presente) {
  const { data } = await apiRequest(`/reservations/${id}/attendance`, { method: 'PATCH', body: { presente } });
  return data;
}
