import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { addDays, today } from '../src/utils/dates.js';
import { encryptSamples } from '../src/utils/faceCrypto.js';
import { FACE_MODEL_VERSION } from '../src/utils/faceMatching.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import { createMembership, createMembershipType, nearDescriptor, sampleSet, syntheticDescriptor } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

describe('identificación facial y validación de acceso', () => {
  let recep;
  let recepToken;
  let trainerToken;
  let clientToken;
  let tipo;
  let hoy;
  let seed = 1000;

  before(async () => {
    await resetTestDatabase();
    recep = await createUser({ rol: 'recepcionista' });
    recepToken = tokenFor(recep);
    trainerToken = tokenFor(await createUser({ rol: 'entrenador' }));
    clientToken = tokenFor((await createClientUser()).usuario);
    tipo = await createMembershipType();
    hoy = today();
  });

  after(closePool);

  // Inserta un registro facial activo directamente (permite casos que la API rechazaría)
  async function insertFace(idCliente, muestras) {
    const cifrado = encryptSamples(muestras);
    await pool.execute(
      `INSERT INTO rostros (id_cliente, descriptor_cifrado, iv, auth_tag, version_modelo, consentimiento, registrado_por)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [idCliente, cifrado.descriptor_cifrado, cifrado.iv, cifrado.auth_tag, FACE_MODEL_VERSION, recep.id_usuario],
    );
  }

  // Cliente con rostro registrado; devuelve también una captura nueva de su rostro
  async function clienteConRostro({ estado = 'activo', membresia } = {}) {
    seed += 10;
    const cliente = await createClient({ estado });
    await insertFace(cliente.id_cliente, sampleSet(seed));
    if (membresia) {
      await createMembership({ id_cliente: cliente.id_cliente, id_tipo_membresia: tipo.id_tipo_membresia, ...membresia });
    }
    return { cliente, captura: nearDescriptor(syntheticDescriptor(seed), 0.3, seed + 5) };
  }

  const vigente = () => ({ fecha_inicio: addDays(hoy, -5), fecha_fin: addDays(hoy, 24) });
  const attempt = (descriptor, token = recepToken) =>
    request(app).post('/api/access/attempts').set(bearer(token)).send({ descriptor });

  async function filaDeAcceso(idAcceso) {
    const [rows] = await pool.execute('SELECT * FROM accesos WHERE id_acceso = ?', [idAcceso]);
    return rows[0];
  }

  it('autoriza_al_cliente_identificado_con_membresia_vigente', async () => {
    const { cliente, captura } = await clienteConRostro({ membresia: vigente() });
    const response = await attempt(captura);

    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.body.data).sort(), ['cliente', 'id_acceso', 'mensaje', 'resultado']);
    assert.equal(response.body.data.resultado, 'autorizado');
    assert.deepEqual(response.body.data.cliente, { nombre: cliente.nombre });
    assert.equal(response.body.data.mensaje, `Acceso autorizado. ¡Bienvenido, ${cliente.nombre}!`);

    const fila = await filaDeAcceso(response.body.data.id_acceso);
    assert.equal(fila.id_cliente, cliente.id_cliente);
    assert.equal(fila.motivo, null);
    assert.equal(fila.registrado_por, recep.id_usuario);
    assert.ok(Number(fila.similitud) >= 0.6);
  });

  const casosDeRechazo = [
    ['membresia_vencida', { membresia: { fecha_inicio: addDays(today(), -40), fecha_fin: addDays(today(), -1) } }],
    ['membresia_suspendida', { membresia: { fecha_inicio: addDays(today(), -5), fecha_fin: addDays(today(), 24), estado: 'suspendida' } }],
    ['membresia_cancelada', { membresia: { fecha_inicio: addDays(today(), -5), fecha_fin: addDays(today(), 24), estado: 'cancelada' } }],
    ['sin_membresia_vigente', {}],
    ['sin_membresia_vigente', { membresia: { fecha_inicio: addDays(today(), 1), fecha_fin: addDays(today(), 30) } }],
    ['cliente_inactivo', { estado: 'inactivo', membresia: { fecha_inicio: addDays(today(), -5), fecha_fin: addDays(today(), 24) } }],
  ];

  for (const [motivo, opciones] of casosDeRechazo) {
    it(`rechaza_con_motivo_${motivo}${opciones.membresia?.fecha_inicio > today() ? '_por_iniciar' : ''}`, async () => {
      const { cliente, captura } = await clienteConRostro(opciones);
      const response = await attempt(captura);

      assert.equal(response.body.data.resultado, 'rechazado');
      assert.equal(response.body.data.mensaje, 'Acceso no autorizado. Acude a recepción.');
      assert.equal('motivo' in response.body.data, false, 'la estación no muestra el motivo');
      assert.equal(response.body.data.cliente, null, 'en un rechazo no se muestran datos personales');

      const fila = await filaDeAcceso(response.body.data.id_acceso);
      assert.equal(fila.motivo, motivo);
      assert.equal(fila.id_cliente, cliente.id_cliente, 'el intento queda ligado al cliente identificado');
    });
  }

  it('rechaza_rostro_desconocido_y_captura_sin_descriptor', async () => {
    for (const descriptor of [syntheticDescriptor(987654), null]) {
      const response = await attempt(descriptor);
      assert.equal(response.status, 200);
      assert.equal(response.body.data.resultado, 'rechazado');
      const fila = await filaDeAcceso(response.body.data.id_acceso);
      assert.equal(fila.motivo, 'rostro_no_identificado');
      assert.equal(fila.id_cliente, null);
    }
  });

  it('rechaza_como_no_identificado_un_parecido_ambiguo_entre_dos_clientes', async () => {
    const base = syntheticDescriptor(55555);
    const a = await createClient();
    const b = await createClient();
    await insertFace(a.id_cliente, [nearDescriptor(base, 0.1, 1)]);
    await insertFace(b.id_cliente, [nearDescriptor(base, 0.1, 2)]);
    const response = await attempt(nearDescriptor(base, 0.2, 3));
    const fila = await filaDeAcceso(response.body.data.id_acceso);
    assert.equal(fila.motivo, 'rostro_no_identificado');
  });

  it('autoriza_aunque_tenga_saldo_pendiente', async () => {
    const { captura } = await clienteConRostro({ membresia: { ...vigente(), monto: '450.00' } });
    const response = await attempt(captura);
    assert.equal(response.body.data.resultado, 'autorizado', 'el adeudo no interviene en el acceso');
  });

  it('un_rostro_desactivado_ya_no_identifica', async () => {
    const { cliente, captura } = await clienteConRostro({ membresia: vigente() });
    await pool.execute("UPDATE rostros SET estado = 'inactivo' WHERE id_cliente = ?", [cliente.id_cliente]);
    const response = await attempt(captura);
    const fila = await filaDeAcceso(response.body.data.id_acceso);
    assert.equal(fila.motivo, 'rostro_no_identificado');
  });

  it('no_duplica_el_registro_de_una_misma_presentacion', async () => {
    const { cliente, captura } = await clienteConRostro({ membresia: vigente() });
    const primero = await attempt(captura);
    const segundo = await attempt(captura);
    assert.equal(segundo.body.data.id_acceso, primero.body.data.id_acceso);
    const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM accesos WHERE id_cliente = ?', [cliente.id_cliente]);
    assert.equal(Number(rows[0].total), 1);
  });

  it('valida_el_descriptor_y_los_permisos', async () => {
    const corto = await attempt([0.1, 0.2, 0.3]);
    assert.equal(corto.status, 400);
    assert.equal(JSON.stringify(corto.body).includes('0.1'), false, 'el error no repite el descriptor');

    for (const token of [trainerToken, clientToken]) {
      assert.equal((await attempt(null, token)).status, 403);
    }
  });
});
