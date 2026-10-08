import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { resetTestDatabase, createUser, createClientUser, closePool } from './helpers/db.js';
import { tokenFor, bearer } from './helpers/auth.js';

describe('registro y modificación de clientes', () => {
  let adminToken;
  let recepToken;

  before(async () => {
    await resetTestDatabase();
    adminToken = tokenFor(await createUser({ rol: 'administrador' }));
    recepToken = tokenFor(await createUser({ rol: 'recepcionista' }));
  });

  after(closePool);

  const post = (body, token = recepToken) =>
    request(app).post('/api/clients').set(bearer(token)).send(body);

  it('recepcionista_registra_cliente_con_fecha_y_estado_activo', async () => {
    const response = await post({
      nombre: 'Luis',
      apellido: 'Pérez',
      correo: 'luis@correo.com',
      telefono: '5512345678',
      direccion: 'Calle 1 #23',
    });

    assert.equal(response.status, 201, 'el registro válido debe responder 201');
    assert.equal(response.body.data.estado, 'activo');
    assert.ok(response.body.data.fecha_registro, 'debe asignar la fecha de registro');
    assert.equal(response.body.data.apellido, 'Pérez', 'debe conservar las tildes');
  });

  it('administrador_registra_cliente_sin_correo_ni_direccion', async () => {
    const response = await post({ nombre: 'Ana', apellido: 'Núñez', telefono: '+52 55 1234 5678' }, adminToken);
    assert.equal(response.status, 201);
    assert.equal(response.body.data.correo, null);
    assert.equal(response.body.data.direccion, null);
  });

  it('rechaza_cliente_sin_nombre_apellido_o_telefono_indicando_los_campos', async () => {
    const response = await post({ correo: 'faltan@correo.com' });
    assert.equal(response.status, 400);
    const campos = response.body.error.details.map((detail) => detail.field).sort();
    assert.deepEqual(campos, ['apellido', 'nombre', 'telefono']);
  });

  it('rechaza_telefono_con_formato_invalido', async () => {
    for (const telefono of ['123', 'abcdefghij', '5512345678901234', '55+12345678']) {
      const response = await post({ nombre: 'X', apellido: 'Y', telefono });
      assert.equal(response.status, 400, `el teléfono "${telefono}" debe rechazarse`);
      assert.equal(response.body.error.details[0].field, 'telefono');
    }
  });

  it('rechaza_correo_de_cliente_duplicado_con_409', async () => {
    const response = await post({ nombre: 'Otro', apellido: 'Luis', correo: 'LUIS@correo.com', telefono: '5598765432' });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.message, 'Ya existe un cliente con ese correo.');
  });

  it('recorta_espacios_y_guarda_correo_en_minusculas', async () => {
    const response = await post({ nombre: '  Marta ', apellido: ' Ríos  ', correo: ' Marta@Correo.COM ', telefono: ' 5511112222 ' });
    assert.equal(response.status, 201);
    assert.equal(response.body.data.nombre, 'Marta');
    assert.equal(response.body.data.apellido, 'Ríos');
    assert.equal(response.body.data.correo, 'marta@correo.com');
    assert.equal(response.body.data.telefono, '5511112222');
  });

  it('modifica_datos_del_cliente', async () => {
    const creado = await post({ nombre: 'Pedro', apellido: 'Gómez', telefono: '5500000000' });
    const response = await request(app)
      .patch(`/api/clients/${creado.body.data.id_cliente}`)
      .set(bearer(recepToken))
      .send({ telefono: '5599999999', direccion: 'Av. Siempre Viva 742' });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.telefono, '5599999999');
    assert.equal(response.body.data.direccion, 'Av. Siempre Viva 742');
    assert.equal(response.body.data.nombre, 'Pedro', 'los campos no enviados se conservan');
  });

  it('rechaza_cambios_a_fecha_registro_y_estado_en_patch', async () => {
    const creado = await post({ nombre: 'Rosa', apellido: 'Luna', telefono: '5533334444' });
    const response = await request(app)
      .patch(`/api/clients/${creado.body.data.id_cliente}`)
      .set(bearer(recepToken))
      .send({ estado: 'inactivo', fecha_registro: '2020-01-01' });
    assert.equal(response.status, 400);
  });

  it('modificar_cliente_inexistente_responde_404', async () => {
    const response = await request(app).patch('/api/clients/99999').set(bearer(recepToken)).send({ nombre: 'X' });
    assert.equal(response.status, 404);
  });

  it('cambia_estado_a_inactivo_sin_borrar_el_registro', async () => {
    const creado = await post({ nombre: 'Iván', apellido: 'Soto', telefono: '5544445555' });
    const id = creado.body.data.id_cliente;
    const response = await request(app)
      .patch(`/api/clients/${id}/status`)
      .set(bearer(recepToken))
      .send({ estado: 'inactivo' });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.estado, 'inactivo');
    const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM clientes WHERE id_cliente = ?', [id]);
    assert.equal(rows[0].total, 1, 'el cliente debe conservarse');
  });

  it('registrar_cliente_no_crea_cuenta_de_usuario', async () => {
    const [antes] = await pool.execute('SELECT COUNT(*) AS total FROM usuarios');
    await post({ nombre: 'Sin', apellido: 'Cuenta', correo: 'sincuenta@correo.com', telefono: '5566667777' });
    const [despues] = await pool.execute('SELECT COUNT(*) AS total FROM usuarios');
    assert.equal(despues[0].total, antes[0].total, 'no debe crearse ningún usuario');
  });

  it('entrenador_y_cliente_reciben_403_al_registrar_modificar_o_cambiar_estado', async () => {
    const entrenador = await createUser({ rol: 'entrenador' });
    const { usuario: cliente, cliente: registro } = await createClientUser();

    for (const usuario of [entrenador, cliente]) {
      const token = tokenFor(usuario);
      const respuestas = await Promise.all([
        request(app).post('/api/clients').set(bearer(token)).send({ nombre: 'X', apellido: 'Y', telefono: '5512345678' }),
        request(app).patch(`/api/clients/${registro.id_cliente}`).set(bearer(token)).send({ nombre: 'X' }),
        request(app).patch(`/api/clients/${registro.id_cliente}/status`).set(bearer(token)).send({ estado: 'inactivo' }),
      ]);
      respuestas.forEach((response) =>
        assert.equal(response.status, 403, `el rol ${usuario.rol} no debe modificar clientes`),
      );
    }
  });
});
