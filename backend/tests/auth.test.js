import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { resetTestDatabase, createUser, closePool } from './helpers/db.js';
import { loginAs, tokenFor, bearer } from './helpers/auth.js';

describe('autenticación', () => {
  let admin;
  let inactivo;

  before(async () => {
    await resetTestDatabase();
    admin = await createUser({ nombre: 'Admin', correo: 'admin@prueba.com', rol: 'administrador' });
    inactivo = await createUser({ correo: 'inactivo@prueba.com', estado: 'inactivo' });
  });

  after(closePool);

  it('inicia_sesion_con_credenciales_validas_y_devuelve_token_y_usuario_sin_password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@prueba.com', password: 'Prueba2026' });

    assert.equal(response.status, 200, 'el inicio de sesión válido debe responder 200');
    assert.ok(response.body.data.token, 'debe devolver un token');
    assert.equal(response.body.data.expiresIn, '8h');
    assert.equal(response.body.data.user.rol, 'administrador');
    assert.equal(response.body.data.user.password, undefined, 'nunca debe devolver la contraseña');
  });

  it('rechaza_contrasena_incorrecta_con_mensaje_generico', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@prueba.com', password: 'Incorrecta1' });

    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
    assert.equal(response.body.error.message, 'Correo o contraseña incorrectos.');
  });

  it('rechaza_correo_inexistente_con_el_mismo_mensaje_generico', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'nadie@prueba.com', password: 'Prueba2026' });

    assert.equal(response.status, 401);
    assert.equal(response.body.error.message, 'Correo o contraseña incorrectos.');
  });

  it('rechaza_usuario_inactivo_con_contrasena_correcta', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ correo: inactivo.correo, password: 'Prueba2026' });

    assert.equal(response.status, 401);
    assert.equal(
      response.body.error.message,
      'Tu cuenta está desactivada. Contacta al administrador.',
    );
  });

  it('acepta_correo_con_mayusculas_y_espacios', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ correo: '  ADMIN@Prueba.com ', password: 'Prueba2026' });

    assert.equal(response.status, 200, 'el correo se debe normalizar antes de buscar');
  });

  it('rechaza_login_sin_correo_o_password_con_400', async () => {
    const response = await request(app).post('/api/auth/login').send({ correo: '' });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    const campos = response.body.error.details.map((detail) => detail.field);
    assert.ok(campos.includes('correo') && campos.includes('password'), 'debe marcar ambos campos');
  });

  it('auth_me_devuelve_el_usuario_autenticado', async () => {
    const token = await loginAs(app, 'admin@prueba.com', 'Prueba2026');
    const response = await request(app).get('/api/auth/me').set(bearer(token));

    assert.equal(response.status, 200);
    assert.equal(response.body.data.id_usuario, admin.id_usuario);
    assert.equal(response.body.data.password, undefined);
  });

  it('auth_me_sin_token_responde_401', async () => {
    const response = await request(app).get('/api/auth/me');
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'UNAUTHENTICATED');
  });

  it('token_expirado_o_alterado_responde_401', async () => {
    const expirado = tokenFor(admin, { expiresIn: -10 });
    const alterado = `${tokenFor(admin)}x`;

    const r1 = await request(app).get('/api/auth/me').set(bearer(expirado));
    const r2 = await request(app).get('/api/auth/me').set(bearer(alterado));

    assert.equal(r1.status, 401, 'un token expirado debe rechazarse');
    assert.equal(r2.status, 401, 'un token alterado debe rechazarse');
  });

  it('usuario_desactivado_despues_de_iniciar_sesion_recibe_401', async () => {
    const usuario = await createUser({ correo: 'temporal@prueba.com' });
    const token = await loginAs(app, usuario.correo, 'Prueba2026');
    await pool.execute("UPDATE usuarios SET estado = 'inactivo' WHERE id_usuario = ?", [
      usuario.id_usuario,
    ]);

    const response = await request(app).get('/api/auth/me').set(bearer(token));
    assert.equal(response.status, 401, 'la sesión abierta debe dejar de ser válida');
  });

  it('password_guardada_empieza_con_prefijo_bcrypt', async () => {
    const [rows] = await pool.execute('SELECT password FROM usuarios WHERE id_usuario = ?', [
      admin.id_usuario,
    ]);
    assert.match(rows[0].password, /^\$2[aby]\$/, 'la contraseña debe guardarse como hash bcrypt');
  });
});
