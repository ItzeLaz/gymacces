import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listClients } from '../api/clients.js';
import { useAuth } from '../context/AuthContext.jsx';
import Message from '../components/Message.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const LIMIT = 20;

// Las columnas dependen de lo que envía la API: el entrenador solo recibe datos básicos
const COLUMNS = [
  { key: 'apellido', label: 'Apellido' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'correo', label: 'Correo' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'estado', label: 'Estado' },
];

export default function Clients() {
  const { user } = useAuth();
  const canWrite = user.rol === 'administrador' || user.rol === 'recepcionista';
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
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
      const { data, meta } = await listClients({ search: query, estado, page, limit: LIMIT });
      setClients(data);
      setTotal(meta.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, estado, page]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleColumns = COLUMNS.filter((column) => clients.length === 0 || column.key in clients[0]);

  return (
    <section>
      <div className="page-title">
        <h1>Clientes</h1>
        {canWrite && (
          <Link to="/clients/new" className="btn">
            Nuevo cliente
          </Link>
        )}
      </div>

      <Message type="error">{error}</Message>

      <div className="filters">
        <div className="field">
          <label htmlFor="client-search">Buscar</label>
          <input
            id="client-search"
            type="search"
            placeholder="Nombre, apellido o correo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="client-estado">Estado</label>
          <select
            id="client-estado"
            value={estado}
            onChange={(event) => {
              setEstado(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando clientes…</p>
      ) : clients.length === 0 ? (
        <p role="status">No se encontraron clientes con esa búsqueda.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id_cliente}>
                {visibleColumns.map((column) => (
                  <td key={column.key}>
                    {column.key === 'estado' ? <StatusBadge estado={client.estado} /> : client[column.key] ?? '—'}
                  </td>
                ))}
                <td>
                  <Link to={`/clients/${client.id_cliente}`} className="btn btn-secondary">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
    </section>
  );
}
