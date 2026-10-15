import { useEffect, useState } from 'react';
import { listOwnAccesses } from '../api/access.js';
import Message from './Message.jsx';
import Pagination from './Pagination.jsx';
import StatusBadge from './StatusBadge.jsx';
import { REASON_LABELS } from '../pages/Accesses.jsx';
import { formatDateTime } from '../utils/dates.js';

const LIMIT = 10;

// Historial de accesos propio del cliente (FR-040)
export default function OwnAccesses() {
  const [page, setPage] = useState(1);
  const [accesses, setAccesses] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    listOwnAccesses({ page, limit: LIMIT })
      .then(({ data, meta }) => {
        setAccesses(data);
        setTotal(meta.total);
      })
      .catch((err) => setError(err.message));
  }, [page]);

  return (
    <section aria-labelledby="own-access-title">
      <h2 id="own-access-title">Mis accesos</h2>
      <Message type="error">{error}</Message>
      {!accesses ? (
        !error && <p>Cargando accesos…</p>
      ) : accesses.length === 0 ? (
        <p>Todavía no tienes accesos registrados.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Fecha y hora</th>
              <th scope="col">Resultado</th>
              <th scope="col">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {accesses.map((acceso) => (
              <tr key={acceso.id_acceso}>
                <td>{formatDateTime(acceso.fecha_hora)}</td>
                <td>
                  <StatusBadge estado={acceso.resultado} />
                </td>
                <td>{acceso.motivo ? REASON_LABELS[acceso.motivo] : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
    </section>
  );
}
