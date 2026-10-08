const LABELS = { activo: 'Activo', inactivo: 'Inactivo' };

export default function StatusBadge({ estado }) {
  return <span className={`badge badge-${estado}`}>{LABELS[estado] ?? estado}</span>;
}
