import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Solo mejora la experiencia: la autorización real la hace el backend
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="main-content">Cargando…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.rol)) {
    return (
      <div className="card" role="alert">
        <h1>Acceso restringido</h1>
        <p>No tienes permiso para ver esta página</p>
      </div>
    );
  }

  return children ?? <Outlet />;
}
