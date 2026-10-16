import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SessionDetail from '../pages/SessionDetail.jsx';

const reserva = (id, nombre, apellido, asistencia, mostrada) => ({
  id_reserva: id,
  id_clase: 7,
  fecha_sesion: '2026-10-20',
  cliente: { id_cliente: id + 100, nombre, apellido },
  estado: 'activa',
  asistencia,
  asistencia_mostrada: mostrada,
  registrada_en_curso: false,
  registrado_por: { id_usuario: 3, nombre: 'Ana' },
});

const detalle = (estadoSesion = 'pendiente', reservas = [
  reserva(1, 'Ana', 'Álvarez', 'presente', 'Presente'),
  reserva(2, 'Luis', 'Méndez', 'sin_registrar', 'Sin registrar'),
]) => ({
  sesion: {
    id_clase: 7, nombre: 'Spinning', instructor: { id_usuario: 12, nombre: 'Carla Ruiz' }, fecha_sesion: '2026-10-20',
    hora_inicio: '18:00', hora_fin: '18:45', cupo_maximo: 20, reservas_activas: reservas.length,
    lugares_disponibles: 20 - reservas.length, llena: false, estado_sesion: estadoSesion,
  },
  texto_lugares: `Quedan ${20 - reservas.length} de 20 lugares`,
  reservas,
});

const respuesta = (status, body) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

// La API simulada: detalle de la sesión, búsqueda de clientes y POST de reserva
function mockApi(estadoSesion = 'pendiente') {
  globalThis.fetch = vi.fn((url, options = {}) => {
    const ruta = String(url);
    if (options.method === 'POST') return Promise.resolve(respuesta(201, { data: { id_reserva: 3 } }));
    if (ruta.includes('/sessions/')) return Promise.resolve(respuesta(200, { data: detalle(estadoSesion) }));
    if (ruta.includes('/clients')) {
      return Promise.resolve(
        respuesta(200, { data: [{ id_cliente: 50, nombre: 'Zoe', apellido: 'Méndez' }], meta: { page: 1, limit: 10, total: 1 } }),
      );
    }
    return Promise.resolve(respuesta(404, { error: { code: 'NOT_FOUND', message: 'No existe.' } }));
  });
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/schedule/7/2026-10-20']}>
      <Routes>
        <Route path="/schedule/:idClase/:fecha" element={<SessionDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

const llamadasAlDetalle = () =>
  globalThis.fetch.mock.calls.filter(([url, options]) => String(url).includes('/sessions/') && options?.method === 'GET').length;

describe('detalle de sesión', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('muestra_quedan_x_de_y_lugares', async () => {
    mockApi();
    renderDetail();
    expect(await screen.findByText('Quedan 18 de 20 lugares')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Spinning' })).toBeInTheDocument();
    expect(screen.getByText(/Carla Ruiz/)).toBeInTheDocument();
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain('/classes/7/sessions/2026-10-20');
  });

  it('lista_los_reservados_con_su_asistencia', async () => {
    mockApi();
    renderDetail();
    const tabla = await screen.findByRole('table');
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.map((fila) => within(fila).getAllByRole('cell').slice(0, 2).map((celda) => celda.textContent))).toEqual([
      ['Álvarez, Ana', 'Presente'],
      ['Méndez, Luis', 'Sin registrar'],
    ]);
  });

  it('incluye_el_formulario_de_reserva_y_recarga_al_reservar', async () => {
    mockApi();
    renderDetail();
    await screen.findByText('Quedan 18 de 20 lugares');
    expect(screen.getByRole('heading', { name: 'Reservar un lugar' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'Zoe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reservar a Zoe Méndez' }));

    await waitFor(() => expect(llamadasAlDetalle()).toBe(2));
    const [, options] = globalThis.fetch.mock.calls.find(([, opciones]) => opciones?.method === 'POST');
    expect(JSON.parse(options.body)).toEqual({ id_clase: 7, fecha_sesion: '2026-10-20', id_cliente: 50 });
  });

  it('no_ofrece_reservar_en_una_sesion_terminada', async () => {
    mockApi('terminada');
    renderDetail();
    await screen.findByText('Quedan 18 de 20 lugares');
    expect(screen.queryByRole('heading', { name: 'Reservar un lugar' })).not.toBeInTheDocument();
    expect(screen.getByText('La clase ya terminó.')).toBeInTheDocument();
  });
});
