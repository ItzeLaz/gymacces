import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPayments } from '../api/payments.js';
import Message from '../components/Message.jsx';
import Money from '../components/Money.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { METHOD_LABELS } from '../components/PaymentsSection.jsx';
import { formatDateTime } from '../utils/dates.js';

const LIMIT = 20;
const EMPTY_FILTERS = { desde: '', hasta: '', metodo_pago: '', estado: '' };

// Historial general de pagos: solo administrador (FR-020)
export default function Payments() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pagado: '0.00' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await listPayments({ ...filters, page, limit: LIMIT });
      setPayments(response.data);
      setMeta(response.meta);
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
        <h1>Pagos</h1>
        <p>
          Total pagado en el filtro: <Money value={meta.total_pagado} />
        </p>
      </div>
      <Message type="error">{error}</Message>

      <div className="filters">
        <div className="field">
          <label htmlFor="pay-desde">Desde</label>
          <input id="pay-desde" type="date" value={filters.desde} onChange={update('desde')} />
        </div>
        <div className="field">
          <label htmlFor="pay-hasta">Hasta</label>
          <input id="pay-hasta" type="date" value={filters.hasta} onChange={update('hasta')} />
        </div>
        <div className="field">
          <label htmlFor="pay-metodo">Método</label>
          <select id="pay-metodo" value={filters.metodo_pago} onChange={update('metodo_pago')}>
            <option value="">Todos</option>
            {Object.entries(METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pay-estado">Estado</label>
          <select id="pay-estado" value={filters.estado} onChange={update('estado')}>
            <option value="">Todos</option>
            <option value="pagado">Pagado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando pagos…</p>
      ) : payments.length === 0 ? (
        <p role="status">No hay pagos con esos filtros.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Cliente</th>
              <th scope="col">Monto</th>
              <th scope="col">Método</th>
              <th scope="col">Estado</th>
              <th scope="col">Registró</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((pago) => (
              <tr key={pago.id_pago}>
                <td>{formatDateTime(pago.fecha_pago)}</td>
                <td>
                  <Link to={`/clients/${pago.id_cliente}`}>
                    {pago.cliente.nombre} {pago.cliente.apellido}
                  </Link>
                </td>
                <td>
                  <Money value={pago.monto} />
                </td>
                <td>{METHOD_LABELS[pago.metodo_pago] ?? pago.metodo_pago}</td>
                <td>
                  <StatusBadge estado={pago.estado} />
                </td>
                <td>{pago.registrado_por?.nombre ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination page={page} limit={LIMIT} total={meta.total} onChange={setPage} />
    </section>
  );
}
