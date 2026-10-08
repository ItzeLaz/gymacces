import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="layout-main">
      <div className="card">
        <h1>Página no encontrada</h1>
        <p>La página que buscas no existe.</p>
        <Link to="/">Volver al inicio</Link>
      </div>
    </main>
  );
}
