import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MembershipTypeForm from '../pages/MembershipTypeForm.jsx';

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/membership-types/new']}>
      <Routes>
        <Route path="/membership-types/new" element={<MembershipTypeForm />} />
        <Route path="/membership-types" element={<p>Catálogo de tipos</p>} />
      </Routes>
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

function fill(values) {
  Object.entries(values).forEach(([label, value]) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } }),
  );
}

describe('formulario de tipos de membresía', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('marca_los_campos_obligatorios_sin_llamar_a_la_api', async () => {
    mockFetch(201, {});
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El nombre debe tener entre 2 y 80 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('La duración debe ser un número entero de días mayor a cero.')).toBeInTheDocument();
    expect(screen.getByText('El precio debe ser un monto no negativo con hasta 2 decimales.')).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rechaza_duracion_decimal_y_precio_negativo', async () => {
    mockFetch(201, {});
    renderForm();
    fill({ Nombre: 'Mensual', 'Duración (días)': '2.5', Precio: '-10' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('La duración debe ser un número entero de días mayor a cero.')).toBeInTheDocument();
    expect(screen.getByText('El precio debe ser un monto no negativo con hasta 2 decimales.')).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('guarda_un_tipo_valido_y_vuelve_al_catalogo', async () => {
    mockFetch(201, {
      data: { id_tipo_membresia: 1, nombre: 'Mensual', duracion_dias: 30, precio: '450.00', estado: 'activo' },
    });
    renderForm();
    fill({ Nombre: 'Mensual', 'Duración (días)': '30', Precio: '450' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Catálogo de tipos')).toBeInTheDocument();
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ nombre: 'Mensual', duracion_dias: 30, precio: '450.00' });
  });
});
