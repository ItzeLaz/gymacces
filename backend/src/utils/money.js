// Montos en centavos enteros: nunca se comparan números de punto flotante (research R-10)
const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

export const MAX_AMOUNT = '99999999.99';

// Indica si el valor es un monto no negativo con hasta 2 decimales
export function isValidAmount(value) {
  if (typeof value === 'number') value = String(value);
  return typeof value === 'string' && MONEY_PATTERN.test(value.trim());
}

// "450.5" → 45050
export function toCents(value) {
  const text = typeof value === 'number' ? value.toFixed(2) : String(value).trim();
  if (!isValidAmount(text)) throw new Error(`Monto inválido: ${text}`);
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

// 45050 → "450.50"
export function fromCents(cents) {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

// Normaliza un DECIMAL de MySQL (texto) al formato de la API
export function formatAmount(value) {
  return fromCents(toCents(value ?? 0));
}

export function compareAmounts(a, b) {
  return toCents(a) - toCents(b);
}
