import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PaymentForm from '../pages/PaymentForm.jsx';

const ACCOUNT = {
  pagos: [],
  adeudo: '250.00',
  membresias: [
    {
      id_membresia: 41,
      tipo: { id_tipo_membresia: 1, nombre: 'Mensual' },
      fecha_inicio: '2030-01-01',
      fecha_fin: '2030-01-30',
      estado: 'activa',
      estado_efectivo: 'activa',
      monto: '450.00',
      pagado: '200.00',
      saldo: '250.00',
      estado_pago: 'parcial',
    },
  ],
};

function response(status, body) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

function mockApi(payResult) {
  globalThis.fetch = vi.fn((url, options = {}) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/payments') && options.method === 'POST') return response(...payResult);
    return response(200, { data: ACCOUNT });
  });
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/clients/7/payments/new']}>
      <Routes>
        <Route path="/clients/:id/payments/new" element={<PaymentForm />} />
        <Route path="/clients/:id" element={<p>Ficha del cliente</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('formulario de pagos', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('muestra_el_saldo_pendiente_y_lo_sugiere_como_monto', async () => {
    mockApi([201, { data: {} }]);
    renderForm();
    expect(await screen.findByText(/Saldo pendiente/)).toHaveTextContent('$250.00');
    expect(screen.getByLabelText('Monto')).toHaveValue('250.00');
  });

  it('no_envia_un_monto_mayor_al_saldo', async () => {
    mockApi([201, { data: {} }]);
    renderForm();
    fireEvent.change(await screen.findByLabelText('Monto'), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));

    expect(await screen.findByText('El monto no puede superar el saldo pendiente de $250.00.')).toBeInTheDocument();
    const posts = globalThis.fetch.mock.calls.filter(([, options]) => options?.method === 'POST');
    expect(posts).toHaveLength(0);
  });

  it('muestra_en_espanol_el_error_422_del_servidor', async () => {
    mockApi([422, { error: { code: 'BUSINESS_RULE', message: 'El monto supera el saldo pendiente de 100.00.' } }]);
    renderForm();
    await screen.findByLabelText('Monto');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El monto supera el saldo pendiente de 100.00.');
  });
});
