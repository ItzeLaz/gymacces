import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { changeMembershipTypeStatus, listMembershipTypes } from '../api/membershipTypes.js';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Message from '../components/Message.jsx';
import Money from '../components/Money.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const LIMIT = 20;

export default function MembershipTypes() {
  const { user } = useAuth();
  const isAdmin = user.rol === 'administrador';
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: 'success', text: location.state?.message ?? '' });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await listMembershipTypes({ page, limit: LIMIT });
      setTypes(data);
      setTotal(meta.total);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmStatus = async () => {
    setBusy(true);
    const estado = pending.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await changeMembershipTypeStatus(pending.id_tipo_membresia, estado);
      setMessage({
        type: 'success',
        text: estado === 'activo' ? 'Tipo de membresía activado.' : 'Tipo de membresía desactivado.',
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
        <h1>Membresías</h1>
        {isAdmin && (
          <Link to="/memberships/new" className="btn">
            Nuevo tipo
          </Link>
        )}
      </div>
      <p className="field-hint">
        Para asignar o renovar la membresía de una persona, abre su ficha en{' '}
        <Link to="/clients">Clientes</Link>.
      </p>

      <h2>Tipos de membresía</h2>

      <Message type={message.type}>{message.text}</Message>

      {loading ? (
        <p>Cargando tipos de membresía…</p>
      ) : types.length === 0 ? (
        <p role="status">Todavía no hay tipos de membresía registrados.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Duración</th>
              <th scope="col">Precio</th>
              <th scope="col">Estado</th>
              {isAdmin && <th scope="col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {types.map((tipo) => (
              <tr key={tipo.id_tipo_membresia}>
                <td>
                  {tipo.nombre}
                  {tipo.descripcion && <div className="field-hint">{tipo.descripcion}</div>}
                </td>
                <td>{tipo.duracion_dias === 1 ? '1 día' : `${tipo.duracion_dias} días`}</td>
                <td>
                  <Money value={tipo.precio} />
                </td>
                <td>
                  <StatusBadge estado={tipo.estado} />
                </td>
                {isAdmin && (
                  <td className="actions">
                    <Link to={`/memberships/${tipo.id_tipo_membresia}`} className="btn btn-secondary">
                      Editar
                    </Link>
                    <button type="button" className="btn btn-secondary" onClick={() => setPending(tipo)}>
                      {tipo.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.estado === 'activo' ? 'Desactivar tipo de membresía' : 'Activar tipo de membresía'}
        message={
          pending?.estado === 'activo'
            ? `"${pending?.nombre}" dejará de ofrecerse en nuevas asignaciones. Las membresías vigentes no cambian.`
            : `"${pending?.nombre}" volverá a ofrecerse en las asignaciones.`
        }
        onConfirm={confirmStatus}
        onCancel={() => setPending(null)}
        busy={busy}
      />
    </section>
  );
}
