import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { resetTestDatabase, createUser, createClientUser, closePool } from './helpers/db.js';
import { createMembershipType } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

describe('tipos de membresía', () => {
  let adminToken;
  let recepToken;
  let trainerToken;
  let clientToken;

  before(async () => {
    await resetTestDatabase();
    adminToken = tokenFor(await createUser({ rol: 'administrador' }));
    recepToken = tokenFor(await createUser({ rol: 'recepcionista' }));
    trainerToken = tokenFor(await createUser({ rol: 'entrenador' }));
    clientToken = tokenFor((await createClientUser()).usuario);
  });

  after(closePool);

  const post = (body, token = adminToken) =>
    request(app).post('/api/membership-types').set(bearer(token)).send(body);

  it('admin_registra_tipo_valido_activo_y_lo_audita', async () => {
    const response = await post({
      nombre: 'Mensual',
      descripcion: 'Acceso libre 30 días',
      duracion_dias: 30,
      precio: '450.00',
    });

    assert.equal(response.status, 201, 'el registro válido debe responder 201');
    assert.equal(response.body.data.estado, 'activo');
    assert.equal(response.body.data.precio, '450.00', 'el precio viaja como texto con 2 decimales');
    const [audit] = await pool.execute(
      "SELECT accion FROM auditoria WHERE entidad = 'tipos_membresia' AND id_registro = ?",
      [response.body.data.id_tipo_membresia],
    );
    assert.deepEqual(audit.map((row) => row.accion), ['tipo_membresia.crear']);
  });

  it('rechaza_nombre_duplicado_sin_distinguir_mayusculas', async () => {
    const response = await post({ nombre: 'MENSUAL', duracion_dias: 30, precio: '100.00' });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.message, 'Ya existe un tipo de membresía con ese nombre.');
  });

  it('rechaza_duracion_cero_y_precio_negativo_indicando_los_campos', async () => {
    const response = await post({ nombre: 'Inválido', duracion_dias: 0, precio: '-5' });
    assert.equal(response.status, 400);
    const campos = response.body.error.details.map((detail) => detail.field).sort();
    assert.deepEqual(campos, ['duracion_dias', 'precio']);
  });

  it('rechaza_precio_con_mas_de_dos_decimales', async () => {
    const response = await post({ nombre: 'Decimales', duracion_dias: 7, precio: '10.999' });
    assert.equal(response.status, 400);
  });

  it('admin_modifica_el_precio_de_un_tipo', async () => {
    const tipo = await createMembershipType({ nombre: 'Semanal', duracion_dias: 7, precio: '150.00' });
    const response = await request(app)
      .patch(`/api/membership-types/${tipo.id_tipo_membresia}`)
      .set(bearer(adminToken))
      .send({ precio: '175.50' });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.precio, '175.50');
    assert.equal(response.body.data.duracion_dias, 7, 'no debe cambiar los campos no enviados');
  });

  it('admin_desactiva_un_tipo', async () => {
    const tipo = await createMembershipType();
    const response = await request(app)
      .patch(`/api/membership-types/${tipo.id_tipo_membresia}/status`)
      .set(bearer(adminToken))
      .send({ estado: 'inactivo' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.estado, 'inactivo');
  });

  it('recepcionista_lista_solo_tipos_activos_y_admin_ve_todos', async () => {
    await createMembershipType({ nombre: 'Antiguo', estado: 'inactivo' });

    const recep = await request(app).get('/api/membership-types?limit=100').set(bearer(recepToken));
    assert.equal(recep.status, 200);
    assert.ok(recep.body.data.length > 0);
    assert.ok(
      recep.body.data.every((tipo) => tipo.estado === 'activo'),
      'el recepcionista solo debe recibir tipos activos',
    );

    const recepFiltro = await request(app).get('/api/membership-types?estado=inactivo').set(bearer(recepToken));
    assert.ok(recepFiltro.body.data.every((tipo) => tipo.estado === 'activo'), 'el filtro se ignora para el recepcionista');

    const admin = await request(app).get('/api/membership-types?estado=inactivo').set(bearer(adminToken));
    assert.ok(admin.body.data.some((tipo) => tipo.nombre === 'Antiguo'), 'el admin debe ver los inactivos');
    assert.ok(admin.body.meta.total >= 1);
  });

  it('recepcionista_entrenador_y_cliente_no_pueden_crear_ni_modificar', async () => {
    const tipo = await createMembershipType();
    for (const token of [recepToken, trainerToken, clientToken]) {
      const creado = await post({ nombre: `Prohibido ${Math.random()}`, duracion_dias: 30, precio: '1.00' }, token);
      assert.equal(creado.status, 403, 'crear debe estar prohibido');
      const editado = await request(app)
        .patch(`/api/membership-types/${tipo.id_tipo_membresia}`)
        .set(bearer(token))
        .send({ precio: '1.00' });
      assert.equal(editado.status, 403, 'modificar debe estar prohibido');
    }
    for (const token of [trainerToken, clientToken]) {
      const lista = await request(app).get('/api/membership-types').set(bearer(token));
      assert.equal(lista.status, 403, 'entrenador y cliente no consultan el catálogo');
    }
  });

  it('no_existe_borrado_de_tipos', async () => {
    const tipo = await createMembershipType();
    const response = await request(app)
      .delete(`/api/membership-types/${tipo.id_tipo_membresia}`)
      .set(bearer(adminToken));
    assert.equal(response.status, 404);
  });

  it('modificar_tipo_inexistente_responde_404', async () => {
    const response = await request(app)
      .patch('/api/membership-types/99999')
      .set(bearer(adminToken))
      .send({ precio: '10.00' });
    assert.equal(response.status, 404);
  });
});
