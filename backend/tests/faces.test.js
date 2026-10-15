import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { FACE_MODEL_VERSION } from '../src/utils/faceMatching.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import { nearDescriptor, sampleSet, syntheticDescriptor } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

const BIOMETRIC_KEYS = ['descriptor', 'muestras', 'descriptor_cifrado', 'iv', 'auth_tag'];

function assertNoBiometrics(body) {
  const texto = JSON.stringify(body);
  for (const key of BIOMETRIC_KEYS) {
    assert.equal(texto.includes(`"${key}"`), false, `la respuesta no debe contener "${key}"`);
  }
}

describe('registro de información facial', () => {
  let adminToken;
  let recepToken;
  let trainerToken;
  let clientToken;

  before(async () => {
    await resetTestDatabase();
    adminToken = tokenFor(await createUser({ rol: 'administrador' }));
    recepToken = tokenFor(await createUser({ rol: 'recepcionista', nombre: 'Ana' }));
    trainerToken = tokenFor(await createUser({ rol: 'entrenador' }));
    clientToken = tokenFor((await createClientUser()).usuario);
  });

  after(closePool);

  const body = (muestras, extra = {}) => ({ consentimiento: true, version_modelo: FACE_MODEL_VERSION, muestras, ...extra });
  const put = (idCliente, payload, token = recepToken) =>
    request(app).put(`/api/clients/${idCliente}/face`).set(bearer(token)).send(payload);

  it('registra_rostro_con_consentimiento_y_solo_devuelve_el_estado', async () => {
    const cliente = await createClient();
    const response = await put(cliente.id_cliente, body(sampleSet(10)));

    assert.equal(response.status, 201, 'el primer registro debe responder 201');
    assert.equal(response.body.data.registrado, true);
    assert.equal(response.body.data.estado, 'activo');
    assert.equal(response.body.data.registrado_por.nombre, 'Ana');
    assertNoBiometrics(response.body);

    const consulta = await request(app).get(`/api/clients/${cliente.id_cliente}/face`).set(bearer(adminToken));
    assert.equal(consulta.body.data.registrado, true);
    assertNoBiometrics(consulta.body);

    const [rows] = await pool.execute('SELECT descriptor_cifrado FROM rostros WHERE id_cliente = ?', [cliente.id_cliente]);
    assert.equal(rows[0].descriptor_cifrado.includes(Buffer.from('muestras')), false, 'el descriptor se guarda cifrado');

    const [audit] = await pool.execute(
      "SELECT accion, descripcion FROM auditoria WHERE entidad = 'rostros' ORDER BY id_auditoria DESC LIMIT 1",
    );
    assert.equal(audit[0].accion, 'rostro.registrar');
    assertNoBiometrics(audit);
  });

  it('rechaza_sin_consentimiento_con_muestras_incompletas_o_de_longitud_incorrecta', async () => {
    const cliente = await createClient();
    const sinConsentimiento = await put(cliente.id_cliente, body(sampleSet(20), { consentimiento: false }));
    assert.equal(sinConsentimiento.status, 400);
    assert.equal(sinConsentimiento.body.error.details[0].message, 'Confirma que el cliente dio su consentimiento.');

    const dosMuestras = await put(cliente.id_cliente, body(sampleSet(20).slice(0, 2)));
    assert.equal(dosMuestras.status, 400, 'se necesitan exactamente 3 muestras');

    const corta = sampleSet(20);
    corta[1] = corta[1].slice(0, 100);
    const longitud = await put(cliente.id_cliente, body(corta));
    assert.equal(longitud.status, 400, 'cada muestra debe tener la longitud del modelo');
    // El error nombra el campo, pero nunca repite los valores recibidos
    assert.equal(JSON.stringify(longitud.body).includes(String(corta[0][0])), false);
  });

  it('rechaza_cliente_inactivo_e_inexistente', async () => {
    const inactivo = await createClient({ estado: 'inactivo' });
    assert.equal((await put(inactivo.id_cliente, body(sampleSet(30)))).status, 422);
    assert.equal((await put(99999, body(sampleSet(31)))).status, 404);
  });

  it('rechaza_un_rostro_ya_registrado_para_otro_cliente_sin_revelar_cual', async () => {
    const primero = await createClient();
    await put(primero.id_cliente, body(sampleSet(40)));

    const segundo = await createClient();
    const base = syntheticDescriptor(40);
    const parecidas = [nearDescriptor(base, 0.3, 1), nearDescriptor(base, 0.3, 2), nearDescriptor(base, 0.3, 3)];
    const response = await put(segundo.id_cliente, body(parecidas));
    assert.equal(response.status, 422);
    assert.equal(response.body.error.message, 'Este rostro ya está registrado para otro cliente.');
    assert.equal(JSON.stringify(response.body).includes(String(primero.id_cliente)), false);
  });

  it('reemplazar_desactiva_el_registro_anterior_y_lo_audita', async () => {
    const cliente = await createClient();
    await put(cliente.id_cliente, body(sampleSet(50)));
    const reemplazo = await put(cliente.id_cliente, body(sampleSet(50)));
    assert.equal(reemplazo.status, 200, 'reemplazar responde 200');

    const [rows] = await pool.execute('SELECT estado FROM rostros WHERE id_cliente = ? ORDER BY id_rostro', [cliente.id_cliente]);
    assert.deepEqual(rows.map((row) => row.estado), ['inactivo', 'activo']);

    const [audit] = await pool.execute(
      "SELECT accion FROM auditoria WHERE entidad = 'rostros' ORDER BY id_auditoria DESC LIMIT 1",
    );
    assert.equal(audit[0].accion, 'rostro.reemplazar');
  });

  it('desactivar_deja_al_cliente_sin_registro_activo', async () => {
    const cliente = await createClient();
    await put(cliente.id_cliente, body(sampleSet(60)));
    const patch = (token = recepToken) =>
      request(app).patch(`/api/clients/${cliente.id_cliente}/face/status`).set(bearer(token)).send({ estado: 'inactivo' });

    const response = await patch();
    assert.equal(response.status, 200);
    assert.equal(response.body.data.registrado, false);
    assert.equal((await patch()).status, 404, 'sin registro activo responde 404');

    const [audit] = await pool.execute(
      "SELECT accion FROM auditoria WHERE entidad = 'rostros' ORDER BY id_auditoria DESC LIMIT 1",
    );
    assert.equal(audit[0].accion, 'rostro.desactivar');
  });

  it('entrenador_y_cliente_no_acceden_a_la_informacion_facial', async () => {
    const cliente = await createClient();
    for (const token of [trainerToken, clientToken]) {
      assert.equal((await put(cliente.id_cliente, body(sampleSet(70)), token)).status, 403);
      const consulta = await request(app).get(`/api/clients/${cliente.id_cliente}/face`).set(bearer(token));
      assert.equal(consulta.status, 403);
    }
  });

  it('la_ficha_del_cliente_indica_si_tiene_rostro_solo_al_personal_de_recepcion', async () => {
    const cliente = await createClient();
    await put(cliente.id_cliente, body(sampleSet(80)));
    const recep = await request(app).get(`/api/clients/${cliente.id_cliente}`).set(bearer(recepToken));
    assert.equal(recep.body.data.rostro_registrado, true);
    const trainer = await request(app).get(`/api/clients/${cliente.id_cliente}`).set(bearer(trainerToken));
    assert.equal('rostro_registrado' in trainer.body.data, false);
  });
});
