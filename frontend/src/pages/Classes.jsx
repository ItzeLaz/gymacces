import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { deactivateClass, listClasses } from '../api/classes.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Message from '../components/Message.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { DAY_OPTIONS } from './ClassForm.jsx';

const dayName = (dia) => DAY_OPTIONS.find((option) => option.value === dia)?.label ?? dia;

// Catálogo de clases semanales del administrador (US1)
export default function Classes() {
  const location = useLocation();
  const [estado, setEstado] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: 'success', text: location.state?.message ?? '' });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setClasses(await listClasses(estado || undefined));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [estado]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDeactivate = async () => {
    setBusy(true);
    try {
      await deactivateClass(pending.id_clase);
      setMessage({ type: 'success', text: 'Clase desactivada.' });
      await load();
    } catch (error) {
      // Por ejemplo: "No se puede desactivar una clase con reservas activas."
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <section>
      <div className="page-title">
        <h1>Clases</h1>
        <Link to="/classes/new" className="btn">
          Nueva clase
        </Link>
      </div>
      <p className="field-hint">
        Horario semanal de clases grupales. Para reservar lugares, abre el <Link to="/schedule">Horario</Link>.
      </p>

      <div className="field">
        <label htmlFor="filtro-estado">Estado</label>
        <select id="filtro-estado" value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="">Todas</option>
          <option value="activa">Activas</option>
          <option value="inactiva">Inactivas</option>
        </select>
      </div>

      <Message type={message.type}>{message.text}</Message>

      {loading ? (
        <p>Cargando clases…</p>
      ) : classes.length === 0 ? (
        <p role="status">Todavía no hay clases registradas.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Día</th>
              <th scope="col">Horario</th>
              <th scope="col">Clase</th>
              <th scope="col">Instructor</th>
              <th scope="col">Cupo</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((clase) => (
              <tr key={clase.id_clase}>
                <td>{dayName(clase.dia_semana)}</td>
                <td>
                  {clase.hora_inicio}–{clase.hora_fin}
                </td>
                <td>{clase.nombre}</td>
                <td>{clase.instructor.nombre}</td>
                <td>{clase.cupo_maximo} lugares</td>
                <td>
                  <StatusBadge estado={clase.estado} />
                </td>
                <td className="actions">
                  <Link to={`/classes/${clase.id_clase}`} className="btn btn-secondary">
                    Editar
                  </Link>
                  {clase.estado === 'activa' && (
                    <button type="button" className="btn btn-secondary" onClick={() => setPending(clase)}>
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title="Desactivar clase"
        message={`"${pending?.nombre}" dejará de aparecer en el horario y no aceptará reservas nuevas.`}
        onConfirm={confirmDeactivate}
        onCancel={() => setPending(null)}
        busy={busy}
      />
    </section>
  );
}
