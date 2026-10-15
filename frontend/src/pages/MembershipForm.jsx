import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assignMembership, getClientMemberships, renewMembership } from '../api/memberships.js';
import { listMembershipTypes } from '../api/membershipTypes.js';
import { fieldErrors } from '../api/client.js';
import Message from '../components/Message.jsx';
import Money from '../components/Money.jsx';
import { addDays, endDateFor, formatDay, todayIso } from '../utils/dates.js';

// Última membresía no cancelada que aún no termina: la renovación se encadena después (FR-010)
function chainedStart(historial) {
  const hoy = todayIso();
  const vigentes = historial.filter((m) => m.estado !== 'cancelada' && m.fecha_fin >= hoy);
  if (vigentes.length === 0) return null;
  const ultimaFin = vigentes.map((m) => m.fecha_fin).sort().at(-1);
  return addDays(ultimaFin, 1);
}

export default function MembershipForm({ mode = 'assign' }) {
  const isRenew = mode === 'renew';
  const { id } = useParams();
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [idTipo, setIdTipo] = useState('');
  const [fechaInicio, setFechaInicio] = useState(todayIso());
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listMembershipTypes({ estado: 'activo', limit: 100 }), getClientMemberships(id)])
      .then(([{ data }, membresias]) => {
        // El recepcionista ya recibe solo activos; el filtro cubre también al administrador
        setTypes(data.filter((tipo) => tipo.estado === 'activo'));
        setHistorial(membresias.historial);
      })
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [id]);

  const chained = isRenew ? chainedStart(historial) : null;
  const inicio = chained ?? fechaInicio;
  const tipo = types.find((item) => String(item.id_tipo_membresia) === idTipo);
  const fin = useMemo(() => (tipo && inicio ? endDateFor(inicio, tipo.duracion_dias) : null), [tipo, inicio]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const localErrors = {};
    if (!idTipo) localErrors.id_tipo_membresia = 'Selecciona un tipo de membresía.';
    if (!chained && fechaInicio < todayIso()) localErrors.fecha_inicio = 'La fecha de inicio no puede ser anterior a hoy.';
    setErrors(localErrors);
    setMessage({ type: 'success', text: '' });
    if (Object.keys(localErrors).length > 0) return;

    const payload = { id_tipo_membresia: Number(idTipo) };
    if (!chained) payload.fecha_inicio = fechaInicio;

    setSaving(true);
    try {
      await (isRenew ? renewMembership(id, payload) : assignMembership(id, payload));
      navigate(`/clients/${id}`, {
        state: { message: isRenew ? 'Membresía renovada correctamente.' : 'Membresía asignada correctamente.' },
      });
    } catch (error) {
      setErrors(fieldErrors(error));
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <h1>{isRenew ? 'Renovar membresía' : 'Asignar membresía'}</h1>
      <Message type={message.type}>{message.text}</Message>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="id_tipo_membresia">Tipo de membresía</label>
          <select
            id="id_tipo_membresia"
            value={idTipo}
            onChange={(event) => setIdTipo(event.target.value)}
            aria-invalid={Boolean(errors.id_tipo_membresia)}
          >
            <option value="">Selecciona…</option>
            {types.map((item) => (
              <option key={item.id_tipo_membresia} value={String(item.id_tipo_membresia)}>
                {item.nombre} · {item.duracion_dias} días
              </option>
            ))}
          </select>
          {errors.id_tipo_membresia && <span className="field-error">{errors.id_tipo_membresia}</span>}
        </div>

        {chained ? (
          <p className="field-hint">Iniciará el {formatDay(chained)}, al terminar la membresía actual.</p>
        ) : (
          <div className="field">
            <label htmlFor="fecha_inicio">Fecha de inicio</label>
            <input
              id="fecha_inicio"
              type="date"
              min={todayIso()}
              value={fechaInicio}
              onChange={(event) => setFechaInicio(event.target.value)}
              aria-invalid={Boolean(errors.fecha_inicio)}
            />
            {errors.fecha_inicio && <span className="field-error">{errors.fecha_inicio}</span>}
          </div>
        )}

        {tipo && fin && (
          <p role="status">
            Termina el {formatDay(fin)} · Monto: <Money value={tipo.precio} />
          </p>
        )}

        <div className="actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Guardando…' : isRenew ? 'Renovar membresía' : 'Asignar membresía'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/clients/${id}`)}>
            Volver
          </button>
        </div>
      </form>
    </section>
  );
}
