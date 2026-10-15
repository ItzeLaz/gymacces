import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

// Estructura de las páginas autenticadas: menú flotante y contenido debajo
export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}
