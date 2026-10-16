import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

const GAP_BELOW_NAVBAR = 16;

// Estructura de las páginas autenticadas: menú flotante y contenido debajo
export default function Layout() {
  // El menú es fijo y puede ocupar dos líneas: el contenido empieza debajo de su altura real
  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    if (!navbar || typeof ResizeObserver === 'undefined') return undefined;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      const { bottom } = navbar.getBoundingClientRect();
      root.style.setProperty('--navbar-offset', `${Math.ceil(bottom) + GAP_BELOW_NAVBAR}px`);
    });
    observer.observe(navbar);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--navbar-offset');
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
    </>
  );
}
