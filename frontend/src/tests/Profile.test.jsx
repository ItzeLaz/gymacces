import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Profile from '../pages/Profile.jsx';

describe('perfil del cliente', () => {
  it('muestra_los_datos_del_cliente_y_disponible_proximamente', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: {
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
            pagos: null,
          },
        }),
    });

    render(<Profile />);

    expect(await screen.findByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText('luis@correo.com')).toBeInTheDocument();
    expect(screen.getAllByText('Disponible próximamente')).toHaveLength(2);
  });
});
