// Indicador del dashboard: el valor siempre se muestra en texto (FR-011)
export default function StatCard({ title, value, detail }) {
  return (
    <div className="stat-card">
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value}</p>
      {detail && <p className="stat-detail">{detail}</p>}
    </div>
  );
}
