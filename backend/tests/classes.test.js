import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { addDays, today } from '../src/utils/dates.js';
import { isoWeekday } from '../src/utils/sessions.js';
import { resetTestDatabase, createUser, createClient, closePool } from './helpers/db.js';
import { createClass, createReservation, createTrainer } from './helpers/factories.js';
import { tokenFor, bearer } from './helpers/auth.js';

// Historia 1: registro del horario semanal de clases (spec.md, criterios US1-1 a US1-14)
describe('clases grupales: registro del horario semanal', () => {
  let admin;
  let adminToken;
  let recepToken;
  let manana;
  let diaManana;

  before(async () => {
    await resetTestDatabase();
    admin = await createUser({ rol: 'administrador' });
    adminToken = tokenFor(admin);
    recepToken = tokenFor(await createUser({ rol: 'recepcionista' }));
    manana = addDays(today(), 1);
    diaManana = isoWeekday(manana);
  });

  after(closePool);

  const post = (body, token = adminToken) => request(app).post('/api/classes').set(bearer(token)).send(body);
  const patch = (id, body, token = adminToken) =>
    request(app).patch(`/api/classes/${id}`).set(bearer(token)).send(body);
  const patchStatus = (id, body, token = adminToken) =>
    request(app).patch(`/api/classes/${id}/status`).set(bearer(token)).send(body);

  const datosValidos = (idInstructor, extra = {}) => ({
    nombre: 'Spinning',
    id_instructor: idInstructor,
    dia_semana: 1,
    hora_inicio: '07:00',
    duracion_minutos: 45,
    cupo_maximo: 20,
    ...extra,
  });

  const mensajeDe = (response, campo) =>
    response.body.error?.details?.find((detail) => detail.field === campo)?.message;

  // Reservas activas en la sesión de mañana de la clase
  async function reservarManana(idClase, cantidad) {
    for (let i = 0; i < cantidad; i += 1) {
      const cliente = await createClient();
      await createReservation({
        id_clase: idClase,
        fecha_sesion: manana,
        id_cliente: cliente.id_cliente,
        registrado_por: admin.id_usuario,
      });
    }
  }

  it('registra_clase_valida_como_activa_con_mensaje_clase_registrada', async () => {
    const entrenador = await createTrainer({ nombre: 'Carla Ruiz' });
    const response = await post(datosValidos(entrenador.id_usuario));

    assert.equal(response.status, 201, 'el registro válido debe responder 201');
    assert.equal(response.body.message, 'Clase registrada.');
    assert.equal(response.body.data.estado, 'activa');
    assert.deepEqual(response.body.data.instructor, { id_usuario: entrenador.id_usuario, nombre: 'Carla Ruiz' });
    assert.equal(response.body.data.hora_inicio, '07:00');
    assert.equal(response.body.data.hora_fin, '07:45', 'la hora de fin se calcula con la duración');

    const lista = await request(app).get('/api/classes').set(bearer(adminToken));
    assert.ok(
      lista.body.data.some((clase) => clase.id_clase === response.body.data.id_clase),
      'la clase debe aparecer en el horario semanal',
    );
  });

  it('rechaza_clase_sin_datos_obligatorios_indicando_el_campo', async () => {
    const entrenador = await createTrainer();
    const campos = ['nombre', 'id_instructor', 'dia_semana', 'hora_inicio', 'duracion_minutos', 'cupo_maximo'];
    for (const campo of campos) {
      const datos = datosValidos(entrenador.id_usuario);
      delete datos[campo];
      const response = await post(datos);
      assert.equal(response.status, 400, `sin ${campo} debe responder 400`);
      assert.ok(mensajeDe(response, campo), `el error debe indicar el campo ${campo}`);
    }
  });

  it('rechaza_duracion_fuera_de_15_a_240_minutos', async () => {
    const entrenador = await createTrainer();
    for (const duracion of [14, 241]) {
      const response = await post(datosValidos(entrenador.id_usuario, { duracion_minutos: duracion }));
      assert.equal(response.status, 400, `la duración ${duracion} debe rechazarse`);
      assert.equal(mensajeDe(response, 'duracion_minutos'), 'La duración debe estar entre 15 y 240 minutos.');
    }
    const minima = await post(datosValidos(entrenador.id_usuario, { duracion_minutos: 15, hora_inicio: '06:00' }));
    const maxima = await post(datosValidos(entrenador.id_usuario, { duracion_minutos: 240, hora_inicio: '12:00' }));
    assert.equal(minima.status, 201, '15 minutos se acepta');
    assert.equal(maxima.status, 201, '240 minutos se acepta');
  });

  it('rechaza_cupo_fuera_de_1_a_100_lugares', async () => {
    const entrenador = await createTrainer();
    for (const cupo of [0, 101]) {
      const response = await post(datosValidos(entrenador.id_usuario, { cupo_maximo: cupo }));
      assert.equal(response.status, 400, `el cupo ${cupo} debe rechazarse`);
      assert.equal(mensajeDe(response, 'cupo_maximo'), 'El cupo debe estar entre 1 y 100 lugares.');
    }
    const uno = await post(datosValidos(entrenador.id_usuario, { cupo_maximo: 1, hora_inicio: '06:00' }));
    const cien = await post(datosValidos(entrenador.id_usuario, { cupo_maximo: 100, hora_inicio: '09:00' }));
    assert.equal(uno.status, 201, 'cupo 1 se acepta');
    assert.equal(cien.status, 201, 'cupo 100 se acepta');
  });

  it('rechaza_clase_si_el_instructor_tiene_otra_que_se_empalma', async () => {
    const entrenador = await createTrainer();
    const primera = await post(datosValidos(entrenador.id_usuario, { dia_semana: 2 }));
    assert.equal(primera.status, 201);

    const empalmada = await post(datosValidos(entrenador.id_usuario, { dia_semana: 2, hora_inicio: '07:30' }));
    assert.equal(empalmada.status, 422, 'una clase que se empalma debe rechazarse');
    assert.equal(empalmada.body.error.message, 'El instructor ya tiene una clase en ese horario.');

    const contigua = await post(datosValidos(entrenador.id_usuario, { dia_semana: 2, hora_inicio: '07:45' }));
    assert.equal(contigua.status, 201, 'una clase contigua (07:45) no se empalma');

    const otra = await post(datosValidos(entrenador.id_usuario, { dia_semana: 2, hora_inicio: '10:00' }));
    const movida = await patch(otra.body.data.id_clase, { hora_inicio: '07:15' });
    assert.equal(movida.status, 422, 'mover otra clase al mismo horario también se rechaza');
    assert.equal(movida.body.error.message, 'El instructor ya tiene una clase en ese horario.');
  });

  it('rechaza_instructor_inexistente_inactivo_o_sin_rol_entrenador', async () => {
    const inactivo = await createTrainer({ estado: 'inactivo' });
    const recepcionista = await createUser({ rol: 'recepcionista' });
    for (const idInstructor of [999999, inactivo.id_usuario, recepcionista.id_usuario]) {
      const response = await post(datosValidos(idInstructor));
      assert.equal(response.status, 422, `el instructor ${idInstructor} debe rechazarse`);
      assert.equal(response.body.error.message, 'El instructor debe ser un entrenador activo.');
    }
  });

  it('lista_de_instructores_solo_incluye_entrenadores_activos', async () => {
    const activo = await createTrainer({ nombre: 'Ana Activa' });
    const inactivo = await createTrainer({ nombre: 'Iván Inactivo', estado: 'inactivo' });
    const response = await request(app).get('/api/classes/instructors').set(bearer(adminToken));

    assert.equal(response.status, 200);
    const ids = response.body.data.map((instructor) => instructor.id_usuario);
    assert.ok(ids.includes(activo.id_usuario), 'debe incluir al entrenador activo');
    assert.ok(!ids.includes(inactivo.id_usuario), 'no debe incluir al entrenador inactivo');
    assert.ok(!ids.includes(admin.id_usuario), 'no debe incluir administradores');
    assert.deepEqual(Object.keys(response.body.data[0]).sort(), ['id_usuario', 'nombre']);
    const nombres = response.body.data.map((instructor) => instructor.nombre);
    assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b, 'es')), 'ordenados por nombre');
  });

  it('modificar_nombre_instructor_o_aumentar_cupo_se_aplica_a_sesiones_futuras', async () => {
    const entrenador = await createTrainer();
    const otro = await createTrainer({ nombre: 'Beto Nuevo' });
    const clase = await createClass({ id_instructor: entrenador.id_usuario, dia_semana: diaManana, cupo_maximo: 5 });
    await reservarManana(clase.id_clase, 3);

    const response = await patch(clase.id_clase, { nombre: 'Spinning avanzado', id_instructor: otro.id_usuario, cupo_maximo: 8 });

    assert.equal(response.status, 200, 'estos cambios se aceptan aunque haya reservas futuras');
    assert.equal(response.body.data.nombre, 'Spinning avanzado');
    assert.equal(response.body.data.instructor.id_usuario, otro.id_usuario);
    assert.equal(response.body.data.cupo_maximo, 8);
    assert.equal(response.body.data.hora_inicio, '07:00', 'los campos no enviados no cambian');
  });

  it('rechaza_reducir_cupo_por_debajo_de_las_reservas_existentes', async () => {
    const entrenador = await createTrainer();
    const clase = await createClass({ id_instructor: entrenador.id_usuario, dia_semana: diaManana, cupo_maximo: 5 });
    await reservarManana(clase.id_clase, 2);
    // Las canceladas y las de sesiones pasadas no cuentan
    const cancelado = await createClient();
    await createReservation({
      id_clase: clase.id_clase,
      fecha_sesion: manana,
      id_cliente: cancelado.id_cliente,
      registrado_por: admin.id_usuario,
      estado: 'cancelada',
    });
    for (let i = 0; i < 4; i += 1) {
      const pasado = await createClient();
      await createReservation({
        id_clase: clase.id_clase,
        fecha_sesion: addDays(manana, -7),
        id_cliente: pasado.id_cliente,
        registrado_por: admin.id_usuario,
      });
    }

    const response = await patch(clase.id_clase, { cupo_maximo: 1 });
    assert.equal(response.status, 422);
    assert.equal(response.body.error.message, 'El cupo no puede ser menor que las reservas existentes (2).');

    const igual = await patch(clase.id_clase, { cupo_maximo: 2 });
    assert.equal(igual.status, 200, 'un cupo igual a las reservas activas se acepta');
  });

  it('rechaza_cambiar_horario_de_clase_con_reservas_activas', async () => {
    const entrenador = await createTrainer();
    const clase = await createClass({ id_instructor: entrenador.id_usuario, dia_semana: diaManana });
    await reservarManana(clase.id_clase, 1);

    for (const cambio of [{ dia_semana: (diaManana % 7) + 1 }, { hora_inicio: '08:00' }, { duracion_minutos: 60 }]) {
      const response = await patch(clase.id_clase, cambio);
      assert.equal(response.status, 422, `el cambio ${JSON.stringify(cambio)} debe rechazarse`);
      assert.equal(response.body.error.message, 'No se puede cambiar el horario de una clase con reservas activas.');
    }

    const libre = await createClass({ id_instructor: entrenador.id_usuario, dia_semana: diaManana, hora_inicio: '18:00' });
    const sinReservas = await patch(libre.id_clase, { hora_inicio: '19:00', duracion_minutos: 60 });
    assert.equal(sinReservas.status, 200, 'sin reservas activas futuras el horario se puede cambiar');
    assert.equal(sinReservas.body.data.hora_fin, '20:00');
  });

  it('rechaza_desactivar_clase_con_reservas_activas', async () => {
    const entrenador = await createTrainer();
    const clase = await createClass({ id_instructor: entrenador.id_usuario, dia_semana: diaManana });
    await reservarManana(clase.id_clase, 1);

    const response = await patchStatus(clase.id_clase, { estado: 'inactiva' });
    assert.equal(response.status, 422);
    assert.equal(response.body.error.message, 'No se puede desactivar una clase con reservas activas.');

    const libre = await createClass({ id_instructor: entrenador.id_usuario, dia_semana: diaManana, hora_inicio: '18:00' });
    const desactivada = await patchStatus(libre.id_clase, { estado: 'inactiva' });
    assert.equal(desactivada.status, 200);
    assert.equal(desactivada.body.data.estado, 'inactiva');
  });

  it('clase_desactivada_no_aparece_para_recepcion', async () => {
    const entrenador = await createTrainer();
    const clase = await createClass({ id_instructor: entrenador.id_usuario, estado: 'inactiva' });

    const recepcion = await request(app).get('/api/classes').set(bearer(recepToken));
    assert.equal(recepcion.status, 200);
    assert.ok(!recepcion.body.data.some((item) => item.id_clase === clase.id_clase), 'recepción no ve clases inactivas');
    assert.ok(recepcion.body.data.every((item) => item.estado === 'activa'));

    const administrador = await request(app).get('/api/classes?estado=inactiva').set(bearer(adminToken));
    assert.ok(administrador.body.data.some((item) => item.id_clase === clase.id_clase), 'el administrador sí la ve');
    assert.ok(administrador.body.data.every((item) => item.estado === 'inactiva'));
  });

  it('rechaza_clase_que_termina_despues_de_la_medianoche', async () => {
    const entrenador = await createTrainer();
    const response = await post(datosValidos(entrenador.id_usuario, { hora_inicio: '23:30', duracion_minutos: 45 }));
    assert.equal(response.status, 400);
    assert.equal(mensajeDe(response, 'duracion_minutos'), 'La clase debe terminar el mismo día.');

    const valida = await post(datosValidos(entrenador.id_usuario, { hora_inicio: '23:00', duracion_minutos: 60 }));
    assert.equal(valida.status, 201, 'una clase que termina a las 24:00 se acepta');
    assert.equal(valida.body.data.hora_fin, '24:00');

    const modificada = await patch(valida.body.data.id_clase, { duracion_minutos: 90 });
    assert.equal(modificada.status, 400, 'al modificar también se valida con los valores actuales');
    assert.equal(mensajeDe(modificada, 'duracion_minutos'), 'La clase debe terminar el mismo día.');
  });

  it('registra_auditoria_al_crear_modificar_y_desactivar_clases', async () => {
    const entrenador = await createTrainer();
    const creada = await post(datosValidos(entrenador.id_usuario, { dia_semana: 6, nombre: 'Yoga' }));
    const id = creada.body.data.id_clase;
    await patch(id, { nombre: 'Yoga suave', cupo_maximo: 12 });
    await patchStatus(id, { estado: 'inactiva' });

    const [filas] = await pool.execute(
      "SELECT accion, id_usuario, descripcion FROM auditoria WHERE entidad = 'clases' AND id_registro = ? ORDER BY id_auditoria",
      [id],
    );
    assert.deepEqual(
      filas.map((fila) => fila.accion),
      ['clase.crear', 'clase.modificar', 'clase.desactivar'],
    );
    assert.ok(filas.every((fila) => fila.id_usuario === admin.id_usuario), 'el autor es el administrador');
    assert.match(filas[1].descripcion, /nombre: Yoga → Yoga suave/, 'registra el valor anterior y el nuevo');
    assert.match(filas[1].descripcion, /cupo_maximo: 20 → 12/);
  });

  it('modificar_clase_cuyo_entrenador_se_desactivo_sin_cambiar_instructor_se_acepta', async () => {
    const entrenador = await createTrainer();
    const clase = await createClass({ id_instructor: entrenador.id_usuario, dia_semana: 3 });
    await pool.execute("UPDATE usuarios SET estado = 'inactivo' WHERE id_usuario = ?", [entrenador.id_usuario]);

    const soloNombre = await patch(clase.id_clase, { nombre: 'Funcional' });
    assert.equal(soloNombre.status, 200, 'cambiar solo el nombre no valida al instructor actual');

    const nuevo = await createTrainer();
    const cambio = await patch(clase.id_clase, { id_instructor: nuevo.id_usuario });
    assert.equal(cambio.status, 200, 'cambiar a un instructor activo se acepta');

    const inactivo = await createTrainer({ estado: 'inactivo' });
    const rechazo = await patch(clase.id_clase, { id_instructor: inactivo.id_usuario });
    assert.equal(rechazo.status, 422);
    assert.equal(rechazo.body.error.message, 'El instructor debe ser un entrenador activo.');
  });

  it('modificar_o_desactivar_una_clase_inexistente_responde_404', async () => {
    const response = await patch(999999, { nombre: 'Nada' });
    assert.equal(response.status, 404);
    assert.equal(response.body.error.message, 'La clase no existe.');
    const estado = await patchStatus(999999, { estado: 'inactiva' });
    assert.equal(estado.status, 404);
  });
});
