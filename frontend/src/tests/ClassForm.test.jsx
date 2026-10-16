import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ClassForm from '../pages/ClassForm.jsx';

const INSTRUCTORES = [
  { id_usuario: 12, nombre: 'Carla Ruiz' },
  { id_usuario: 15, nombre: 'Luis Pérez' },
];

function CatalogoFalso() {
  const location = useLocation();
  return <p>Catálogo: {location.state?.message}</p>;
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/classes/new']}>
      <Routes>
        <Route path="/classes/new" element={<ClassForm />} />
        <Route path="/classes" element={<CatalogoFalso />} />
      </Routes>
    </MemoryRouter>,
  );
}

const respuesta = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

// La API simulada responde según la ruta: instructores con GET y el alta con POST
function mockApi(postStatus, postBody) {
  globalThis.fetch = vi.fn((url, options = {}) => {
    if (String(url).endsWith('/classes/instructors')) return Promise.resolve(respuesta(200, { data: INSTRUCTORES }));
    if (options.method === 'POST') return Promise.resolve(respuesta(postStatus, postBody));
    return Promise.resolve(respuesta(404, { error: { code: 'NOT_FOUND', message: 'No existe.' } }));
  });
}

async function fillValid() {
  await screen.findByRole('option', { name: 'Carla Ruiz' });
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Spinning' } });
  fireEvent.change(screen.getByLabelText('Instructor'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Día de la semana'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '07:00' } });
  fireEvent.change(screen.getByLabelText('Duración (minutos)'), { target: { value: '45' } });
  fireEvent.change(screen.getByLabelText('Cupo máximo'), { target: { value: '20' } });
}

describe('formulario de clases grupales', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('muestra_solo_los_entrenadores_activos_en_el_selector', async () => {
    mockApi(201, {});
    renderForm();
    const selector = screen.getByLabelText('Instructor');
    await screen.findByRole('option', { name: 'Carla Ruiz' });
    const opciones = within(selector)
      .getAllByRole('option')
      .map((opcion) => opcion.textContent);
    expect(opciones).toEqual(['Elige un instructor', 'Carla Ruiz', 'Luis Pérez']);
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain('/classes/instructors');
  });

  it('envia_la_clase_y_muestra_clase_registrada', async () => {
    mockApi(201, { data: { id_clase: 7 }, message: 'Clase registrada.' });
    renderForm();
    await fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Catálogo: Clase registrada.')).toBeInTheDocument();
    const [, options] = globalThis.fetch.mock.calls.find(([, opciones]) => opciones?.method === 'POST');
    expect(JSON.parse(options.body)).toEqual({
      nombre: 'Spinning',
      id_instructor: 12,
      dia_semana: 1,
      hora_inicio: '07:00',
      duracion_minutos: 45,
      cupo_maximo: 20,
    });
  });

  it('muestra_el_mensaje_de_error_del_servidor', async () => {
    mockApi(422, { error: { code: 'BUSINESS_RULE', message: 'El instructor ya tiene una clase en ese horario.' } });
    renderForm();
    await fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El instructor ya tiene una clase en ese horario.')).toBeInTheDocument();
  });

  it('valida_duracion_cupo_y_fin_del_dia_sin_llamar_al_servidor', async () => {
    mockApi(201, {});
    renderForm();
    await fillValid();
    fireEvent.change(screen.getByLabelText('Duración (minutos)'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Cupo máximo'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('La duración debe estar entre 15 y 240 minutos.')).toBeInTheDocument();
    expect(screen.getByText('El cupo debe estar entre 1 y 100 lugares.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Duración (minutos)'), { target: { value: '45' } });
    fireEvent.change(screen.getByLabelText('Cupo máximo'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '23:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('La clase debe terminar el mismo día.')).toBeInTheDocument();
    expect(globalThis.fetch.mock.calls.some(([, opciones]) => opciones?.method === 'POST')).toBe(false);
  });

  it('muestra_los_dias_en_espanol', async () => {
    mockApi(201, {});
    renderForm();
    const dias = within(screen.getByLabelText('Día de la semana'))
      .getAllByRole('option')
      .map((opcion) => opcion.textContent);
    expect(dias).toEqual(['Elige un día', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
    await screen.findByRole('option', { name: 'Carla Ruiz' });
  });
});
