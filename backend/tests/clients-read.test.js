import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import { tokenFor, bearer } from './helpers/auth.js';

const BASIC_FIELDS = ['apellido', 'estado', 'id_cliente', 'nombre'];

describe('consulta de clientes por el personal', () => {
  let recepToken;
  let entrenadorToken;
  let clienteToken;
  let ana;

  before(async () => {
    await resetTestDatabase();
    recepToken = tokenFor(await createUser({ rol: 'recepcionista' }));
    entrenadorToken = tokenFor(await createUser({ rol: 'entrenador' }));
    ana = await createClient({ nombre: 'Ana', apellido: 'Zamora', correo: 'ana.zamora@correo.com' });
    await createClient({ nombre: 'Bruno', apellido: 'Álvarez', correo: 'bruno@correo.com' });
    await createClient({ nombre: 'Carla', apellido: 'Méndez', correo: null, estado: 'inactivo' });
    const { usuario } = await createClientUser({ nombre: 'Diego', apellido: 'Ortiz' });
    clienteToken = tokenFor(usuario);
  });

  after(closePool);

  const get = (path, token = recepToken) => request(app).get(path).set(bearer(token));

  it('recepcionista_lista_clientes_con_todos_los_campos_ordenados_por_apellido_y_nombre', async () => {
    const response = await get('/api/clients');
    assert.equal(response.status, 200);
    assert.equal(response.body.meta.total, 4);
    const apellidos = response.body.data.map((cliente) => cliente.apellido);
    assert.deepEqual(apellidos, ['Álvarez', 'Méndez', 'Ortiz', 'Zamora'], 'debe ordenar por apellido');
    assert.ok('telefono' in response.body.data[0], 'el personal de recepción ve todos los campos');
  });

  it('busca_por_nombre_apellido_o_correo_parcial', async () => {
    const porNombre = await get('/api/clients?search=ana');
    const porApellido = await get('/api/clients?search=zamo');
    const porCorreo = await get('/api/clients?search=bruno@');
    assert.ok(porNombre.body.data.some((cliente) => cliente.id_cliente === ana.id_cliente));
    assert.equal(porApellido.body.data.length, 1);
    assert.equal(porCorreo.body.data[0].nombre, 'Bruno');
  });

  it('filtra_por_estado', async () => {
    const response = await get('/api/clients?estado=inactivo');
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].nombre, 'Carla');
  });

  it('busqueda_sin_resultados_devuelve_lista_vacia_con_200', async () => {
    const response = await get('/api/clients?search=inexistente');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, []);
    assert.equal(response.body.meta.total, 0);
  });

  it('pagina_resultados_con_limit_maximo_100', async () => {
    const pagina = await get('/api/clients?limit=2&page=2');
    assert.equal(pagina.body.data.length, 2);
    assert.equal(pagina.body.meta.page, 2);

    const excedido = await get('/api/clients?limit=101');
    assert.equal(excedido.status, 400, 'un límite mayor a 100 debe rechazarse');
  });

  it('entrenador_recibe_solo_id_nombre_apellido_y_estado_en_listado_y_detalle', async () => {
    const listado = await get('/api/clients', entrenadorToken);
    assert.equal(listado.status, 200);
    listado.body.data.forEach((cliente) =>
      assert.deepEqual(Object.keys(cliente).sort(), BASIC_FIELDS, 'el entrenador solo ve datos básicos'),
    );

    const detalle = await get(`/api/clients/${ana.id_cliente}`, entrenadorToken);
    assert.equal(detalle.status, 200);
    assert.deepEqual(Object.keys(detalle.body.data).sort(), BASIC_FIELDS);
  });

  it('detalle_de_cliente_inexistente_responde_404', async () => {
    const response = await get('/api/clients/99999');
    assert.equal(response.status, 404);
  });

  it('usuario_cliente_recibe_403_en_listado_y_detalle', async () => {
    const listado = await get('/api/clients', clienteToken);
    const detalle = await get(`/api/clients/${ana.id_cliente}`, clienteToken);
    assert.equal(listado.status, 403);
    assert.equal(detalle.status, 403);
  });
});
