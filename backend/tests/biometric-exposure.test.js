import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { addDays, today } from '../src/utils/dates.js';
import { FACE_MODEL_VERSION } from '../src/utils/faceMatching.js';
import { resetTestDatabase, createUser, createClientUser, closePool } from './helpers/db.js';
import { createMembership, createMembershipType, nearDescriptor, sampleSet, syntheticDescriptor } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

const BIOMETRIC_KEYS = new Set(['descriptor', 'muestras', 'descriptor_cifrado', 'iv', 'auth_tag']);

// Busca de forma recursiva claves biométricas o arreglos numéricos largos (descriptores)
function findBiometrics(value, path = '$') {
  if (Array.isArray(value)) {
    if (value.length > 16 && value.every((item) => typeof item === 'number')) return `${path} es un arreglo numérico`;
    for (let i = 0; i < value.length; i += 1) {
      const found = findBiometrics(value[i], `${path}[${i}]`);
      if (found) return found;
    }
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (BIOMETRIC_KEYS.has(key)) return `${path}.${key} es una clave biométrica`;
      const found = findBiometrics(item, `${path}.${key}`);
      if (found) return found;
    }
  }
  return null;
}

describe('los datos biométricos nunca salen del backend', () => {
  const tokens = {};
  let cliente;

  before(async () => {
    await resetTestDatabase();
    tokens.administrador = tokenFor(await createUser({ rol: 'administrador' }));
    tokens.recepcionista = tokenFor(await createUser({ rol: 'recepcionista' }));
    tokens.entrenador = tokenFor(await createUser({ rol: 'entrenador' }));
    const resultado = await createClientUser();
    cliente = resultado.cliente;
    tokens.cliente = tokenFor(resultado.usuario);

    const tipo = await createMembershipType();
    const hoy = today();
    await createMembership({
      id_cliente: cliente.id_cliente,
      id_tipo_membresia: tipo.id_tipo_membresia,
      fecha_inicio: hoy,
      fecha_fin: addDays(hoy, 29),
    });
    await request(app)
      .put(`/api/clients/${cliente.id_cliente}/face`)
      .set(bearer(tokens.recepcionista))
      .send({ consentimiento: true, version_modelo: FACE_MODEL_VERSION, muestras: sampleSet(500) });
  });

  after(closePool);

  it('ninguna_respuesta_contiene_descriptores_para_ningun_rol', async () => {
    const intento = await request(app)
      .post('/api/access/attempts')
      .set(bearer(tokens.recepcionista))
      .send({ descriptor: nearDescriptor(syntheticDescriptor(500), 0.3, 9) });
    assert.equal(intento.body.data.resultado, 'autorizado');
    assert.equal(findBiometrics(intento.body), null, findBiometrics(intento.body));

    const urls = [
      `/api/clients/${cliente.id_cliente}`,
      `/api/clients/${cliente.id_cliente}/face`,
      '/api/clients',
      '/api/access',
      '/api/clients/me',
      '/api/clients/me/access',
    ];
    for (const [rol, token] of Object.entries(tokens)) {
      for (const url of urls) {
        const response = await request(app).get(url).set(bearer(token));
        assert.equal(findBiometrics(response.body), null, `${rol} en ${url}: ${findBiometrics(response.body)}`);
      }
    }
  });

  it('la_auditoria_no_contiene_datos_biometricos', async () => {
    const [rows] = await pool.execute("SELECT accion, descripcion FROM auditoria WHERE entidad = 'rostros'");
    assert.ok(rows.length > 0, 'el registro facial debe auditarse');
    for (const row of rows) {
      for (const key of BIOMETRIC_KEYS) {
        assert.equal(String(row.descripcion).includes(key), false, `la auditoría no debe mencionar ${key}`);
      }
      assert.doesNotMatch(String(row.descripcion), /\d\.\d{4,}/, 'la auditoría no debe contener valores del descriptor');
    }
  });
});
