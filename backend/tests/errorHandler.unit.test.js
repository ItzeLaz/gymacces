import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../src/middlewares/errorHandler.js';

// Criterio US2-13 (FR-013): un error no previsto responde con un mensaje genérico, sin detalles técnicos
describe('manejador central de errores', () => {
  it('error_no_previsto_responde_500_con_mensaje_generico_sin_detalles_tecnicos', async () => {
    const app = express();
    app.get('/falla', () => {
      throw new Error('ER_PARSE_ERROR: SELECT * FROM reservas WHERE id_reserva = 1');
    });
    app.use(errorHandler);

    // El detalle solo se registra en el servidor; se silencia para no ensuciar la salida de las pruebas
    const registro = mock.method(console, 'error', () => {});
    try {
      const response = await request(app).get('/falla');

      assert.equal(response.status, 500);
      assert.deepEqual(response.body, {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
        },
      });
      const cuerpo = JSON.stringify(response.body);
      for (const prohibido of ['SELECT', 'reservas', 'ER_', 'stack']) {
        assert.ok(!cuerpo.includes(prohibido), `la respuesta no debe incluir "${prohibido}"`);
      }
      assert.equal(registro.mock.callCount(), 1, 'el error se registra una vez en el servidor');
    } finally {
      registro.mock.restore();
    }
  });
});
