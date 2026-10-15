import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient, getClient, updateClient } from '../api/clients.js';
import { fieldErrors } from '../api/client.js';
import Message from '../components/Message.jsx';

const EMPTY = { nombre: '', apellido: '', telefono: '', correo: '', direccion: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s-]+$/;

const FIELDS = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'apellido', label: 'Apellido', required: true },
  { name: 'telefono', label: 'Teléfono', required: true, type: 'tel', hint: 'Entre 10 y 15 dígitos.' },
  { name: 'correo', label: 'Correo (opcional)', type: 'email' },
  { name: 'direccion', label: 'Dirección (opcional)' },
];

export function validateClient(form) {
  const errors = {};
  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
  if (!form.apellido.trim()) errors.apellido = 'El apellido es obligatorio.';
  const digits = form.telefono.replace(/\D/g, '');
  if (!form.telefono.trim()) errors.telefono = 'El teléfono es obligatorio.';
  else if (!PHONE_PATTERN.test(form.telefono.trim()) || digits.length < 10 || digits.length > 15) {
    errors.telefono = 'El teléfono debe tener entre 10 y 15 dígitos.';
  }
  if (form.correo.trim() && !EMAIL_PATTERN.test(form.correo.trim())) {
    errors.correo = 'El correo no tiene un formato válido.';
  }
  return errors;
}

export default function ClientForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getClient(id)
      .then((cliente) =>
        setForm({
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          telefono: cliente.telefono ?? '',
          correo: cliente.correo ?? '',
          direccion: cliente.direccion ?? '',
        }),
      )
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [id, isEdit]);

  const update = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const localErrors = validateClient(form);
    setErrors(localErrors);
    setMessage({ type: 'success', text: '' });
    if (Object.keys(localErrors).length > 0) return;

    const payload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      telefono: form.telefono.trim(),
      correo: form.correo.trim() || null,
      direccion: form.direccion.trim() || null,
    };
    if (!isEdit) {
      if (!payload.correo) delete payload.correo;
      if (!payload.direccion) delete payload.direccion;
    }

    setSaving(true);
    try {
      const saved = isEdit ? await updateClient(id, payload) : await createClient(payload);
      setMessage({
        type: 'success',
        text: isEdit ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.',
      });
      if (!isEdit) navigate(`/clients/${saved.id_cliente}`, { state: { message: 'Cliente registrado correctamente.' } });
    } catch (error) {
      setErrors(fieldErrors(error));
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <h1>{isEdit ? 'Editar cliente' : 'Nuevo cliente'}</h1>
      <Message type={message.type}>{message.text}</Message>

      <form className="form" onSubmit={handleSubmit} noValidate>
        {FIELDS.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              type={field.type ?? 'text'}
              value={form[field.name]}
              onChange={update(field.name)}
              required={field.required}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
            />
            {field.hint && <span className="field-hint">{field.hint}</span>}
            {errors[field.name] && (
              <span id={`${field.name}-error`} className="field-error">
                {errors[field.name]}
              </span>
            )}
          </div>
        ))}

        <div className="actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(isEdit ? `/clients/${id}` : '/clients')}
          >
            Volver
          </button>
        </div>
      </form>
    </section>
  );
}
