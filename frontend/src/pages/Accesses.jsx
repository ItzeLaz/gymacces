import { useCallback, useEffect, useState } from 'react';
import { listAccesses } from '../api/access.js';
import { useAuth } from '../context/AuthContext.jsx';
import Message from '../components/Message.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDateTime, todayIso } from '../utils/dates.js';

const LIMIT = 20;

// Textos de los motivos de rechazo (contracts/api.md)
export const REASON_LABELS = {
  rostro_no_identificado: 'Rostro no identificado',
  cliente_inactivo: 'Cliente inactivo',
  sin_membresia_vigente: 'Sin membresía vigente',
  membresia_vencida: 'Membresía vencida',
  membresia_suspendida: 'Membresía suspendida',
  membresia_cancelada: 'Membresía cancelada',
};

export default function Accesses() {
  const { user } = useAuth();
  const isAdmin = user.rol === 'administrador';
  const [filters, setFilters] = useState({ desde: todayIso(), hasta: todayIso(), resultado: '', motivo: '' });
  const [page, setPage] = useState(1);
  const [accesses, setAccesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, meta } = await listAccesses({ ...filters, page, limit: LIMIT });
      setAccesses(data);
      setTotal(meta.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (name) => (event) => {
    setFilters((current) => ({ ...current, [name]: event.target.value }));
    setPage(1);
  };

  return (
    <section>
      <div className="page-title">
        <h1>Accesos</h1>
      </div>
      <Message type="error">{error}</Message>

      <div className="filters">
        <div className="field">
          <label htmlFor="acc-desde">Desde</label>
          <input id="acc-desde" type="date" value={filters.desde} onChange={update('desde')} />
        </div>
        <div className="field">
          <label htmlFor="acc-hasta">Hasta</label>
          <input id="acc-hasta" type="date" value={filters.hasta} onChange={update('hasta')} />
        </div>
        <div className="field">
          <label htmlFor="acc-resultado">Resultado</label>
          <select id="acc-resultado" value={filters.resultado} onChange={update('resultado')}>
            <option value="">Todos</option>
            <option value="autorizado">Autorizados</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="acc-motivo">Motivo</label>
          <select id="acc-motivo" value={filters.motivo} onChange={update('motivo')}>
            <option value="">Todos</option>
            {Object.entries(REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando accesos…</p>
      ) : accesses.length === 0 ? (
        <p role="status">No hay accesos con esos filtros.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Fecha y hora</th>
              <th scope="col">Cliente</th>
              <th scope="col">Resultado</th>
              <th scope="col">Motivo</th>
              <th scope="col">Estación</th>
              {isAdmin && <th scope="col">Similitud</th>}
            </tr>
          </thead>
          <tbody>
            {accesses.map((acceso) => (
              <tr key={acceso.id_acceso}>
                <td>{formatDateTime(acceso.fecha_hora)}</td>
                <td>{acceso.cliente ? `${acceso.cliente.nombre} ${acceso.cliente.apellido}` : 'No identificado'}</td>
                <td>
                  <StatusBadge estado={acceso.resultado} />
                </td>
                <td>{acceso.motivo ? REASON_LABELS[acceso.motivo] : '—'}</td>
                <td>{acceso.registrado_por.nombre}</td>
                {isAdmin && <td>{acceso.similitud ?? '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
    </section>
  );
}
