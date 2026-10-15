import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { closePool } from './helpers/db.js';

describe('salud de la API', () => {
  after(closePool);

  it('responde_ok_en_health', async () => {
    const response = await request(app).get('/api/health');
    assert.equal(response.status, 200, 'health debe responder 200');
    assert.deepEqual(response.body, { data: { status: 'ok' } });
  });

  it('ruta_inexistente_responde_404_sin_detalles_internos', async () => {
    const response = await request(app).get('/api/no-existe');
    assert.equal(response.status, 404, 'una ruta desconocida debe responder 404');
    assert.equal(response.body.error.code, 'NOT_FOUND');
    assert.equal(response.body.error.stack, undefined, 'no debe exponer la traza');
  });
});
