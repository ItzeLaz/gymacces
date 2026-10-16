import { addDays, daysBetween } from './dates.js';

// Funciones puras de las sesiones de clases grupales; no acceden a la base de datos.
// Una sesión es una clase semanal en una fecha concreta (research R-01).

const MINUTES_PER_DAY = 24 * 60;

// Días de la ventana de reserva después de hoy: de hoy a hoy + 7, ambos incluidos (FR-006)
export const BOOKING_WINDOW_DAYS = 7;

// Convierte 'HH:MM' o 'HH:MM:SS' (TIME de MySQL) en minutos desde la medianoche
export function toMinutes(hhmm) {
  const [hours, minutes] = String(hhmm).split(':').map(Number);
  return hours * 60 + minutes;
}

// Convierte minutos desde la medianoche en 'HH:MM'; 1440 se muestra como '24:00'
export function toHHMM(minutos) {
  const hours = String(Math.floor(minutos / 60)).padStart(2, '0');
  const minutes = String(minutos % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Intervalos semiabiertos [inicio, fin): una clase que termina a las 08:00 no se empalma con otra que
// empieza a las 08:00 (research R-03)
export function overlaps(inicioA, finA, inicioB, finB) {
  return inicioA < finB && inicioB < finA;
}

// La clase debe terminar el mismo día en que empieza (US1, criterio 14; research R-06)
export function endsSameDay(inicioMin, duracion) {
  return inicioMin + duracion <= MINUTES_PER_DAY;
}

// Día de la semana ISO 8601 de una fecha AAAA-MM-DD: 1 = lunes ... 7 = domingo
export function isoWeekday(fecha) {
  const [year, month, day] = fecha.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

// Fechas entre desde y hasta (ambas incluidas) que caen en el día de la semana de la clase
export function sessionDates(diaSemana, desde, hasta) {
  const fechas = [];
  const offset = (diaSemana - isoWeekday(desde) + 7) % 7;
  for (let fecha = addDays(desde, offset); fecha <= hasta; fecha = addDays(fecha, 7)) {
    fechas.push(fecha);
  }
  return fechas;
}

// Ventana de reserva y del horario: de hoy a hoy + 7 días (research R-05)
export function bookingWindow(hoy) {
  return { desde: hoy, hasta: addDays(hoy, BOOKING_WINDOW_DAYS) };
}

export function isInBookingWindow(fecha, hoy) {
  const dias = daysBetween(hoy, fecha);
  return dias >= 0 && dias <= BOOKING_WINDOW_DAYS;
}

// Estado de una sesión según la fecha y los minutos actuales del gimnasio (nowInGym)
export function sessionState(fechaSesion, inicioMin, finMin, ahora) {
  if (fechaSesion > ahora.fecha) return 'pendiente';
  if (fechaSesion < ahora.fecha) return 'terminada';
  if (ahora.minutos < inicioMin) return 'pendiente';
  if (ahora.minutos < finMin) return 'en_curso';
  return 'terminada';
}
