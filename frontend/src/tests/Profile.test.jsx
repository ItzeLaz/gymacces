import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Profile from '../pages/Profile.jsx';

const PROFILE = {
  cliente: {
    id_cliente: 15,
    nombre: 'Luis',
    apellido: 'Pérez',
    correo: 'luis@correo.com',
    telefono: '5512345678',
    direccion: null,
    fecha_registro: '2026-10-08T17:00:00.000Z',
    estado: 'activo',
  },
  membresia: null,
  pagos: [],
  adeudo: '0.00',
};

const ACCESSES = [
  { id_acceso: 1, fecha_hora: '2026-10-12T16:00:00.000Z', resultado: 'rechazado', motivo: 'membresia_vencida' },
];

// Responde según la ruta: el perfil y el historial de accesos propio
function mockApi() {
  globalThis.fetch = vi.fn((url) => {
    const body = new URL(url).pathname.endsWith('/access')
      ? { data: ACCESSES, meta: { page: 1, limit: 10, total: 1 } }
      : { data: PROFILE };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  });
}

describe('perfil del cliente', () => {
  it('muestra_los_datos_del_cliente_y_avisa_si_no_tiene_membresia', async () => {
    mockApi();
    render(<Profile />);

    expect(await screen.findByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText('luis@correo.com')).toBeInTheDocument();
    expect(screen.getByText('No tienes una membresía registrada.')).toBeInTheDocument();
    expect(screen.getByText('No tienes pagos registrados.')).toBeInTheDocument();
  });

  it('muestra_su_historial_de_accesos_con_el_motivo', async () => {
    mockApi();
    render(<Profile />);

    expect(await screen.findByText('Membresía vencida')).toBeInTheDocument();
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });
});
