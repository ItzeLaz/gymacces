import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createUser, getUser, updateUser } from '../api/users.js';
import { listClients } from '../api/clients.js';
import { fieldErrors } from '../api/client.js';
import Message from '../components/Message.jsx';

const EMPTY = { nombre: '', correo: '', password: '', rol: 'recepcionista', id_cliente: '' };

function FieldError({ id, text }) {
  if (!text) return null;
  return (
    <span id={id} className="field-error">
      {text}
    </span>
  );
}

export default function UserForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [saving, setSaving] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientOptions, setClientOptions] = useState([]);
  const [linkedClient, setLinkedClient] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    getUser(id)
      .then((user) => {
        setForm({ ...EMPTY, nombre: user.nombre, correo: user.correo, rol: user.rol, id_cliente: user.id_cliente ?? '' });
        if (user.id_cliente) setLinkedClient({ id_cliente: user.id_cliente, correo: user.correo });
      })
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [id, isEdit]);

  // Busca clientes para vincular una cuenta con rol cliente
  useEffect(() => {
    if (form.rol !== 'cliente' || clientSearch.trim().length < 2) {
      setClientOptions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      listClients({ search: clientSearch.trim(), estado: 'activo', limit: 10 })
        .then(({ data }) => setClientOptions(data))
        .catch(() => setClientOptions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, form.rol]);

  const update = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  const validateLocal = () => {
    const next = {};
    if (!form.nombre.trim()) next.nombre = 'El nombre es obligatorio.';
    if (form.rol !== 'cliente' && !form.correo.trim()) next.correo = 'El correo es obligatorio.';
    if (!isEdit && !form.password) next.password = 'La contraseña es obligatoria.';
    if (form.rol === 'cliente' && !form.id_cliente) next.id_cliente = 'Selecciona el cliente vinculado.';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const localErrors = validateLocal();
    setErrors(localErrors);
    setMessage({ type: 'success', text: '' });
    if (Object.keys(localErrors).length > 0) return;

    const payload = { nombre: form.nombre.trim(), rol: form.rol };
    if (form.rol === 'cliente') payload.id_cliente = Number(form.id_cliente);
    else payload.correo = form.correo.trim();
    if (form.password) payload.password = form.password;

    setSaving(true);
    try {
      if (isEdit) {
        await updateUser(id, payload);
        setMessage({ type: 'success', text: 'Usuario actualizado correctamente.' });
        setForm((current) => ({ ...current, password: '' }));
      } else {
        await createUser(payload);
        navigate('/users', { replace: true });
      }
    } catch (error) {
      setErrors(fieldErrors(error));
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <h1>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h1>
      <Message type={message.type}>{message.text}</Message>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" value={form.nombre} onChange={update('nombre')} aria-invalid={Boolean(errors.nombre)} aria-describedby="nombre-error" />
          <FieldError id="nombre-error" text={errors.nombre} />
        </div>

        <div className="field">
          <label htmlFor="rol">Rol</label>
          <select id="rol" value={form.rol} onChange={update('rol')} aria-invalid={Boolean(errors.rol)} aria-describedby="rol-error">
            <option value="administrador">Administrador</option>
            <option value="recepcionista">Recepcionista</option>
            <option value="entrenador">Entrenador</option>
            <option value="cliente">Cliente</option>
          </select>
          <FieldError id="rol-error" text={errors.rol} />
        </div>

        {form.rol === 'cliente' ? (
          <div className="field">
            <label htmlFor="client-search">Cliente vinculado</label>
            {linkedClient && String(linkedClient.id_cliente) === String(form.id_cliente) && (
              <span className="field-hint">Vinculado actualmente: {linkedClient.correo}</span>
            )}
            <input
              id="client-search"
              type="search"
              placeholder="Escribe al menos 2 letras del nombre, apellido o correo"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
            />
            {clientOptions.length > 0 && (
              <select
                aria-label="Resultados de clientes"
                value={form.id_cliente}
                onChange={update('id_cliente')}
                aria-invalid={Boolean(errors.id_cliente)}
                aria-describedby="id_cliente-error"
              >
                <option value="">Selecciona un cliente</option>
                {clientOptions.map((client) => (
                  <option key={client.id_cliente} value={client.id_cliente}>
                    {client.apellido}, {client.nombre} {client.correo ? `— ${client.correo}` : '— sin correo'}
                  </option>
                ))}
              </select>
            )}
            <span className="field-hint">El correo de la cuenta será el del cliente.</span>
            <FieldError id="id_cliente-error" text={errors.id_cliente} />
          </div>
        ) : (
          <div className="field">
            <label htmlFor="correo">Correo</label>
            <input id="correo" type="email" value={form.correo} onChange={update('correo')} aria-invalid={Boolean(errors.correo)} aria-describedby="correo-error" />
            <FieldError id="correo-error" text={errors.correo} />
          </div>
        )}

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-hint password-error"
          />
          <span id="password-hint" className="field-hint">
            {isEdit
              ? 'Déjala vacía para no cambiarla.'
              : 'Entre 8 y 72 caracteres, con al menos una letra y un número.'}
          </span>
          <FieldError id="password-error" text={errors.password} />
        </div>

        <div className="actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/users')}>
            Volver
          </button>
        </div>
      </form>
    </section>
  );
}
