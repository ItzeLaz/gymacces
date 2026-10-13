const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// Muestra un monto recibido como texto ("1234.50") con formato de moneda
export function formatMoney(value) {
  return formatter.format(Number(value ?? 0));
}

export default function Money({ value }) {
  return <span className="money">{formatMoney(value)}</span>;
}
