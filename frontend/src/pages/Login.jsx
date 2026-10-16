import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Message from '../components/Message.jsx';

// Icono de mancuerna de la marca; decorativo porque el texto ya la nombra
function DumbbellIcon() {
  return (
    <svg className="login-brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2 10v4M5 7v10M8 9v6M16 9v6M19 7v10M22 10v4M8 12h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Marco de escaneo facial de la tarjeta de muestra
function FaceScanIcon() {
  return (
    <svg className="login-showcase-scan" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path
        d="M6 18V10a4 4 0 0 1 4-4h8M46 6h8a4 4 0 0 1 4 4v8M58 46v8a4 4 0 0 1-4 4h-8M18 58h-8a4 4 0 0 1-4-4v-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="30" rx="11" ry="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M27 28h.01M37 28h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 36q4 3 8 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path className="login-showcase-scanline" d="M14 32h36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      {hidden && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      {/* Panel de presentación: solo visual, se oculta en pantallas pequeñas */}
      <aside className="login-hero-section" aria-hidden="true">
        <div className="login-brand">
          <DumbbellIcon />
          <span>ACCESS GYM</span>
        </div>

        <div className="login-hero-body">
          <p className="login-hero-title">
            Controla quién entra, <span className="login-hero-accent">sin filas.</span>
          </p>
          <div className="login-showcase">
            <FaceScanIcon />
            <div>
              <p className="login-showcase-label">Reconocimiento facial</p>
              <span className="login-showcase-badge">Acceso autorizado</span>
            </div>
          </div>
        </div>

        <div className="login-dots">
          <span className="login-dot login-dot-active" />
          <span className="login-dot" />
          <span className="login-dot" />
        </div>
      </aside>

      <main className="login-form-section">
        <div className="login-form-wrapper">
          <h1 className="login-title">Iniciar sesión en Access Gym</h1>
          <p className="login-subtitle">Ingresa con tu correo y contraseña para continuar.</p>
          <Message type="error">{serverError}</Message>
          <form className="form login-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="correo">Correo electrónico</label>
              <input
                id="correo"
                type="email"
                autoComplete="username"
                placeholder="tu@correo.com"
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
              <div className="password-input">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
              {errors.password && (
                <span id="password-error" className="field-error">
                  {errors.password}
                </span>
              )}
            </div>
            <button type="submit" className="btn login-submit" disabled={sending}>
              {sending ? (
                'Iniciando sesión…'
              ) : (
                <>
                  Iniciar sesión <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>
          <p className="login-support">
            ¿Problemas para entrar? Pide ayuda al administrador del gimnasio.
          </p>
        </div>
      </main>
    </div>
  );
}
