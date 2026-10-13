import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import { pool } from '../src/config/db.js';
import { resetTestDatabase, createClient, createUser, closePool } from './helpers/db.js';
import { runMigrations } from '../../database/scripts/migrate.js';

const SPRINT_TABLES = [
  'accesos',
  'auditoria',
  'clientes',
  'membresias',
  'pagos',
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
});
