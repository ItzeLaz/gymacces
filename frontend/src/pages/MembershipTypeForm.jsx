import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createMembershipType, listMembershipTypes, updateMembershipType } from '../api/membershipTypes.js';
import { fieldErrors } from '../api/client.js';
import Message from '../components/Message.jsx';

const EMPTY = { nombre: '', descripcion: '', duracion_dias: '', precio: '' };
const AMOUNT_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

export function validateType(form) {
  const errors = {};
  const nombre = form.nombre.trim();
  if (nombre.length < 2 || nombre.length > 80) errors.nombre = 'El nombre debe tener entre 2 y 80 caracteres.';
  const duracion = Number(form.duracion_dias);
  if (!/^\d+$/.test(String(form.duracion_dias).trim()) || duracion < 1 || duracion > 3650) {
    errors.duracion_dias = 'La duración debe ser un número entero de días mayor a cero.';
  }
  if (!AMOUNT_PATTERN.test(String(form.precio).trim())) {
    errors.precio = 'El precio debe ser un monto no negativo con hasta 2 decimales.';
  }
  return errors;
}

export default function MembershipTypeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [saving, setSaving] = useState(false);

  // La API no tiene GET por id: se busca el tipo en el catálogo completo
  useEffect(() => {
    if (!isEdit) return;
    listMembershipTypes({ limit: 100 })
      .then(({ data }) => {
        const tipo = data.find((item) => String(item.id_tipo_membresia) === String(id));
        if (!tipo) throw new Error('El tipo de membresía no existe.');
        setForm({
          nombre: tipo.nombre,
          descripcion: tipo.descripcion ?? '',
          duracion_dias: String(tipo.duracion_dias),
          precio: tipo.precio,
        });
      })
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [id, isEdit]);

  const update = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const localErrors = validateType(form);
    setErrors(localErrors);
    setMessage({ type: 'success', text: '' });
    if (Object.keys(localErrors).length > 0) return;

    const payload = {
      nombre: form.nombre.trim(),
      duracion_dias: Number(form.duracion_dias),
      precio: Number(form.precio).toFixed(2),
    };
    const descripcion = form.descripcion.trim();
    if (descripcion) payload.descripcion = descripcion;
    else if (isEdit) payload.descripcion = null;

    setSaving(true);
    try {
      if (isEdit) await updateMembershipType(id, payload);
      else await createMembershipType(payload);
      navigate('/membership-types', {
        state: { message: isEdit ? 'Tipo de membresía actualizado.' : 'Tipo de membresía registrado.' },
      });
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
      <h1>{isEdit ? 'Editar tipo de membresía' : 'Nuevo tipo de membresía'}</h1>
      <Message type={message.type}>{message.text}</Message>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input type="text" required {...fieldProps('nombre')} />
          {fieldError('nombre')}
        </div>
        <div className="field">
          <label htmlFor="descripcion">Descripción (opcional)</label>
          <input type="text" {...fieldProps('descripcion')} />
          {fieldError('descripcion')}
        </div>
        <div className="field">
          <label htmlFor="duracion_dias">Duración (días)</label>
          <input type="number" min="1" step="1" required {...fieldProps('duracion_dias')} />
          {fieldError('duracion_dias')}
        </div>
        <div className="field">
          <label htmlFor="precio">Precio</label>
          <input type="text" inputMode="decimal" required {...fieldProps('precio')} />
          <span className="field-hint">En pesos, con hasta 2 decimales. Cambiarlo no afecta a las membresías ya asignadas.</span>
          {fieldError('precio')}
        </div>

        <div className="actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/membership-types')}>
            Volver
          </button>
        </div>
      </form>
    </section>
  );
}
