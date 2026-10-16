import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { addDays, today } from '../src/utils/dates.js';
import { isoWeekday } from '../src/utils/sessions.js';
import { resetTestDatabase, createUser, createClient, closePool } from './helpers/db.js';
import { createClass, createMembership, createMembershipType, createTrainer } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

const SOLICITUDES = 20;

// US2, criterio 9; FR-004; SC-001; research R-02
describe('reservas: concurrencia por el último lugar', () => {
  let token;
  let clase;
  let clientes;
  let manana;

  before(async () => {
    await resetTestDatabase();
    const admin = await createUser({ rol: 'administrador' });
    token = tokenFor(await createUser({ rol: 'recepcionista' }));
    const entrenador = await createTrainer();
    const tipo = await createMembershipType();
    manana = addDays(today(), 1);
    clase = await createClass({
      id_instructor: entrenador.id_usuario,
      creado_por: admin.id_usuario,
      dia_semana: isoWeekday(manana),
      hora_inicio: '12:00',
      cupo_maximo: 1,
    });
    clientes = [];
    for (let i = 0; i < SOLICITUDES; i += 1) {
      const cliente = await createClient();
      await createMembership({
        id_cliente: cliente.id_cliente,
        id_tipo_membresia: tipo.id_tipo_membresia,
        fecha_inicio: today(),
        fecha_fin: addDays(today(), 30),
      });
      clientes.push(cliente);
    }
  });

  after(closePool);

  it('veinte_reservas_simultaneas_por_el_ultimo_lugar_aceptan_solo_una', async () => {
    const respuestas = await Promise.all(
      clientes.map((cliente) =>
        request(app)
          .post('/api/reservations')
          .set(bearer(token))
          .send({ id_clase: clase.id_clase, fecha_sesion: manana, id_cliente: cliente.id_cliente }),
      ),
    );

    const aceptadas = respuestas.filter((response) => response.status === 201);
    const rechazadas = respuestas.filter((response) => response.status === 422);
    assert.equal(aceptadas.length, 1, 'exactamente una reserva debe aceptarse');
    assert.equal(rechazadas.length, SOLICITUDES - 1, 'las demás deben rechazarse');
    assert.ok(
      rechazadas.every((response) => response.body.error.message === 'Clase llena.'),
      'todas las rechazadas deben decir "Clase llena."',
    );

    const [rows] = await pool.execute(
      "SELECT COUNT(*) AS total FROM reservas WHERE id_clase = ? AND fecha_sesion = ? AND estado = 'activa'",
      [clase.id_clase, manana],
    );
    assert.equal(Number(rows[0].total), 1, 'la sesión nunca supera su cupo');
  });
});
