import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClass, listClasses, listInstructors, updateClass } from '../api/classes.js';
import { fieldErrors } from '../api/client.js';
import Message from '../components/Message.jsx';

export const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

const EMPTY = { nombre: '', id_instructor: '', dia_semana: '', hora_inicio: '', duracion_minutos: '', cupo_maximo: '' };
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const isIntIn = (value, min, max) => /^\d+$/.test(String(value).trim()) && Number(value) >= min && Number(value) <= max;

// Mismas reglas que el servidor (contracts/api.md); el servidor vuelve a validar todo
export function validateClass(form) {
  const errors = {};
  const nombre = form.nombre.trim();
  if (nombre.length < 1 || nombre.length > 80) errors.nombre = 'El nombre debe tener entre 1 y 80 caracteres.';
  if (!form.id_instructor) errors.id_instructor = 'Elige un instructor.';
  if (!form.dia_semana) errors.dia_semana = 'Elige el día de la semana.';
  if (!TIME_PATTERN.test(form.hora_inicio)) errors.hora_inicio = 'La hora de inicio debe tener el formato HH:MM (24 horas).';
  if (!isIntIn(form.duracion_minutos, 15, 240)) errors.duracion_minutos = 'La duración debe estar entre 15 y 240 minutos.';
  if (!isIntIn(form.cupo_maximo, 1, 100)) errors.cupo_maximo = 'El cupo debe estar entre 1 y 100 lugares.';
  if (!errors.hora_inicio && !errors.duracion_minutos) {
    const [horas, minutos] = form.hora_inicio.split(':').map(Number);
    if (horas * 60 + minutos + Number(form.duracion_minutos) > 24 * 60) {
      errors.duracion_minutos = 'La clase debe terminar el mismo día.';
    }
  }
  return errors;
}

export default function ClassForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [original, setOriginal] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listInstructors()
      .then(setInstructors)
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, []);

  // La API no tiene GET por id: se busca la clase en el catálogo completo
  useEffect(() => {
    if (!isEdit) return;
    listClasses()
      .then((clases) => {
        const clase = clases.find((item) => String(item.id_clase) === String(id));
        if (!clase) throw new Error('La clase no existe.');
        const valores = {
          nombre: clase.nombre,
          id_instructor: String(clase.instructor.id_usuario),
          dia_semana: String(clase.dia_semana),
          hora_inicio: clase.hora_inicio,
          duracion_minutos: String(clase.duracion_minutos),
          cupo_maximo: String(clase.cupo_maximo),
        };
        setForm(valores);
        setOriginal(valores);
        // Un entrenador desactivado después sigue como instructor actual (Supuestos del spec)
        setInstructors((actuales) =>
          actuales.some((item) => item.id_usuario === clase.instructor.id_usuario)
            ? actuales
            : [...actuales, { ...clase.instructor, nombre: `${clase.instructor.nombre} (inactivo)` }],
        );
      })
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [id, isEdit]);

  const update = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const toPayload = () => ({
    nombre: form.nombre.trim(),
    id_instructor: Number(form.id_instructor),
    dia_semana: Number(form.dia_semana),
    hora_inicio: form.hora_inicio,
    duracion_minutos: Number(form.duracion_minutos),
    cupo_maximo: Number(form.cupo_maximo),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const localErrors = validateClass(form);
    setErrors(localErrors);
    setMessage({ type: 'success', text: '' });
    if (Object.keys(localErrors).length > 0) return;

    let payload = toPayload();
    // Al editar solo se envían los campos que cambiaron, para no bloquear cambios de nombre o cupo
    if (isEdit && original) {
      payload = Object.fromEntries(
        Object.entries(payload).filter(([campo]) => String(form[campo]).trim() !== String(original[campo])),
      );
      if (Object.keys(payload).length === 0) {
        setMessage({ type: 'error', text: 'No hay cambios para guardar.' });
        return;
      }
    }

    setSaving(true);
    try {
      let texto = 'Clase actualizada.';
      if (isEdit) await updateClass(id, payload);
      else texto = (await createClass(payload)).message ?? 'Clase registrada.';
      navigate('/classes', { state: { message: texto } });
    } catch (error) {
      setErrors(fieldErrors(error));
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const fieldProps = (name) => ({
    id: name,
    value: form[name],
    onChange: update(name),
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });

  const fieldError = (name) =>
    errors[name] && (
      <span id={`${name}-error`} className="field-error">
        {errors[name]}
      </span>
    );

  return (
    <section className="card">
      <h1>{isEdit ? 'Editar clase' : 'Nueva clase'}</h1>
      <Message type={message.type}>{message.text}</Message>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input type="text" required maxLength={80} {...fieldProps('nombre')} />
          {fieldError('nombre')}
        </div>
        <div className="field">
          <label htmlFor="id_instructor">Instructor</label>
          <select required {...fieldProps('id_instructor')}>
            <option value="">Elige un instructor</option>
            {instructors.map((instructor) => (
              <option key={instructor.id_usuario} value={instructor.id_usuario}>
                {instructor.nombre}
              </option>
            ))}
          </select>
          <span className="field-hint">Solo aparecen los entrenadores activos.</span>
          {fieldError('id_instructor')}
        </div>
        <div className="field">
          <label htmlFor="dia_semana">Día de la semana</label>
          <select required {...fieldProps('dia_semana')}>
            <option value="">Elige un día</option>
            {DAY_OPTIONS.map((dia) => (
              <option key={dia.value} value={dia.value}>
                {dia.label}
              </option>
            ))}
          </select>
          {fieldError('dia_semana')}
        </div>
        <div className="field">
          <label htmlFor="hora_inicio">Hora de inicio</label>
          <input type="time" required {...fieldProps('hora_inicio')} />
          {fieldError('hora_inicio')}
        </div>
        <div className="field">
          <label htmlFor="duracion_minutos">Duración (minutos)</label>
          <input type="number" min="15" max="240" step="1" required {...fieldProps('duracion_minutos')} />
          <span className="field-hint">Entre 15 y 240 minutos. La clase debe terminar el mismo día.</span>
          {fieldError('duracion_minutos')}
        </div>
        <div className="field">
          <label htmlFor="cupo_maximo">Cupo máximo</label>
          <input type="number" min="1" max="100" step="1" required {...fieldProps('cupo_maximo')} />
          <span className="field-hint">Entre 1 y 100 lugares por sesión.</span>
          {fieldError('cupo_maximo')}
        </div>

        <div className="actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/classes')}>
            Volver
          </button>
        </div>
      </form>
    </section>
  );
}
