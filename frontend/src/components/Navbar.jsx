import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = {
  administrador: 'Administrador',
  recepcionista: 'Recepcionista',
  entrenador: 'Entrenador',
  cliente: 'Cliente',
};

// Menú por rol (FR-004): cada módulo tiene su propia ruta. Adeudos vive dentro de Pagos y la
// estación de acceso dentro de Acceso, para no saturar el menú.
const MENU = {
  administrador: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/users', label: 'Usuarios' },
    { to: '/clients', label: 'Clientes' },
    { to: '/memberships', label: 'Membresías' },
    { to: '/payments', label: 'Pagos' },
    { to: '/access', label: 'Acceso' },
    { to: '/classes', label: 'Clases' },
    { to: '/training', label: 'Entrenamiento' },
  ],
  recepcionista: [
    { to: '/', label: 'Inicio' },
    { to: '/clients', label: 'Clientes' },
    { to: '/memberships', label: 'Membresías' },
    { to: '/access', label: 'Acceso' },
  ],
  entrenador: [
    { to: '/', label: 'Inicio' },
    { to: '/clients', label: 'Clientes' },
    { to: '/access', label: 'Acceso' },
    { to: '/training', label: 'Entrenamiento' },
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

// Icono de mancuerna; es decorativo porque el texto de la marca ya la nombra
function DumbbellIcon() {
  return (
    <svg className="navbar-brand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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

// Menú superior flotante; solo se monta dentro de las rutas protegidas (usuario autenticado)
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <DumbbellIcon />
        <span>GymAccess</span>
      </Link>
      <nav className="navbar-links" aria-label="Menú principal">
        {getMenu(user.rol).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="navbar-user">
        <span className="navbar-user-name">
          {user.nombre} · {roleLabel(user.rol)}
        </span>
        <button type="button" className="btn btn-pill" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
