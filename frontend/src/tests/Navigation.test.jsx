import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import Navbar, { getMenu } from '../components/Navbar.jsx';
import Layout from '../components/Layout.jsx';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Vitest no procesa CSS y se ejecuta desde frontend/: la hoja se lee como texto para revisar sus reglas
const css = readFileSync(path.resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

const auth = { user: null };

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: auth.user, loading: false, logout: vi.fn() }),
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('navegación por módulos', () => {
  beforeEach(() => {
    auth.user = { nombre: 'Admin', rol: 'administrador' };
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [], meta: { page: 1, limit: 10, total: 0 } }),
      }),
    );
  });

  it('el_menu_del_administrador_tiene_una_ruta_por_modulo', () => {
    expect(getMenu('administrador').map((item) => item.to)).toEqual([
      '/dashboard',
      '/users',
      '/clients',
      '/memberships',
      '/payments',
      '/access',
      '/classes',
      '/schedule',
      '/training',
    ]);
  });

  it('administrador_y_recepcionista_ven_horario_y_los_demas_no', () => {
    for (const rol of ['administrador', 'recepcionista']) {
      expect(getMenu(rol), `${rol} debe ver Horario`).toContainEqual({ to: '/schedule', label: 'Horario' });
    }
    for (const rol of ['entrenador', 'cliente']) {
      expect(getMenu(rol).map((item) => item.to), `${rol} no debe ver Horario`).not.toContain('/schedule');
    }
  });

  it('recepcionista_abre_el_horario_y_entrenador_ve_acceso_restringido', async () => {
    auth.user = { nombre: 'Recepción', rol: 'recepcionista' };
    const { unmount } = renderAt('/schedule');
    expect(await screen.findByRole('heading', { name: 'Horario' })).toBeInTheDocument();
    unmount();

    auth.user = { nombre: 'Entrenador', rol: 'entrenador' };
    renderAt('/schedule/7/2026-10-20');
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument();
  });

  it('solo_el_administrador_ve_la_opcion_clases', () => {
    expect(getMenu('administrador')).toContainEqual({ to: '/classes', label: 'Clases' });
    for (const rol of ['recepcionista', 'entrenador', 'cliente']) {
      expect(getMenu(rol).map((item) => item.to), `${rol} no debe ver Clases`).not.toContain('/classes');
    }
  });

  it('recepcionista_que_abre_classes_ve_acceso_restringido', () => {
    auth.user = { nombre: 'Recepción', rol: 'recepcionista' };
    renderAt('/classes');
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Clases' })).not.toBeInTheDocument();
  });

  it('el_administrador_abre_el_catalogo_de_clases', async () => {
    renderAt('/classes');
    expect(await screen.findByRole('heading', { name: 'Clases' })).toBeInTheDocument();
  });

  it('ningun_rol_que_no_sea_administrador_ve_usuarios_pagos_ni_dashboard', () => {
    for (const rol of ['recepcionista', 'entrenador', 'cliente']) {
      const rutas = getMenu(rol).map((item) => item.to);
      for (const restringida of ['/users', '/payments', '/dashboard']) {
        expect(rutas, `${rol} no debe ver ${restringida}`).not.toContain(restringida);
      }
    }
  });

  it('el_navbar_marca_el_modulo_activo_y_ofrece_cerrar_sesion', () => {
    render(
      <MemoryRouter initialEntries={['/clients']}>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Pagos' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('la_ruta_anterior_de_tipos_de_membresia_redirige_a_memberships', async () => {
    renderAt('/membership-types');
    expect(await screen.findByRole('heading', { name: 'Membresías', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Membresías' })).toHaveClass('active');
  });

  it('training_muestra_que_el_modulo_aun_no_esta_disponible', () => {
    renderAt('/training');
    expect(screen.getByRole('heading', { name: 'Entrenamiento' })).toBeInTheDocument();
    expect(screen.getByText('Módulo en preparación')).toBeInTheDocument();
  });

  it('recepcionista_que_abre_training_ve_acceso_restringido', () => {
    auth.user = { nombre: 'Ana', rol: 'recepcionista' };
    renderAt('/training');
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument();
  });

  it('sin_sesion_no_se_muestra_el_navbar', () => {
    auth.user = null;
    renderAt('/login');
    expect(screen.queryByRole('navigation', { name: 'Menú principal' })).not.toBeInTheDocument();
  });

  // Hallazgo de T104 (captura 11): con 9 opciones el menú del administrador se desplazaba en
  // horizontal sin barra visible y ocultaba "Dashboard", "Horario" y "Entrenamiento".
  it('el_menu_pasa_a_otra_linea_en_lugar_de_ocultar_opciones', () => {
    const bloque = css.match(/^\.navbar-links \{([^}]*)\}/m)[1];
    expect(bloque).toMatch(/flex-wrap:\s*wrap/);
    expect(bloque).not.toMatch(/overflow-x:\s*auto/);
    expect(getMenu('administrador')).toHaveLength(9);
  });

  it('el_contenido_se_desplaza_segun_la_altura_real_del_menu', () => {
    let notificar;
    const observar = vi.fn();
    globalThis.ResizeObserver = vi.fn(function ResizeObserver(callback) {
      notificar = callback;
      this.observe = observar;
      this.disconnect = vi.fn();
    });
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    const barra = document.querySelector('.navbar');
    expect(observar).toHaveBeenCalledWith(barra);

    // El menú ocupa dos líneas: su borde inferior queda en 130 px
    barra.getBoundingClientRect = () => ({ bottom: 130 });
    act(() => notificar());
    expect(document.documentElement.style.getPropertyValue('--navbar-offset')).toBe('146px');
    delete globalThis.ResizeObserver;
    document.documentElement.style.removeProperty('--navbar-offset');
  });
});
