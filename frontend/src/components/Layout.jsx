import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = {
  administrador: 'Administrador',
  recepcionista: 'Recepcionista',
  entrenador: 'Entrenador',
  cliente: 'Cliente',
};

// Menú por rol (FR-004); las opciones del Sprint 2 siguen la matriz de contracts/api.md
const MENU = {
  administrador: [
    { to: '/', label: 'Inicio' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/users', label: 'Usuarios' },
    { to: '/clients', label: 'Clientes' },
    { to: '/membership-types', label: 'Tipos de membresía' },
    { to: '/payments', label: 'Pagos' },
    { to: '/debts', label: 'Adeudos' },
    { to: '/access', label: 'Accesos' },
    { to: '/access/station', label: 'Estación de acceso' },
  ],
  recepcionista: [
    { to: '/', label: 'Inicio' },
    { to: '/clients', label: 'Clientes' },
    { to: '/membership-types', label: 'Tipos de membresía' },
    { to: '/access', label: 'Accesos' },
    { to: '/access/station', label: 'Estación de acceso' },
  ],
  entrenador: [
    { to: '/', label: 'Inicio' },
    { to: '/clients', label: 'Clientes' },
    { to: '/access', label: 'Accesos' },
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
            <NavLink key={item.to} to={item.to} end={item.to === '/' || item.to === '/access'}>
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
