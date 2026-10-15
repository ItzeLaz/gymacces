import { env } from '../config/env.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Fecha de hoy (AAAA-MM-DD) en la zona horaria del gimnasio (research R-08)
export function today(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: env.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Suma días a una fecha AAAA-MM-DD trabajando en UTC para evitar desfases de horario
export function addDays(fecha, dias) {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + dias * DAY_MS).toISOString().slice(0, 10);
}

// La vigencia incluye el día de inicio y el de fin: 30 días desde el 1 terminan el 30
export function endDateFor(fechaInicio, duracionDias) {
  return addDays(fechaInicio, duracionDias - 1);
}

// Comprueba que el texto sea una fecha de calendario real con formato AAAA-MM-DD
export function isValidDate(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Convierte un DATE de MySQL (objeto Date a medianoche local o texto) en AAAA-MM-DD
export function toDateString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Días entre dos fechas AAAA-MM-DD (fin - inicio)
export function daysBetween(inicio, fin) {
  const toUtc = (fecha) => {
    const [year, month, day] = fecha.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(fin) - toUtc(inicio)) / DAY_MS);
}
