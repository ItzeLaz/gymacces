import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import { pool } from '../src/config/db.js';
import { resetTestDatabase, createClient, createUser, closePool } from './helpers/db.js';
import { runMigrations } from '../../database/scripts/migrate.js';

const SPRINT_TABLES = [
  'accesos',
  'auditoria',
  'clases',
  'clientes',
  'membresias',
  'pagos',
  'reservas',
  'rostros',
  'tipos_membresia',
  'usuarios',
];

async function expectRejected(sql, params, mensaje) {
  await assert.rejects(pool.execute(sql, params), mensaje);
}

describe('estructura de la base de datos', () => {
  let cliente;
  let idTipo;

  before(async () => {
    await resetTestDatabase();
    cliente = await createClient();
    const [result] = await pool.execute(
      "INSERT INTO tipos_membresia (nombre, duracion_dias, precio) VALUES ('Mensual', 30, 500.00)",
    );
    idTipo = result.insertId;
  });

  after(closePool);

  it('existen_las_tablas_de_ambos_sprints_con_innodb_y_utf8mb4', async () => {
    const [rows] = await pool.execute(
      `SELECT TABLE_NAME AS nombre, ENGINE AS motor, TABLE_COLLATION AS collation
       FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME <> 'schema_migrations'
       ORDER BY TABLE_NAME`,
      [env.db.name],
    );
    assert.deepEqual(rows.map((row) => row.nombre), SPRINT_TABLES);
    rows.forEach((row) => {
      assert.equal(row.motor, 'InnoDB', `${row.nombre} debe usar InnoDB`);
      assert.match(row.collation, /^utf8mb4_/, `${row.nombre} debe usar utf8mb4`);
    });
  });

  it('rechaza_membresia_con_cliente_inexistente', async () => {
    await expectRejected(
      "INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin) VALUES (99999, ?, '2026-01-01', '2026-01-31')",
      [idTipo],
      'la llave foránea debe impedir un cliente inexistente',
    );
  });

  it('rechaza_membresia_con_tipo_inexistente', async () => {
    await expectRejected(
      "INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin) VALUES (?, 99999, '2026-01-01', '2026-01-31')",
      [cliente.id_cliente],
      'la llave foránea debe impedir un tipo inexistente',
    );
  });

  it('rechaza_pago_con_cliente_inexistente', async () => {
    await expectRejected(
      "INSERT INTO pagos (id_cliente, monto, metodo_pago) VALUES (99999, 100, 'efectivo')",
      [],
      'la llave foránea debe impedir un cliente inexistente',
    );
  });

  it('rechaza_fecha_fin_anterior_a_fecha_inicio', async () => {
    await expectRejected(
      "INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin) VALUES (?, ?, '2026-02-01', '2026-01-01')",
      [cliente.id_cliente, idTipo],
      'la restricción CHECK debe impedir fechas invertidas',
    );
  });

  it('rechaza_monto_cero_o_negativo', async () => {
    for (const monto of [0, -10]) {
      await expectRejected(
        "INSERT INTO pagos (id_cliente, monto, metodo_pago) VALUES (?, ?, 'efectivo')",
        [cliente.id_cliente, monto],
        `el monto ${monto} debe rechazarse`,
      );
    }
  });

  it('no_permite_borrar_un_cliente_con_membresias', async () => {
    await pool.execute(
      "INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin) VALUES (?, ?, '2026-01-01', '2026-01-31')",
      [cliente.id_cliente, idTipo],
    );
    await expectRejected('DELETE FROM clientes WHERE id_cliente = ?', [cliente.id_cliente], 'ON DELETE RESTRICT debe impedir el borrado');
  });

  it('aplicar_migraciones_dos_veces_no_falla', async () => {
    const aplicadas = await runMigrations(env.db.name, { silent: true });
    assert.deepEqual(aplicadas, [], 'no debe volver a aplicar migraciones');
  });

  it('metodo_de_pago_solo_admite_los_valores_permitidos', async () => {
    await expectRejected(
      "INSERT INTO pagos (id_cliente, monto, metodo_pago) VALUES (?, 100, 'cheque')",
      [cliente.id_cliente],
      'el método "cheque" no está permitido',
    );
  });

  it('acceso_rechazado_exige_motivo', async () => {
    const usuario = await createUser({ rol: 'recepcionista' });
    await expectRejected(
      "INSERT INTO accesos (resultado, motivo, registrado_por) VALUES ('rechazado', NULL, ?)",
      [usuario.id_usuario],
      'un rechazo sin motivo debe impedirse',
    );
    await expectRejected(
      "INSERT INTO accesos (resultado, motivo, registrado_por) VALUES ('autorizado', 'membresia_vencida', ?)",
      [usuario.id_usuario],
      'un acceso autorizado no lleva motivo',
    );
  });

  it('no_permite_dos_rostros_activos_del_mismo_cliente', async () => {
    const usuario = await createUser({ rol: 'recepcionista' });
    const insertar = () =>
      pool.execute(
        "INSERT INTO rostros (id_cliente, descriptor_cifrado, iv, auth_tag, version_modelo, consentimiento, registrado_por) VALUES (?, 'x', 'iv', 'tag', 'prueba', 1, ?)",
        [cliente.id_cliente, usuario.id_usuario],
      );
    await insertar();
    await assert.rejects(insertar(), 'el segundo registro activo debe rechazarse');
    await pool.execute("UPDATE rostros SET estado = 'inactivo' WHERE id_cliente = ?", [cliente.id_cliente]);
    await insertar();
  });

  describe('clases y reservas (migración 006)', () => {
    let entrenador;
    let idClase;

    before(async () => {
      entrenador = await createUser({ rol: 'entrenador' });
      const [result] = await pool.execute(
        "INSERT INTO clases (nombre, id_instructor, dia_semana, hora_inicio, duracion_minutos, cupo_maximo, creado_por) VALUES ('Spinning', ?, 1, '07:00', 45, 20, ?)",
        [entrenador.id_usuario, entrenador.id_usuario],
      );
      idClase = result.insertId;
    });

    const reservar = (idCliente, estado = 'activa') =>
      pool.execute(
        `INSERT INTO reservas (id_clase, fecha_sesion, id_cliente, estado, registrado_por, cancelado_por, cancelado_en)
         VALUES (?, '2026-10-19', ?, ?, ?, ?, ?)`,
        [
          idClase,
          idCliente,
          estado,
          entrenador.id_usuario,
          estado === 'cancelada' ? entrenador.id_usuario : null,
          estado === 'cancelada' ? '2026-10-18 10:00:00' : null,
        ],
      );

    it('la_restriccion_unica_impide_dos_reservas_activas_del_mismo_cliente_en_la_sesion', async () => {
      const otroCliente = await createClient();
      await reservar(otroCliente.id_cliente);
      await assert.rejects(reservar(otroCliente.id_cliente), 'la segunda reserva activa en la misma sesión debe rechazarse');
    });

    it('una_reserva_cancelada_no_bloquea_una_nueva_reserva_del_mismo_cliente', async () => {
      const otroCliente = await createClient();
      await reservar(otroCliente.id_cliente, 'cancelada');
      await reservar(otroCliente.id_cliente, 'cancelada');
      await reservar(otroCliente.id_cliente);
      const [rows] = await pool.execute(
        "SELECT estado, COUNT(*) AS total FROM reservas WHERE id_cliente = ? GROUP BY estado ORDER BY estado",
        [otroCliente.id_cliente],
      );
      assert.deepEqual(
        rows.map((row) => [row.estado, Number(row.total)]),
        [['activa', 1], ['cancelada', 2]],
        'deben convivir una reserva activa y las canceladas',
      );
    });

    it('la_base_rechaza_una_clase_que_termina_despues_de_la_medianoche', async () => {
      await expectRejected(
        "INSERT INTO clases (nombre, id_instructor, dia_semana, hora_inicio, duracion_minutos, cupo_maximo, creado_por) VALUES ('Yoga', ?, 2, '23:30', 45, 10, ?)",
        [entrenador.id_usuario, entrenador.id_usuario],
        'una clase de 23:30 con 45 minutos debe rechazarse',
      );
      await pool.execute(
        "INSERT INTO clases (nombre, id_instructor, dia_semana, hora_inicio, duracion_minutos, cupo_maximo, creado_por) VALUES ('Yoga', ?, 2, '23:00', 60, 10, ?)",
        [entrenador.id_usuario, entrenador.id_usuario],
      );
    });
  });
});
