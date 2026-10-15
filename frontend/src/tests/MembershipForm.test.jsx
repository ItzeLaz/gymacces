import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MembershipForm from '../pages/MembershipForm.jsx';

const TYPES = [
  { id_tipo_membresia: 1, nombre: 'Mensual', duracion_dias: 30, precio: '450.00', estado: 'activo' },
  { id_tipo_membresia: 2, nombre: 'Antiguo', duracion_dias: 7, precio: '100.00', estado: 'inactivo' },
];

function response(status, body) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

// Responde según la ruta: el catálogo de tipos y la asignación
function mockApi(assignResult) {
  globalThis.fetch = vi.fn((url, options = {}) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/membership-types')) return response(200, { data: TYPES, meta: { page: 1, limit: 100, total: 2 } });
    if (path.endsWith('/memberships') && options.method === 'POST') return response(...assignResult);
    if (path.endsWith('/memberships')) return response(200, { data: { actual: null, historial: [] } });
    return response(404, { error: { code: 'NOT_FOUND', message: 'No existe.' } });
  });
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/clients/7/memberships/new']}>
      <Routes>
        <Route path="/clients/:id/memberships/new" element={<MembershipForm />} />
        <Route path="/clients/:id" element={<p>Ficha del cliente</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('formulario de asignación de membresía', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('solo_ofrece_tipos_activos_y_muestra_la_fecha_de_fin_calculada', async () => {
    mockApi([201, { data: {} }]);
    renderForm();

    const select = await screen.findByLabelText('Tipo de membresía');
    expect(screen.getByRole('option', { name: /Mensual/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Antiguo/ })).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2030-01-01' } });
    expect(await screen.findByText(/Termina el/)).toHaveTextContent('30 de enero de 2030');
  });

  it('muestra_en_espanol_el_error_de_traslape_del_servidor', async () => {
    mockApi([
      422,
      { error: { code: 'BUSINESS_RULE', message: 'El cliente ya tiene una membresía en ese periodo. Usa la renovación.' } },
    ]);
    renderForm();

    fireEvent.change(await screen.findByLabelText('Tipo de membresía'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Asignar membresía' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El cliente ya tiene una membresía en ese periodo. Usa la renovación.',
    );
  });

  it('exige_elegir_un_tipo_antes_de_enviar', async () => {
    mockApi([201, { data: {} }]);
    renderForm();
    await screen.findByLabelText('Tipo de membresía');
    fireEvent.click(screen.getByRole('button', { name: 'Asignar membresía' }));
    expect(await screen.findByText('Selecciona un tipo de membresía.')).toBeInTheDocument();
  });
});
