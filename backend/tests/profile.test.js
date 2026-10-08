import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import { tokenFor, bearer } from './helpers/auth.js';

describe('información propia del cliente', () => {
  let propio;
  let token;
  let otro;

  before(async () => {
    await resetTestDatabase();
    const resultado = await createClientUser({ nombre: 'Luis', apellido: 'Pérez', correo: 'luis@correo.com' });
    propio = resultado.cliente;
    token = tokenFor(resultado.usuario);
    otro = await createClient({ nombre: 'Otra', apellido: 'Persona' });
  });

  after(closePool);

  it('cliente_consulta_su_perfil_con_membresia_y_pagos_en_null', async () => {
    const response = await request(app).get('/api/clients/me').set(bearer(token));
    assert.equal(response.status, 200);
    assert.equal(response.body.data.cliente.id_cliente, propio.id_cliente);
    assert.equal(response.body.data.cliente.apellido, 'Pérez');
    assert.equal(response.body.data.membresia, null, 'la membresía llega en el Sprint 2');
    assert.equal(response.body.data.pagos, null, 'los pagos llegan en el Sprint 2');
  });

  it('el_perfil_usa_el_id_cliente_del_token_e_ignora_parametros_enviados', async () => {
    const response = await request(app)
      .get(`/api/clients/me?id_cliente=${otro.id_cliente}`)
      .set(bearer(token));
    assert.equal(response.body.data.cliente.id_cliente, propio.id_cliente);
  });

  it('cliente_recibe_403_al_consultar_otro_cliente_por_id', async () => {
    const response = await request(app).get(`/api/clients/${otro.id_cliente}`).set(bearer(token));
    assert.equal(response.status, 403);
  });

  it('personal_recibe_403_en_clients_me', async () => {
    for (const rol of ['administrador', 'recepcionista', 'entrenador']) {
      const usuario = await createUser({ rol });
      const response = await request(app).get('/api/clients/me').set(bearer(tokenFor(usuario)));
      assert.equal(response.status, 403, `el rol ${rol} no tiene perfil de cliente`);
    }
  });

  it('cliente_vinculado_a_cliente_inactivo_puede_consultar_su_perfil', async () => {
    const { usuario } = await createClientUser({ estado: 'inactivo' });
    const response = await request(app).get('/api/clients/me').set(bearer(tokenFor(usuario)));
    assert.equal(response.status, 200);
    assert.equal(response.body.data.cliente.estado, 'inactivo');
  });
});
