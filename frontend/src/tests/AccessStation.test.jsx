import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccessStation from '../pages/AccessStation.jsx';
import { analyzeFrame } from '../face/faceEngine.js';

vi.mock('../face/faceEngine.js', () => ({
  loadFaceEngine: vi.fn().mockResolvedValue({}),
  analyzeFrame: vi.fn(),
}));

// Tiempos cortos para que el ciclo de la estación corra rápido en las pruebas
const TIMING = { intervalMs: 5, stableMs: 0, resultMs: 30, noValidMs: 50 };
const DESCRIPTOR = new Array(1024).fill(0.01);

function mockCamera() {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
  });
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
}

function mockAttempt(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const posts = () => globalThis.fetch.mock.calls.filter(([, options]) => options?.method === 'POST');

function renderStation() {
  return render(
    <MemoryRouter>
      <AccessStation timing={TIMING} />
    </MemoryRouter>,
  );
}

describe('estación de acceso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCamera();
  });

  it('muestra_el_acceso_autorizado_y_no_repite_mientras_el_rostro_siga_presente', async () => {
    analyzeFrame.mockResolvedValue({ status: 'ok', descriptor: DESCRIPTOR, message: '' });
    mockAttempt(200, {
      data: { id_acceso: 1, resultado: 'autorizado', cliente: { nombre: 'Luis' }, mensaje: 'Acceso autorizado. ¡Bienvenido, Luis!' },
    });
    renderStation();

    const resultado = await screen.findByText('Acceso autorizado. ¡Bienvenido, Luis!');
    expect(resultado.closest('.station-result')).toHaveClass('station-authorized');

    // El rostro sigue frente a la cámara después de mostrar el resultado
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(posts()).toHaveLength(1);
  });

  it('muestra_el_rechazo_sin_datos_personales', async () => {
    analyzeFrame.mockResolvedValue({ status: 'ok', descriptor: DESCRIPTOR, message: '' });
    mockAttempt(200, {
      data: { id_acceso: 2, resultado: 'rechazado', cliente: null, mensaje: 'Acceso no autorizado. Acude a recepción.' },
    });
    renderStation();

    const resultado = await screen.findByText('Acceso no autorizado. Acude a recepción.');
    expect(resultado.closest('.station-result')).toHaveClass('station-rejected');
  });

  it('si_la_api_falla_nunca_muestra_autorizado', async () => {
    analyzeFrame.mockResolvedValue({ status: 'ok', descriptor: DESCRIPTOR, message: '' });
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('sin red'));
    renderStation();

    expect(
      await screen.findByText('No fue posible validar el acceso. Intenta de nuevo o acude a recepción.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Acceso autorizado/)).not.toBeInTheDocument();
  });

  it('registra_un_intento_sin_descriptor_si_no_logra_una_captura_valida', async () => {
    analyzeFrame.mockResolvedValue({ status: 'low_quality', descriptor: null, message: 'Mejora la iluminación.' });
    mockAttempt(200, {
      data: { id_acceso: 3, resultado: 'rechazado', cliente: null, mensaje: 'Acceso no autorizado. Acude a recepción.' },
    });
    renderStation();

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(posts()[0][1].body)).toEqual({ descriptor: null });
  });
});
