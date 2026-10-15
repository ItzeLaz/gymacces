import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// El backend todavía no tiene entrenadores, asignaciones ni rutinas: la vista lo indica sin
// mostrar datos inventados.
export default function Training() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-title">
        <h1>Entrenamiento</h1>
      </div>
      <div className="card">
        <h2>Módulo en preparación</h2>
        <p>
          La gestión de entrenadores, la asignación de clientes y las rutinas todavía no están
          disponibles. Se habilitarán en un sprint posterior.
        </p>
        {user.rol === 'administrador' && (
          <p>
            Mientras tanto, las cuentas de los entrenadores se administran en{' '}
            <Link to="/users">Usuarios</Link>.
          </p>
        )}
      </div>
    </>
  );
}
