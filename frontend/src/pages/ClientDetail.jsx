import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { changeClientStatus, getClient } from '../api/clients.js';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Message from '../components/Message.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const LABELS = {
  nombre: 'Nombre',
  apellido: 'Apellido',
  correo: 'Correo',
  telefono: 'Teléfono',
  direccion: 'Dirección',
  fecha_registro: 'Fecha de registro',
  estado: 'Estado',
};

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ClientDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const canWrite = user.rol === 'administrador' || user.rol === 'recepcionista';
  const [client, setClient] = useState(null);
  const [message, setMessage] = useState({ type: 'success', text: location.state?.message ?? '' });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getClient(id)
      .then(setClient)
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [id]);

  const toggleStatus = async () => {
    const next = client.estado === 'activo' ? 'inactivo' : 'activo';
    setBusy(true);
    try {
      setClient(await changeClientStatus(id, next));
      setMessage({ type: 'success', text: `Cliente ${next === 'activo' ? 'activado' : 'desactivado'} correctamente.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <section className="card">
      <Message type={message.type}>{message.text}</Message>
      {client && (
        <>
          <div className="page-title">
            <h1>
              {client.nombre} {client.apellido}
            </h1>
            {canWrite && (
              <div className="actions">
                <Link to={`/clients/${id}/edit`} className="btn">
                  Editar
                </Link>
                <button
                  type="button"
                  className={client.estado === 'activo' ? 'btn btn-danger' : 'btn btn-secondary'}
                  onClick={() => setConfirming(true)}
                >
                  {client.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )}
          </div>
          <dl className="details-list">
            {Object.entries(LABELS)
              .filter(([key]) => key in client)
              .map(([key, label]) => (
                <div key={key} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd>
                    {key === 'estado' ? (
                      <StatusBadge estado={client.estado} />
                    ) : key === 'fecha_registro' ? (
                      formatDate(client.fecha_registro)
                    ) : (
                      client[key] ?? '—'
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        </>
      )}
      <p>
        <Link to="/clients">Volver al listado</Link>
      </p>

      <ConfirmDialog
        open={confirming}
        title={client?.estado === 'activo' ? 'Desactivar cliente' : 'Activar cliente'}
        message={
          client?.estado === 'activo'
            ? 'El cliente quedará como inactivo, pero su información se conserva. ¿Deseas continuar?'
            : 'El cliente volverá a estar activo. ¿Deseas continuar?'
        }
        onConfirm={toggleStatus}
        onCancel={() => setConfirming(false)}
        busy={busy}
      />
    </section>
  );
}
