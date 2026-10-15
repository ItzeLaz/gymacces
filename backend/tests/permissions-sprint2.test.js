import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { addDays, today } from '../src/utils/dates.js';
import { resetTestDatabase, createUser, createClient, createClientUser, closePool } from './helpers/db.js';
import { createMembership, createMembershipType, createPayment, syntheticDescriptor } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

const ADMIN = 'administrador';
const RECEP = 'recepcionista';
const TRAINER = 'entrenador';
const CLIENT = 'cliente';
const ALL = [ADMIN, RECEP, TRAINER, CLIENT];

describe('matriz de permisos del Sprint 2', () => {
  const tokens = {};
  let ids;

  before(async () => {
    await resetTestDatabase();
    tokens[ADMIN] = tokenFor(await createUser({ rol: ADMIN }));
    tokens[RECEP] = tokenFor(await createUser({ rol: RECEP }));
    tokens[TRAINER] = tokenFor(await createUser({ rol: TRAINER }));
    tokens[CLIENT] = tokenFor((await createClientUser()).usuario);

    const cliente = await createClient();
    const tipo = await createMembershipType();
    const hoy = today();
    const membresia = await createMembership({
      id_cliente: cliente.id_cliente,
      id_tipo_membresia: tipo.id_tipo_membresia,
      fecha_inicio: hoy,
      fecha_fin: addDays(hoy, 29),
    });
    const pago = await createPayment({ id_cliente: cliente.id_cliente, id_membresia: membresia.id_membresia });
    ids = { cliente: cliente.id_cliente, tipo: tipo.id_tipo_membresia, membresia: membresia.id_membresia, pago: pago.id_pago };
  });

  after(closePool);

  // Cada fila: método, ruta, cuerpo y roles permitidos (contracts/api.md, "Matriz de permisos")
  const matrix = () => [
    ['get', '/api/membership-types', null, [ADMIN, RECEP]],
    ['post', '/api/membership-types', { nombre: 'X', duracion_dias: 1, precio: '1' }, [ADMIN]],
    ['patch', `/api/membership-types/${ids.tipo}`, { precio: '1.00' }, [ADMIN]],
    ['patch', `/api/membership-types/${ids.tipo}/status`, { estado: 'activo' }, [ADMIN]],
    ['get', `/api/clients/${ids.cliente}/memberships`, null, [ADMIN, RECEP, TRAINER]],
    ['post', `/api/clients/${ids.cliente}/memberships`, { id_tipo_membresia: ids.tipo }, [ADMIN, RECEP]],
    ['post', `/api/clients/${ids.cliente}/memberships/renew`, { id_tipo_membresia: ids.tipo }, [ADMIN, RECEP]],
    ['patch', `/api/memberships/${ids.membresia}/status`, { estado: 'suspendida', motivo: 'x' }, [ADMIN]],
    ['post', '/api/payments', { id_membresia: ids.membresia, monto: '1.00', metodo_pago: 'efectivo' }, [ADMIN, RECEP]],
    ['get', '/api/payments', null, [ADMIN]],
    ['get', `/api/clients/${ids.cliente}/payments`, null, [ADMIN, RECEP]],
    ['patch', `/api/payments/${ids.pago}/cancel`, { motivo: 'x' }, [ADMIN]],
    ['get', '/api/debts', null, [ADMIN]],
    ['get', `/api/clients/${ids.cliente}/face`, null, [ADMIN, RECEP]],
    ['put', `/api/clients/${ids.cliente}/face`, { consentimiento: true }, [ADMIN, RECEP]],
    ['patch', `/api/clients/${ids.cliente}/face/status`, { estado: 'inactivo' }, [ADMIN, RECEP]],
    ['post', '/api/access/attempts', { descriptor: syntheticDescriptor(1) }, [ADMIN, RECEP]],
    ['get', '/api/access', null, [ADMIN, RECEP, TRAINER]],
    ['get', '/api/clients/me/access', null, [CLIENT]],
  ];

  it('cada_rol_solo_usa_los_endpoints_permitidos_y_el_resto_recibe_403', async () => {
    for (const [method, url, body, allowed] of matrix()) {
      for (const rol of ALL) {
        let call = request(app)[method](url).set(bearer(tokens[rol]));
        if (body) call = call.send(body);
        const response = await call;
        if (allowed.includes(rol)) {
          assert.notEqual(response.status, 403, `${rol} debe poder usar ${method.toUpperCase()} ${url}`);
          assert.notEqual(response.status, 401, `${rol} debe estar autenticado en ${method.toUpperCase()} ${url}`);
        } else {
          assert.equal(response.status, 403, `${rol} no debe poder usar ${method.toUpperCase()} ${url}`);
        }
      }
    }
  });

  it('sin_sesion_todos_los_endpoints_nuevos_responden_401', async () => {
    for (const [method, url] of matrix()) {
      const response = await request(app)[method](url);
      assert.equal(response.status, 401, `${method.toUpperCase()} ${url} debe exigir sesión`);
    }
  });

  it('solo_la_estacion_recibe_descriptores_para_identificar', async () => {
    // No existe búsqueda de personas por rostro fuera del punto de acceso (FR-031)
    for (const url of ['/api/access/identify', '/api/faces/search', '/api/clients/search-by-face']) {
      const response = await request(app).post(url).set(bearer(tokens[ADMIN])).send({ descriptor: syntheticDescriptor(2) });
      assert.equal(response.status, 404, `${url} no debe existir`);
    }
  });
});
