import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getMenu } from '../components/Navbar.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import Home from '../pages/Home.jsx';
import Dashboard from '../pages/Dashboard.jsx';

const auth = { user: null };

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: auth.user, loading: false }),
}));

describe('acceso al dashboard según el rol', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('solo_el_menu_del_administrador_incluye_dashboard', () => {
    expect(getMenu('administrador').map((item) => item.label)).toContain('Dashboard');
    for (const rol of ['recepcionista', 'entrenador', 'cliente']) {
      expect(getMenu(rol).map((item) => item.label)).not.toContain('Dashboard');
    }
  });

  it('un_recepcionista_que_abre_dashboard_ve_acceso_restringido', () => {
    auth.user = { nombre: 'Ana', rol: 'recepcionista' };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute roles={['administrador']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('el_inicio_del_recepcionista_no_pide_el_dashboard', () => {
    auth.user = { nombre: 'Ana', rol: 'recepcionista' };
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText('Hola, Ana')).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
