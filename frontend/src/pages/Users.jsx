import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { changeUserStatus, listUsers } from '../api/users.js';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Message from '../components/Message.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { roleLabel } from '../components/Layout.jsx';

const LIMIT = 20;

export default function Users() {
  const { user: currentUser } = useAuth();
  const [filters, setFilters] = useState({ search: '', rol: '', estado: '' });
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await listUsers({ ...filters, page, limit: LIMIT });
      setUsers(data);
      setTotal(meta.total);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = (name) => (event) => {
    setFilters((current) => ({ ...current, [name]: event.target.value }));
    setPage(1);
  };

  const confirmStatus = async () => {
    const nextEstado = pending.estado === 'activo' ? 'inactivo' : 'activo';
    setBusy(true);
    try {
      await changeUserStatus(pending.id_usuario, nextEstado);
      setMessage({
        type: 'success',
        text: `Usuario ${nextEstado === 'activo' ? 'activado' : 'desactivado'} correctamente.`,
      });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <section>
      <div className="page-title">
        <h1>Usuarios</h1>
        <Link to="/users/new" className="btn">
          Nuevo usuario
        </Link>
      </div>

      <Message type={message.type}>{message.text}</Message>

      <div className="filters">
        <div className="field">
          <label htmlFor="search">Buscar</label>
          <input
            id="search"
            type="search"
            placeholder="Nombre o correo"
            value={filters.search}
            onChange={updateFilter('search')}
          />
        </div>
        <div className="field">
          <label htmlFor="rol">Rol</label>
          <select id="rol" value={filters.rol} onChange={updateFilter('rol')}>
            <option value="">Todos</option>
            <option value="administrador">Administrador</option>
            <option value="recepcionista">Recepcionista</option>
            <option value="entrenador">Entrenador</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="estado">Estado</label>
          <select id="estado" value={filters.estado} onChange={updateFilter('estado')}>
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando usuarios…</p>
      ) : users.length === 0 ? (
        <p>No se encontraron usuarios.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Correo</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id_usuario}>
                <td>{user.nombre}</td>
                <td>{user.correo}</td>
                <td>{roleLabel(user.rol)}</td>
                <td>
                  <StatusBadge estado={user.estado} />
                </td>
                <td className="actions">
                  <Link to={`/users/${user.id_usuario}`} className="btn btn-secondary">
                    Editar
                  </Link>
                  {user.id_usuario !== currentUser.id_usuario && (
                    <button
                      type="button"
                      className={user.estado === 'activo' ? 'btn btn-danger' : 'btn'}
                      onClick={() => setPending(user)}
                    >
                      {user.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.estado === 'activo' ? 'Desactivar usuario' : 'Activar usuario'}
        message={
          pending?.estado === 'activo'
            ? `${pending?.nombre} ya no podrá iniciar sesión. ¿Deseas continuar?`
            : `${pending?.nombre} podrá volver a iniciar sesión. ¿Deseas continuar?`
        }
        onConfirm={confirmStatus}
        onCancel={() => setPending(null)}
        busy={busy}
      />
    </section>
  );
}
