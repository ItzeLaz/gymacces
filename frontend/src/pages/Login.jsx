import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Message from '../components/Message.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!correo.trim()) nextErrors.correo = 'El correo es obligatorio.';
    if (!password) nextErrors.password = 'La contraseña es obligatoria.';
    setErrors(nextErrors);
    setServerError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSending(true);
    try {
      await login(correo.trim(), password);
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(error.message);
      setSending(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card">
        <h1>Iniciar sesión</h1>
        <Message type="error">{serverError}</Message>
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="correo">Correo</label>
            <input
              id="correo"
              type="email"
              autoComplete="username"
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              aria-invalid={Boolean(errors.correo)}
              aria-describedby={errors.correo ? 'correo-error' : undefined}
            />
            {errors.correo && (
              <span id="correo-error" className="field-error">
                {errors.correo}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <span id="password-error" className="field-error">
                {errors.password}
              </span>
            )}
          </div>
          <button type="submit" className="btn" disabled={sending}>
            {sending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
