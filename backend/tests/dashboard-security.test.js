import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { addDays, today } from '../src/utils/dates.js';
import { FACE_MODEL_VERSION } from '../src/utils/faceMatching.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import {
  createAccess,
  createMembership,
  createMembershipType,
  createPayment,
  nearDescriptor,
  sampleSet,
  syntheticDescriptor,
} from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

const FORBIDDEN_KEYS = new Set([
  'correo',
  'telefono',
  'direccion',
  'similitud',
  'descriptor',
  'muestras',
  'descriptor_cifrado',
  'saldo',
  'monto',
  'adeudo',
]);

// Busca de forma recursiva claves prohibidas en la respuesta (FR-012)
function findForbidden(value, path = '$') {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = findForbidden(value[i], `${path}[${i}]`);
      if (found) return found;
    }
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) return `${path}.${key}`;
      const found = findForbidden(item, `${path}.${key}`);
      if (found) return found;
    }
  }
  return null;
}

describe('seguridad del dashboard', () => {
  const tokens = {};
  const CORREO = 'privado.dashboard@correo.com';
  const TELEFONO = '5598765432';

  before(async () => {
    await resetTestDatabase();
    const admin = await createUser({ rol: 'administrador' });
    const recep = await createUser({ rol: 'recepcionista' });
    tokens.administrador = tokenFor(admin);
    tokens.recepcionista = tokenFor(recep);
    tokens.entrenador = tokenFor(await createUser({ rol: 'entrenador' }));
    tokens.cliente = tokenFor((await createClientUser()).usuario);

    // Datos sensibles que nunca deben llegar al dashboard
    const hoy = today();
    const cliente = await createClient({ correo: CORREO, telefono: TELEFONO, apellido: 'Sensible' });
    const tipo = await createMembershipType();
    const membresia = await createMembership({
      id_cliente: cliente.id_cliente,
      id_tipo_membresia: tipo.id_tipo_membresia,
      fecha_inicio: addDays(hoy, -25),
      fecha_fin: addDays(hoy, 2),
    });
    await createPayment({ id_cliente: cliente.id_cliente, id_membresia: membresia.id_membresia, monto: '100.00' });
    await request(app)
      .put(`/api/clients/${cliente.id_cliente}/face`)
      .set(bearer(tokens.recepcionista))
      .send({ consentimiento: true, version_modelo: FACE_MODEL_VERSION, muestras: sampleSet(700) });
    await request(app)
      .post('/api/access/attempts')
      .set(bearer(tokens.recepcionista))
      .send({ descriptor: nearDescriptor(syntheticDescriptor(700), 0.3, 3) });
    await createAccess({
      id_cliente: cliente.id_cliente,
      resultado: 'rechazado',
      motivo: 'membresia_vencida',
      registrado_por: recep.id_usuario,
    });
  });

  after(closePool);

  it('sin_sesion_responde_401', async () => {
    assert.equal((await request(app).get('/api/dashboard')).status, 401);
  });

  it('recepcionista_entrenador_y_cliente_reciben_403_con_cualquier_periodo', async () => {
    for (const rol of ['recepcionista', 'entrenador', 'cliente']) {
      for (const query of ['', '?periodo=hoy', '?periodo=7d', `?periodo=rango&desde=${today()}&hasta=${today()}`]) {
        const response = await request(app).get(`/api/dashboard${query}`).set(bearer(tokens[rol]));
        assert.equal(response.status, 403, `${rol} no debe abrir el dashboard (${query || 'sin parámetros'})`);
      }
    }
  });

  it('la_respuesta_del_administrador_no_contiene_datos_sensibles', async () => {
    const response = await request(app).get('/api/dashboard').set(bearer(tokens.administrador));
    assert.equal(response.status, 200);
    assert.ok(response.body.data.por_vencer.length > 0, 'el cliente de prueba debe aparecer por vencer');
    assert.ok(response.body.data.rechazos_recientes.length > 0);

    assert.equal(findForbidden(response.body.data), null, `campo prohibido: ${findForbidden(response.body.data)}`);
    const texto = JSON.stringify(response.body);
    assert.equal(texto.includes(CORREO), false, 'no debe incluir correos');
    assert.equal(texto.includes(TELEFONO), false, 'no debe incluir teléfonos');
  });
});
