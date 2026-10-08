import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import { loginAs, tokenFor, bearer } from './helpers/auth.js';

describe('gestión de usuarios', () => {
  let admin;
  let adminToken;

  before(async () => {
    await resetTestDatabase();
    admin = await createUser({ nombre: 'Admin Principal', correo: 'admin@prueba.com', rol: 'administrador' });
    adminToken = tokenFor(admin);
  });

  after(closePool);

  const post = (body, token = adminToken) =>
    request(app).post('/api/users').set(bearer(token)).send(body);

  it('administrador_crea_usuario_recepcionista_activo', async () => {
    const response = await post({
      nombre: 'Ana López',
      correo: 'ana@prueba.com',
      password: 'Recep2026',
      rol: 'recepcionista',
    });

    assert.equal(response.status, 201, 'el alta válida debe responder 201');
    assert.equal(response.body.data.estado, 'activo');
    assert.equal(response.body.data.password, undefined, 'nunca debe devolver la contraseña');

    const token = await loginAs(app, 'ana@prueba.com', 'Recep2026');
    assert.ok(token, 'el nuevo usuario debe poder iniciar sesión');
  });

  it('rechaza_correo_duplicado_aunque_cambien_mayusculas_con_409', async () => {
    const response = await post({
      nombre: 'Otra Ana',
      correo: 'ANA@Prueba.com',
      password: 'Recep2026',
      rol: 'entrenador',
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.message, 'Ya existe un usuario con ese correo.');
  });

  it('rechaza_password_que_no_cumple_la_politica_con_400', async () => {
    for (const password of ['corta1', 'sinnumeros', '12345678']) {
      const response = await post({ nombre: 'X', correo: `p${password}@prueba.com`, password, rol: 'entrenador' });
      assert.equal(response.status, 400, `la contraseña "${password}" debe rechazarse`);
      assert.equal(response.body.error.details[0].field, 'password');
    }
  });

  it('rechaza_rol_inexistente_con_400', async () => {
    const response = await post({ nombre: 'X', correo: 'rol@prueba.com', password: 'Clave2026', rol: 'gerente' });
    assert.equal(response.status, 400);
    assert.ok(response.body.error.details.some((detail) => detail.field === 'rol'));
  });

  it('rol_cliente_exige_id_cliente_existente_sin_otra_cuenta_y_con_correo', async () => {
    const sinId = await post({ nombre: 'C', password: 'Clave2026', rol: 'cliente' });
    assert.equal(sinId.status, 400, 'sin id_cliente debe responder 400');

    const inexistente = await post({ nombre: 'C', password: 'Clave2026', rol: 'cliente', id_cliente: 99999 });
    assert.equal(inexistente.status, 404, 'un cliente inexistente debe responder 404');

    const sinCorreo = await createClient({ correo: null });
    const r1 = await post({ nombre: 'C', password: 'Clave2026', rol: 'cliente', id_cliente: sinCorreo.id_cliente });
    assert.equal(r1.status, 409);
    assert.equal(r1.body.error.message, 'El cliente necesita un correo registrado para tener cuenta.');

    const cliente = await createClient({ correo: 'luis@correo.com' });
    const ok = await post({ nombre: 'Luis', password: 'Clave2026', rol: 'cliente', id_cliente: cliente.id_cliente });
    assert.equal(ok.status, 201, 'debe crear la cuenta del cliente');
    assert.equal(ok.body.data.correo, 'luis@correo.com', 'el correo se toma del cliente');

    const repetido = await post({ nombre: 'Luis 2', password: 'Clave2026', rol: 'cliente', id_cliente: cliente.id_cliente });
    assert.equal(repetido.status, 409);
    assert.equal(repetido.body.error.message, 'Este cliente ya tiene una cuenta.');
  });

  it('rol_no_cliente_con_id_cliente_responde_400', async () => {
    const cliente = await createClient();
    const response = await post({
      nombre: 'X',
      correo: 'mezcla@prueba.com',
      password: 'Clave2026',
      rol: 'recepcionista',
      id_cliente: cliente.id_cliente,
    });
    assert.equal(response.status, 400);
  });

  it('lista_usuarios_paginados_sin_password_y_filtra_por_rol_estado_y_busqueda', async () => {
    await createUser({ nombre: 'Entrenador Filtro', correo: 'filtro@prueba.com', rol: 'entrenador', estado: 'inactivo' });

    const todos = await request(app).get('/api/users?limit=2&page=1').set(bearer(adminToken));
    assert.equal(todos.status, 200);
    assert.equal(todos.body.data.length, 2);
    assert.ok(todos.body.meta.total >= 3);
    assert.ok(todos.body.data.every((usuario) => usuario.password === undefined));

    const filtrados = await request(app)
      .get('/api/users?rol=entrenador&estado=inactivo&search=filtro')
      .set(bearer(adminToken));
    assert.equal(filtrados.body.data.length, 1);
    assert.equal(filtrados.body.data[0].correo, 'filtro@prueba.com');
  });

  it('cambiar_rol_aplica_los_nuevos_permisos_en_la_siguiente_solicitud', async () => {
    const usuario = await createUser({ correo: 'cambio@prueba.com', rol: 'recepcionista' });
    const token = tokenFor(usuario);

    const antes = await request(app).get('/api/users').set(bearer(token));
    assert.equal(antes.status, 403);

    const cambio = await request(app)
      .patch(`/api/users/${usuario.id_usuario}`)
      .set(bearer(adminToken))
      .send({ rol: 'administrador' });
    assert.equal(cambio.status, 200);

    const despues = await request(app).get('/api/users').set(bearer(token));
    assert.equal(despues.status, 200, 'el mismo token debe usar el rol vigente en la base');

    await request(app).patch(`/api/users/${usuario.id_usuario}`).set(bearer(adminToken)).send({ rol: 'recepcionista' });
  });

  it('desactivar_usuario_impide_su_inicio_de_sesion_y_conserva_el_registro', async () => {
    const usuario = await createUser({ correo: 'baja@prueba.com' });
    const response = await request(app)
      .patch(`/api/users/${usuario.id_usuario}/status`)
      .set(bearer(adminToken))
      .send({ estado: 'inactivo' });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.estado, 'inactivo');

    const login = await request(app).post('/api/auth/login').send({ correo: 'baja@prueba.com', password: 'Prueba2026' });
    assert.equal(login.status, 401);

    const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM usuarios WHERE id_usuario = ?', [usuario.id_usuario]);
    assert.equal(rows[0].total, 1, 'el registro debe conservarse');
  });

  it('no_permite_desactivar_ni_quitar_el_rol_al_ultimo_administrador_activo', async () => {
    // Deja a "admin" como único administrador activo
    await pool.execute(
      "UPDATE usuarios SET estado = 'inactivo' WHERE rol = 'administrador' AND id_usuario <> ?",
      [admin.id_usuario],
    );
    const otroAdmin = await createUser({ correo: 'admin2@prueba.com', rol: 'administrador' });
    await pool.execute("UPDATE usuarios SET estado = 'inactivo' WHERE id_usuario = ?", [otroAdmin.id_usuario]);

    const segundo = await createUser({ correo: 'admin3@prueba.com', rol: 'administrador' });
    const tokenSegundo = tokenFor(segundo);

    // Con dos administradores activos, uno puede desactivar al otro
    const ok = await request(app)
      .patch(`/api/users/${segundo.id_usuario}/status`)
      .set(bearer(adminToken))
      .send({ estado: 'inactivo' });
    assert.equal(ok.status, 200);

    // Ahora admin es el último: no se le puede quitar el rol
    const quitarRol = await request(app)
      .patch(`/api/users/${admin.id_usuario}`)
      .set(bearer(adminToken))
      .send({ rol: 'recepcionista' });
    assert.equal(quitarRol.status, 409);
    assert.equal(quitarRol.body.error.message, 'Debe existir al menos un administrador activo.');

    assert.ok(tokenSegundo);
  });

  it('administrador_no_puede_desactivarse_a_si_mismo', async () => {
    const response = await request(app)
      .patch(`/api/users/${admin.id_usuario}/status`)
      .set(bearer(adminToken))
      .send({ estado: 'inactivo' });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.message, 'No puedes desactivar tu propia cuenta.');
  });

  it('recepcionista_entrenador_y_cliente_reciben_403_en_todos_los_endpoints_de_usuarios', async () => {
    const recepcionista = await createUser({ rol: 'recepcionista' });
    const entrenador = await createUser({ rol: 'entrenador' });
    const { usuario: cliente } = await createClientUser();

    for (const usuario of [recepcionista, entrenador, cliente]) {
      const token = tokenFor(usuario);
      const respuestas = await Promise.all([
        request(app).get('/api/users').set(bearer(token)),
        request(app).post('/api/users').set(bearer(token)).send({}),
        request(app).get(`/api/users/${admin.id_usuario}`).set(bearer(token)),
        request(app).patch(`/api/users/${admin.id_usuario}`).set(bearer(token)).send({ nombre: 'X' }),
        request(app).patch(`/api/users/${admin.id_usuario}/status`).set(bearer(token)).send({ estado: 'inactivo' }),
      ]);
      respuestas.forEach((response) =>
        assert.equal(response.status, 403, `el rol ${usuario.rol} no debe gestionar usuarios`),
      );
    }
  });

  it('consulta_usuario_inexistente_responde_404', async () => {
    const response = await request(app).get('/api/users/99999').set(bearer(adminToken));
    assert.equal(response.status, 404);
  });
});
