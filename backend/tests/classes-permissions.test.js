import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { resetTestDatabase, createUser, createClientUser, closePool } from './helpers/db.js';
import { createClass, createTrainer } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

const FORBIDDEN = 'No tienes permiso para realizar esta acción.';

// Permisos de las clases grupales para los cuatro roles (FR-011, SC-006)
describe('clases grupales: permisos por rol', () => {
  let tokens;
  let entrenador;
  let clase;

  before(async () => {
    await resetTestDatabase();
    entrenador = await createTrainer();
    clase = await createClass({ id_instructor: entrenador.id_usuario });
    tokens = {
      recepcionista: tokenFor(await createUser({ rol: 'recepcionista' })),
      entrenador: tokenFor(entrenador),
      cliente: tokenFor((await createClientUser()).usuario),
    };
  });

  after(closePool);

  const escrituras = () => [
    ['POST /classes', (token) => request(app).post('/api/classes').set(bearer(token)).send({ nombre: 'Yoga' })],
    ['PATCH /classes/:id', (token) => request(app).patch(`/api/classes/${clase.id_clase}`).set(bearer(token)).send({ nombre: 'Yoga' })],
    [
      'PATCH /classes/:id/status',
      (token) => request(app).patch(`/api/classes/${clase.id_clase}/status`).set(bearer(token)).send({ estado: 'inactiva' }),
    ],
    ['GET /classes/instructors', (token) => request(app).get('/api/classes/instructors').set(bearer(token))],
  ];

  it('solo_el_administrador_registra_modifica_o_desactiva_clases', async () => {
    for (const [rol, token] of Object.entries(tokens)) {
      for (const [ruta, enviar] of escrituras()) {
        const response = await enviar(token);
        assert.equal(response.status, 403, `${rol} debe recibir 403 en ${ruta}`);
        assert.equal(response.body.error.message, FORBIDDEN);
      }
    }
  });

  it('entrenador_y_cliente_no_consultan_el_catalogo_de_clases', async () => {
    for (const rol of ['entrenador', 'cliente']) {
      const response = await request(app).get('/api/classes').set(bearer(tokens[rol]));
      assert.equal(response.status, 403, `${rol} debe recibir 403 en GET /classes`);
    }
  });

  it('sin_sesion_las_rutas_de_clases_responden_401', async () => {
    for (const [ruta, enviar] of escrituras()) {
      const response = await enviar(undefined);
      assert.equal(response.status, 401, `${ruta} sin token debe responder 401`);
    }
    const lista = await request(app).get('/api/classes');
    assert.equal(lista.status, 401);
  });
});
