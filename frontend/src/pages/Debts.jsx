import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDebts } from '../api/payments.js';
import Message from '../components/Message.jsx';
import Money from '../components/Money.jsx';
import Pagination from '../components/Pagination.jsx';

const LIMIT = 20;

// Clientes con adeudo, de mayor a menor: solo administrador (FR-021)
export default function Debts() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [debtors, setDebtors] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_adeudo: '0.00' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Espera a que el usuario deje de escribir antes de buscar
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await listDebts({ search: query, page, limit: LIMIT });
      setDebtors(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section>
      <div className="page-title">
        <h1>Adeudos</h1>
        <p>
          Total adeudado: <Money value={meta.total_adeudo} />
        </p>
        <Link to="/payments" className="btn btn-secondary">
          Volver a pagos
        </Link>
      </div>
      <Message type="error">{error}</Message>

      <div className="filters">
        <div className="field">
          <label htmlFor="debt-search">Buscar cliente</label>
          <input
            id="debt-search"
            type="search"
            placeholder="Nombre o apellido"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Cargando adeudos…</p>
      ) : debtors.length === 0 ? (
        <p role="status">No hay clientes con adeudo.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Cliente</th>
              <th scope="col">Adeudo</th>
              <th scope="col">Detalle por membresía</th>
            </tr>
          </thead>
          <tbody>
            {debtors.map((deudor) => (
              <tr key={deudor.id_cliente}>
                <td>
                  <Link to={`/clients/${deudor.id_cliente}`}>
                    {deudor.nombre} {deudor.apellido}
                  </Link>
                </td>
                <td>
                  <Money value={deudor.adeudo} />
                </td>
                <td>
                  <ul className="plain-list">
                    {deudor.membresias.map((membresia) => (
                      <li key={membresia.id_membresia}>
                        {membresia.tipo}: <Money value={membresia.saldo} />
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination page={page} limit={LIMIT} total={meta.total} onChange={setPage} />
    </section>
  );
}
