import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSessionDetail } from '../api/classes.js';
import Message from '../components/Message.jsx';
import ReservationForm from '../components/ReservationForm.jsx';
import { formatWeekdayDay } from '../utils/dates.js';

// Detalle de una sesión: lugares, reservados y formulario de reserva (US4 y US2)
export default function SessionDetail() {
  const { idClase, fecha } = useParams();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

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
            </tr>
          </thead>
          <tbody>
            {reservas.map((reserva) => (
              <tr key={reserva.id_reserva}>
                <td>
                  {reserva.cliente.apellido}, {reserva.cliente.nombre}
                </td>
                <td>{reserva.asistencia_mostrada}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
