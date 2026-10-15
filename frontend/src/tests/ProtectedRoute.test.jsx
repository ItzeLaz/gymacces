import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

function renderAt(path, roles) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route
            path="/privada"
            element={
              <ProtectedRoute roles={roles}>
                <p>Contenido privado</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('protección de rutas', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('sin_sesion_redirige_a_login', async () => {
    renderAt('/privada');
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
  });

  it('con_rol_no_permitido_muestra_mensaje_de_acceso_restringido', async () => {
    sessionStorage.setItem('gym_token', 'token');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id_usuario: 2, nombre: 'Eva', rol: 'entrenador' } }),
    });

    renderAt('/privada', ['administrador']);
    expect(await screen.findByText('No tienes permiso para ver esta página')).toBeInTheDocument();
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument();
  });

  it('con_rol_permitido_muestra_el_contenido', async () => {
    sessionStorage.setItem('gym_token', 'token');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id_usuario: 1, nombre: 'Ana', rol: 'administrador' } }),
    });

    renderAt('/privada', ['administrador']);
    expect(await screen.findByText('Contenido privado')).toBeInTheDocument();
  });
});
