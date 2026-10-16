import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReservationForm from '../components/ReservationForm.jsx';

const CLIENTES = [{ id_cliente: 15, nombre: 'Luis', apellido: 'Pérez', estado: 'activo' }];

const respuesta = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

// La API simulada responde la búsqueda de clientes y, con POST, la reserva
function mockApi(postStatus, postBody) {
  globalThis.fetch = vi.fn((url, options = {}) => {
    if (options.method === 'POST') return Promise.resolve(respuesta(postStatus, postBody));
    if (String(url).includes('/clients')) {
      return Promise.resolve(respuesta(200, { data: CLIENTES, meta: { page: 1, limit: 10, total: 1 } }));
    }
    return Promise.resolve(respuesta(404, { error: { code: 'NOT_FOUND', message: 'No existe.' } }));
  });
}

async function buscarYReservar() {
  fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'Luis' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Reservar a Luis Pérez' }));
}

describe('formulario de reserva', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('busca_cliente_y_envia_la_reserva', async () => {
    mockApi(201, { data: { id_reserva: 31, cliente: CLIENTES[0], estado: 'activa' } });
    const onReserved = vi.fn();
    render(<ReservationForm idClase={7} fechaSesion="2026-10-20" onReserved={onReserved} />);
    await buscarYReservar();

    expect(await screen.findByText('Reserva registrada para Luis Pérez.')).toBeInTheDocument();
    expect(onReserved).toHaveBeenCalledTimes(1);
    const busqueda = new URL(String(globalThis.fetch.mock.calls[0][0]));
    expect(busqueda.pathname).toMatch(/\/clients$/);
    expect(busqueda.searchParams.get('search')).toBe('Luis');
    expect(busqueda.searchParams.get('estado')).toBe('activo');
    const [, options] = globalThis.fetch.mock.calls.find(([, opciones]) => opciones?.method === 'POST');
    expect(JSON.parse(options.body)).toEqual({ id_clase: 7, fecha_sesion: '2026-10-20', id_cliente: 15 });
  });

  it('muestra_clase_llena_cuando_el_servidor_la_rechaza', async () => {
    mockApi(422, { error: { code: 'BUSINESS_RULE', message: 'Clase llena.' } });
    const onReserved = vi.fn();
    render(<ReservationForm idClase={7} fechaSesion="2026-10-20" onReserved={onReserved} />);
    await buscarYReservar();

    expect(await screen.findByText('Clase llena.')).toBeInTheDocument();
    expect(onReserved).not.toHaveBeenCalled();
  });

  it('muestra_el_mensaje_de_membresia_no_vigente', async () => {
    mockApi(422, {
      error: { code: 'BUSINESS_RULE', message: 'El cliente no tiene una membresía vigente para la fecha de la clase.' },
    });
    render(<ReservationForm idClase={7} fechaSesion="2026-10-20" onReserved={vi.fn()} />);
    await buscarYReservar();

    expect(
      await screen.findByText('El cliente no tiene una membresía vigente para la fecha de la clase.'),
    ).toBeInTheDocument();
  });

  it('avisa_cuando_la_busqueda_no_encuentra_clientes', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(respuesta(200, { data: [], meta: { page: 1, limit: 10, total: 0 } })),
    );
    render(<ReservationForm idClase={7} fechaSesion="2026-10-20" onReserved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'Nadie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('No se encontraron clientes activos con esa búsqueda.')).toBeInTheDocument();
  });
});
