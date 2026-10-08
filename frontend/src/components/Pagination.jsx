export default function Pagination({ page, limit, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total === 0) return null;
  return (
    <nav className="pagination" aria-label="Paginación">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        Anterior
      </button>
      <span>
        Página {page} de {pages} · {total} en total
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
      >
        Siguiente
      </button>
    </nav>
  );
}
