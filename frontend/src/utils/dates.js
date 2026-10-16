// Fechas AAAA-MM-DD tratadas como días de calendario, sin desfases por zona horaria

function toLocalDate(fecha) {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso() {
  return toIso(new Date());
}

export function addDays(fecha, dias) {
  const date = toLocalDate(fecha);
  date.setDate(date.getDate() + dias);
  return toIso(date);
}

// La vigencia incluye el día de inicio y el de fin
export function endDateFor(fechaInicio, duracionDias) {
  return addDays(fechaInicio, Number(duracionDias) - 1);
}

// "2030-01-30" → "30 de enero de 2030"
export function formatDay(fecha) {
  if (!fecha) return '—';
  return toLocalDate(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Fecha y hora ISO → "12/10/2026, 16:05"
export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// "2026-10-19" → "Lunes 19 de octubre de 2026"
export function formatWeekdayDay(fecha) {
  if (!fecha) return '—';
  return `${WEEKDAYS[toLocalDate(fecha).getDay()]} ${formatDay(fecha)}`;
}
