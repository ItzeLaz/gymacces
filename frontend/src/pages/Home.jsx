import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMenu, roleLabel } from '../components/Navbar.jsx';
import Dashboard from './Dashboard.jsx';

export default function Home() {
  const { user } = useAuth();
  // El administrador inicia en el dashboard (FR-014)
  if (user.rol === 'administrador') return <Dashboard />;
  const shortcuts = getMenu(user.rol).filter((item) => item.to !== '/');

  return (
    <div className="card">
      <h1>Hola, {user.nombre}</h1>
      <p>Rol: {roleLabel(user.rol)}</p>
      {shortcuts.length > 0 && (
        <div className="actions">
          {shortcuts.map((item) => (
            <Link key={item.to} to={item.to} className="btn">
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
