import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';
import Login from '../pages/Login.jsx';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<p>Página de inicio</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function mockFetch(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('pantalla de inicio de sesión', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('muestra_error_si_los_campos_estan_vacios', async () => {
    mockFetch(200, {});
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('El correo es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('muestra_el_mensaje_del_servidor_ante_credenciales_invalidas', async () => {
    mockFetch(401, {
      error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' },
    });
    renderLogin();
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Mala1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  });

  it('redirige_al_inicio_despues_de_iniciar_sesion', async () => {
    mockFetch(200, {
      data: {
        token: 'token-de-prueba',
        expiresIn: '8h',
        user: { id_usuario: 1, nombre: 'Ana', rol: 'administrador' },
      },
    });
    renderLogin();
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@gym.local' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Clave2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Página de inicio')).toBeInTheDocument();
    expect(sessionStorage.getItem('gym_token')).toBe('token-de-prueba');
  });

  it('permite_mostrar_y_ocultar_la_contrasena', () => {
    mockFetch(200, {});
    renderLogin();
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
