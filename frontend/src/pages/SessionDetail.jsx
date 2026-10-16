import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSessionDetail } from '../api/classes.js';
import { cancelReservation } from '../api/reservations.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Message from '../components/Message.jsx';
import ReservationForm from '../components/ReservationForm.jsx';
import { formatWeekdayDay } from '../utils/dates.js';

// Detalle de una sesión: lugares, reservados, reserva (US2), cancelación (US3) y consulta (US4)
export default function SessionDetail() {
  const { idClase, fecha } = useParams();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await getSessionDetail(idClase, fecha));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [idClase, fecha]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await cancelReservation(pending.id_reserva);
      setMessage({ type: 'success', text: 'Reserva cancelada.' });
      await load();
    } catch (err) {
      // Por ejemplo: "No se puede cancelar una reserva de una clase que ya empezó."
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  if (!detail) {
    return (
      <section>
        <Message type="error">{error}</Message>
        {!error && <p>Cargando sesión…</p>}
        <Link to="/schedule">Volver al horario</Link>
      </section>
    );
  }

  const { sesion, texto_lugares: textoLugares, reservas } = detail;
  const terminada = sesion.estado_sesion === 'terminada';
  // Solo se cancela antes de que empiece la clase (US3, criterio 2)
  const cancelable = sesion.estado_sesion === 'pendiente';

  return (
    <section>
      <div className="page-title">
        <h1>{sesion.nombre}</h1>
        <Link to="/schedule" className="btn btn-secondary">
          Volver al horario
        </Link>
      </div>
      <p>
        {formatWeekdayDay(sesion.fecha_sesion)}, {sesion.hora_inicio}–{sesion.hora_fin} · Instructor: {sesion.instructor.nombre}
      </p>
      <p className={`session-places${sesion.llena ? ' session-full' : ''}`}>
        <strong>{textoLugares}</strong>
        {sesion.llena && <span className="badge badge-llena">Llena</span>}
        {sesion.estado_sesion === 'en_curso' && <span className="badge badge-en-curso">En curso</span>}
      </p>

      <Message type="error">{error}</Message>
      <Message type={message.type}>{message.text}</Message>

      {terminada ? (
        <p role="status">La clase ya terminó.</p>
      ) : (
        <ReservationForm idClase={sesion.id_clase} fechaSesion={sesion.fecha_sesion} onReserved={load} />
      )}

      <h2>Reservados</h2>
      {reservas.length === 0 ? (
        <p role="status">Todavía no hay reservas en esta sesión.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Cliente</th>
              <th scope="col">Asistencia</th>
              {cancelable && <th scope="col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {reservas.map((reserva) => (
              <tr key={reserva.id_reserva}>
                <td>
                  {reserva.cliente.apellido}, {reserva.cliente.nombre}
                </td>
                <td>{reserva.asistencia_mostrada}</td>
                {cancelable && (
                  <td className="actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      aria-label={`Cancelar reserva de ${reserva.cliente.nombre} ${reserva.cliente.apellido}`}
                      onClick={() => setPending(reserva)}
                    >
                      Cancelar reserva
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title="Cancelar reserva"
        message={`Se cancelará la reserva de ${pending?.cliente.nombre} ${pending?.cliente.apellido} y su lugar quedará libre.`}
        onConfirm={confirmCancel}
        onCancel={() => setPending(null)}
        busy={busy}
      />
    </section>
  );
}
