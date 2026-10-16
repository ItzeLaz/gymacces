// Etiquetas en español de los estados que se muestran en todo el sistema (FR-047)
const LABELS = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  activa: 'Activa',
  inactiva: 'Inactiva',
  vencida: 'Vencida',
  suspendida: 'Suspendida',
  cancelada: 'Cancelada',
  por_iniciar: 'Por iniciar',
  pagada: 'Pagada',
  parcial: 'Pago parcial',
  pendiente: 'Pago pendiente',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
  autorizado: 'Autorizado',
  rechazado: 'Rechazado',
};

export default function StatusBadge({ estado }) {
  return <span className={`badge badge-${estado}`}>{LABELS[estado] ?? estado}</span>;
}
