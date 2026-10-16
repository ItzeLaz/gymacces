import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSchedule } from '../api/classes.js';
import Message from '../components/Message.jsx';
import { formatWeekdayDay } from '../utils/dates.js';

// Agrupa las sesiones por fecha conservando el orden del servidor (fecha y hora)
function groupByDay(sesiones) {
  const dias = new Map();
  sesiones.forEach((sesion) => {
    if (!dias.has(sesion.fecha_sesion)) dias.set(sesion.fecha_sesion, []);
    dias.get(sesion.fecha_sesion).push(sesion);
  });
  return [...dias.entries()];
}

// Horario de los próximos 7 días con los lugares de cada sesión (US4, criterios 4 y 5)
export default function Schedule() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSchedule()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="page-title">
        <h1>Horario</h1>
      </div>
      <p className="field-hint">Clases de hoy y de los próximos 7 días. Abre una sesión para ver a los reservados y reservar.</p>

      <Message type="error">{error}</Message>

      {loading ? (
        <p>Cargando horario…</p>
      ) : !error && sessions.length === 0 ? (
        <p role="status">No hay clases programadas en los próximos 7 días.</p>
      ) : (
        <div className="schedule">
          {groupByDay(sessions).map(([fecha, sesionesDelDia]) => (
            <section key={fecha} className="schedule-day" aria-labelledby={`dia-${fecha}`}>
              <h2 id={`dia-${fecha}`}>{formatWeekdayDay(fecha)}</h2>
              <ul className="session-list">
                {sesionesDelDia.map((sesion) => (
                  <li key={`${sesion.id_clase}-${fecha}`} className={`session-card${sesion.llena ? ' session-full' : ''}`}>
                    <Link to={`/schedule/${sesion.id_clase}/${fecha}`}>
                      <span className="session-time">
                        {sesion.hora_inicio}–{sesion.hora_fin}
                      </span>
                      <span className="session-name">{sesion.nombre}</span>
                      <span className="field-hint">{sesion.instructor.nombre}</span>
                      {sesion.llena ? (
                        <span className="badge badge-llena">Llena</span>
                      ) : (
                        <span className="session-places">
                          Quedan {sesion.lugares_disponibles} de {sesion.cupo_maximo} lugares
                        </span>
                      )}
                      {sesion.estado_sesion === 'en_curso' && <span className="badge badge-en-curso">En curso</span>}
                      {sesion.estado_sesion === 'terminada' && <span className="field-hint">Terminada</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
