import { useEffect, useState } from 'react';
import { getMyProfile } from '../api/clients.js';
import Message from '../components/Message.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate } from './ClientDetail.jsx';
import { membershipBadge } from '../components/MembershipsSection.jsx';
import { formatDay } from '../utils/dates.js';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Message type="error">{error}</Message>;
  if (!profile) return <p>Cargando tu información…</p>;

  const { cliente, membresia } = profile;

  return (
    <section className="card">
      <h1>Mi información</h1>
      <dl className="details-list">
        <dt>Nombre</dt>
        <dd>
          {cliente.nombre} {cliente.apellido}
        </dd>
        <dt>Correo</dt>
        <dd>{cliente.correo ?? '—'}</dd>
        <dt>Teléfono</dt>
        <dd>{cliente.telefono}</dd>
        <dt>Dirección</dt>
        <dd>{cliente.direccion ?? '—'}</dd>
        <dt>Fecha de registro</dt>
        <dd>{formatDate(cliente.fecha_registro)}</dd>
        <dt>Estado</dt>
        <dd>
          <StatusBadge estado={cliente.estado} />
        </dd>
      </dl>

      <h2>Membresía</h2>
      {membresia ? (
        <dl className="details-list">
          <dt>Tipo</dt>
          <dd>{membresia.tipo.nombre}</dd>
          <dt>Periodo</dt>
          <dd>
            {formatDay(membresia.fecha_inicio)} al {formatDay(membresia.fecha_fin)}
          </dd>
          <dt>Estado</dt>
          <dd>
            <StatusBadge estado={membershipBadge(membresia)} />
          </dd>
        </dl>
      ) : (
        <p>No tienes una membresía registrada.</p>
      )}
      <h2>Pagos</h2>
      <p>Disponible próximamente</p>
    </section>
  );
}
