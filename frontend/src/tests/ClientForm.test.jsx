import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ClientForm from '../pages/ClientForm.jsx';

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/clients/new']}>
      <Routes>
        <Route path="/clients/new" element={<ClientForm />} />
        <Route path="/clients/:id" element={<p>Detalle del cliente</p>} />
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

describe('formulario de clientes', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('marca_los_campos_obligatorios_vacios_sin_llamar_a_la_api', async () => {
    mockFetch(201, {});
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El apellido es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El teléfono es obligatorio.')).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('muestra_los_errores_por_campo_devueltos_por_el_servidor', async () => {
    mockFetch(409, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos marcados.',
        details: [{ field: 'correo', message: 'Ya existe un cliente con ese correo.' }],
      },
    });
    renderForm();
    fill({ Nombre: 'Luis', Apellido: 'Pérez', Teléfono: '5512345678', 'Correo (opcional)': 'luis@correo.com' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Ya existe un cliente con ese correo.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los datos marcados.');
  });

  it('redirige_al_detalle_tras_guardar_correctamente', async () => {
    mockFetch(201, { data: { id_cliente: 7, nombre: 'Luis', apellido: 'Pérez', estado: 'activo' } });
    renderForm();
    fill({ Nombre: 'Luis', Apellido: 'Pérez', Teléfono: '5512345678' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Detalle del cliente')).toBeInTheDocument();
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ nombre: 'Luis', apellido: 'Pérez', telefono: '5512345678' });
  });
});
