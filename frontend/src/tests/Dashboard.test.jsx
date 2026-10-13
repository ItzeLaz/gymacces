import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard.jsx';

const MOTIVOS_EN_CERO = {
  rostro_no_identificado: 0,
  cliente_inactivo: 0,
  sin_membresia_vigente: 0,
  membresia_vencida: 0,
  membresia_suspendida: 0,
  membresia_cancelada: 0,
};

const DATA = {
  periodo: { tipo: 'mes', desde: '2026-10-01', hasta: '2026-10-12' },
  generado_en: '2026-10-12T18:30:05.120Z',
  clientes: { activos: 412, inactivos: 37 },
  membresias: { vigentes: 365, vencidas: 41, por_vencer: 18 },
  por_vencer: [{ id_cliente: 15, nombre: 'Luis', apellido: 'Pérez', tipo: 'Mensual', fecha_fin: '2026-10-13' }],
  pagos: { cantidad: 290, ingresos: '128450.00' },
  adeudo_total: '9350.00',
  accesos: { autorizados: 3120, rechazados: 84, rechazos_por_motivo: { ...MOTIVOS_EN_CERO, membresia_vencida: 25 } },
  rechazos_recientes: [
    { id_acceso: 2, fecha_hora: '2026-10-12T16:20:01.120Z', cliente: null, motivo: 'rostro_no_identificado' },
  ],
  tendencia: [],
};

const EMPTY = {
  ...DATA,
  clientes: { activos: 0, inactivos: 0 },
  membresias: { vigentes: 0, vencidas: 0, por_vencer: 0 },
  por_vencer: [],
  pagos: { cantidad: 0, ingresos: '0.00' },
  adeudo_total: '0.00',
  accesos: { autorizados: 0, rechazados: 0, rechazos_por_motivo: MOTIVOS_EN_CERO },
  rechazos_recientes: [],
};

function mockApi(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('dashboard administrativo', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('muestra_los_indicadores_en_texto', async () => {
    mockApi(200, { data: DATA });
    renderDashboard();

    expect(await screen.findByText('Clientes con membresía vigente')).toBeInTheDocument();
    expect(screen.getByText('365')).toBeInTheDocument();
    expect(screen.getByText('412')).toBeInTheDocument();
    expect(screen.getByText('$128,450.00')).toBeInTheDocument();
    expect(screen.getByText('$9,350.00')).toBeInTheDocument();
  });

  it('lista_membresias_por_vencer_y_rechazos_recientes', async () => {
    mockApi(200, { data: DATA });
    renderDashboard();

    expect(await screen.findByRole('link', { name: 'Luis Pérez' })).toHaveAttribute('href', '/clients/15');
    expect(screen.getByText('13 de octubre de 2026')).toBeInTheDocument();
    expect(screen.getByText('No identificado')).toBeInTheDocument();
    expect(screen.getAllByText('Rostro no identificado').length).toBeGreaterThan(0);
  });

  it('avisa_cuando_todavia_no_hay_datos', async () => {
    mockApi(200, { data: EMPTY });
    renderDashboard();
    expect(await screen.findByText('Todavía no hay datos para mostrar.')).toBeInTheDocument();
  });

  it('muestra_el_error_en_espanol_sin_cifras', async () => {
    mockApi(500, { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.' } });
    renderDashboard();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.');
    expect(screen.queryByText('Clientes con membresía vigente')).not.toBeInTheDocument();
  });
});
