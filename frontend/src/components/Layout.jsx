import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = {
  administrador: 'Administrador',
  recepcionista: 'Recepcionista',
  entrenador: 'Entrenador',
  cliente: 'Cliente',
};

// Menú por rol (FR-004). Sin membresías, pagos ni reconocimiento facial (FR-033).
const MENU = {
  administrador: [
    { to: '/', label: 'Inicio' },
    { to: '/users', label: 'Usuarios' },
    { to: '/clients', label: 'Clientes' },
  ],
  recepcionista: [
    { to: '/', label: 'Inicio' },
    { to: '/clients', label: 'Clientes' },
  ],
  entrenador: [
    { to: '/', label: 'Inicio' },
    { to: '/clients', label: 'Clientes' },
  ],
  cliente: [
    { to: '/', label: 'Inicio' },
    { to: '/profile', label: 'Mi información' },
  ],
};

export function getMenu(rol) {
  return MENU[rol] ?? [];
}

export function roleLabel(rol) {
  return ROLE_LABELS[rol] ?? rol;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="layout-header">
        <nav aria-label="Menú principal">
          {getMenu(user.rol).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="layout-user">
          <span>
            {user.nombre} · {roleLabel(user.rol)}
          </span>
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </>
  );
}
