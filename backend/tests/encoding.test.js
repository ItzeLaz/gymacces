import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { resetTestDatabase, createUser, closePool } from './helpers/db.js';
import { tokenFor, bearer } from './helpers/auth.js';

const NOMBRE_CON_ACENTOS = 'Íñigo Peña Muñoz Sánchez Güémez';

describe('codificación utf8mb4 de extremo a extremo', () => {
  let adminToken;

  before(async () => {
    await resetTestDatabase();
    adminToken = tokenFor(await createUser({ rol: 'administrador' }));
  });

  after(closePool);

  it('todas_las_columnas_de_texto_usan_utf8mb4', async () => {
    const [columnas] = await pool.query(
      `SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND CHARACTER_SET_NAME IS NOT NULL AND CHARACTER_SET_NAME <> 'utf8mb4'`,
    );
    assert.deepEqual(columnas, [], 'ninguna columna de texto debe usar otro juego de caracteres');

    const [[conexion]] = await pool.query('SELECT @@character_set_client AS cliente, @@character_set_results AS resultados');
    assert.deepEqual(conexion, { cliente: 'utf8mb4', resultados: 'utf8mb4' }, 'la conexión debe usar utf8mb4');
  });

  it('guarda_y_muestra_nombre_de_usuario_con_acentos_y_enie', async () => {
    const creado = await request(app).post('/api/users').set(bearer(adminToken)).send({
      nombre: NOMBRE_CON_ACENTOS,
      correo: 'inigo@prueba.com',
      password: 'Recep2026',
      rol: 'recepcionista',
    });
    assert.equal(creado.status, 201, 'el alta debe responder 201');
    assert.equal(creado.body.data.nombre, NOMBRE_CON_ACENTOS, 'la respuesta debe conservar las tildes y la ñ');

    const [[fila]] = await pool.query('SELECT HEX(nombre) AS hex FROM usuarios WHERE correo = ?', ['inigo@prueba.com']);
    assert.equal(
      fila.hex,
      Buffer.from(NOMBRE_CON_ACENTOS, 'utf8').toString('hex').toUpperCase(),
      'la base debe guardar los bytes UTF-8 exactos',
    );

    const lista = await request(app).get('/api/users?search=Peña').set(bearer(adminToken));
    assert.equal(lista.status, 200);
    assert.equal(lista.body.data.length, 1, 'la búsqueda con ñ debe encontrar al usuario');
    assert.equal(lista.body.data[0].nombre, NOMBRE_CON_ACENTOS, 'la lista debe mostrar el nombre sin dañar');
  });

  it('guarda_y_muestra_cliente_con_acentos_y_enie', async () => {
    const creado = await request(app).post('/api/clients').set(bearer(adminToken)).send({
      nombre: 'José María',
      apellido: 'Ñúñez Ibáñez',
      telefono: '5512345678',
      direccion: 'Calle Peñón #5, Coyoacán',
    });
    assert.equal(creado.status, 201, 'el registro debe responder 201');

    const detalle = await request(app).get(`/api/clients/${creado.body.data.id_cliente}`).set(bearer(adminToken));
    assert.equal(detalle.body.data.nombre, 'José María');
    assert.equal(detalle.body.data.apellido, 'Ñúñez Ibáñez');
    assert.equal(detalle.body.data.direccion, 'Calle Peñón #5, Coyoacán');
  });

  it('rechaza_cuerpo_que_no_esta_en_utf8_sin_guardar_nada', async () => {
    // Así envía el cuerpo Invoke-RestMethod de Windows PowerShell 5.1: "é" como el byte 0xE9
    const cuerpo = Buffer.from(
      JSON.stringify({ nombre: 'Luis Pérez', correo: 'latin1@prueba.com', password: 'Recep2026', rol: 'entrenador' }),
      'latin1',
    );
    // supertest no envía un Buffer tal cual; se usa fetch para mandar los bytes exactos
    const server = app.listen(0);
    let response;
    let body;
    try {
      response = await fetch(`http://127.0.0.1:${server.address().port}/api/users`, {
        method: 'POST',
        headers: { ...bearer(adminToken), 'Content-Type': 'application/json' },
        body: cuerpo,
      });
      body = await response.json();
    } finally {
      server.close();
    }

    assert.equal(response.status, 400, 'un cuerpo con bytes no UTF-8 debe rechazarse');
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.match(body.error.message, /UTF-8/);

    const [filas] = await pool.query('SELECT id_usuario FROM usuarios WHERE correo = ?', ['latin1@prueba.com']);
    assert.equal(filas.length, 0, 'no debe guardarse un nombre con "�"');
  });
});
