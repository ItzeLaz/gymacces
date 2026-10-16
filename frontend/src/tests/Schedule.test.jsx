import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Schedule from '../pages/Schedule.jsx';

const instructor = { id_usuario: 12, nombre: 'Carla Ruiz' };
const SESIONES = [
  {
    id_clase: 3, nombre: 'Yoga', instructor, fecha_sesion: '2026-10-19', hora_inicio: '07:00', hora_fin: '07:45',
    cupo_maximo: 10, reservas_activas: 0, lugares_disponibles: 10, llena: false, estado_sesion: 'terminada',
  },
  {
    id_clase: 9, nombre: 'Funcional', instructor, fecha_sesion: '2026-10-20', hora_inicio: '07:00', hora_fin: '07:45',
    cupo_maximo: 1, reservas_activas: 1, lugares_disponibles: 0, llena: true, estado_sesion: 'pendiente',
  },
  {
    id_clase: 7, nombre: 'Spinning', instructor, fecha_sesion: '2026-10-20', hora_inicio: '18:00', hora_fin: '18:45',
    cupo_maximo: 20, reservas_activas: 3, lugares_disponibles: 17, llena: false, estado_sesion: 'pendiente',
  },
];

function renderSchedule(sesiones = SESIONES) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: sesiones }) }),
  );
  return render(
    <MemoryRouter>
      <Schedule />
    </MemoryRouter>,
  );
}

describe('horario de clases', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('agrupa_las_sesiones_por_dia_y_muestra_los_lugares', async () => {
    renderSchedule();
    const lunes = await screen.findByRole('heading', { name: 'Lunes 19 de octubre de 2026' });
    const martes = screen.getByRole('heading', { name: 'Martes 20 de octubre de 2026' });
    expect(lunes).toBeInTheDocument();
    expect(martes).toBeInTheDocument();
    const dia = martes.closest('section');
    expect(within(dia).getByText('Quedan 17 de 20 lugares')).toBeInTheDocument();
    expect(within(dia).getByText('18:00–18:45')).toBeInTheDocument();
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain('/classes/schedule');
  });

  it('muestra_la_etiqueta_llena_en_texto', async () => {
    renderSchedule();
    const funcional = (await screen.findByText('Funcional')).closest('li');
    expect(within(funcional).getByText('Llena')).toBeInTheDocument();
    expect(within(funcional).queryByText(/Quedan/)).not.toBeInTheDocument();
  });

  it('cada_sesion_enlaza_a_su_detalle', async () => {
    renderSchedule();
    const enlace = (await screen.findByText('Spinning')).closest('a');
    expect(enlace).toHaveAttribute('href', '/schedule/7/2026-10-20');
  });

  it('muestra_un_estado_vacio_si_no_hay_sesiones', async () => {
    renderSchedule([]);
    expect(await screen.findByText('No hay clases programadas en los próximos 7 días.')).toBeInTheDocument();
  });
});
