import { pool } from '../config/db.js';

// Estado efectivo, vigencia y totales pagados se calculan al consultar (research R-08, R-10).
// Cada consulta recibe "hoy" cuatro veces al inicio de sus parámetros.
const VIEW_SELECT = `
  SELECT m.id_membresia, m.id_cliente, m.id_tipo_membresia, t.nombre AS tipo_nombre,
         DATE_FORMAT(m.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
         DATE_FORMAT(m.fecha_fin, '%Y-%m-%d') AS fecha_fin,
         m.estado, m.motivo_estado, m.monto,
         COALESCE(p.pagado, 0) AS pagado,
         CASE
           WHEN m.estado = 'cancelada' THEN 'cancelada'
           WHEN m.fecha_fin < ? THEN 'vencida'
           ELSE m.estado
         END AS estado_efectivo,
         (m.estado = 'activa' AND m.fecha_inicio <= ? AND m.fecha_fin >= ?) AS vigente,
         (m.estado = 'activa' AND m.fecha_inicio > ?) AS por_iniciar
  FROM membresias m
  JOIN tipos_membresia t ON t.id_tipo_membresia = m.id_tipo_membresia
  LEFT JOIN (
    SELECT id_membresia, SUM(monto) AS pagado FROM pagos WHERE estado = 'pagado' GROUP BY id_membresia
  ) p ON p.id_membresia = m.id_membresia`;

const todayParams = (hoy) => [hoy, hoy, hoy, hoy];

export async function findById(id, hoy, connection = pool) {
  const [rows] = await connection.execute(`${VIEW_SELECT} WHERE m.id_membresia = ?`, [...todayParams(hoy), id]);
  return rows[0] ?? null;
}

export async function listByClient(idCliente, hoy, connection = pool) {
  const [rows] = await connection.execute(
    `${VIEW_SELECT} WHERE m.id_cliente = ? ORDER BY m.fecha_inicio DESC, m.id_membresia DESC`,
    [...todayParams(hoy), idCliente],
  );
  return rows;
}

// Membresía actual: la vigente; si no, la no cancelada que cubre hoy (p. ej. suspendida);
// si no, la no cancelada con mayor fecha de fin; si no, la cancelada más reciente.
export async function findCurrentByClient(idCliente, hoy, connection = pool) {
  const [rows] = await connection.execute(
    `${VIEW_SELECT}
     WHERE m.id_cliente = ?
     ORDER BY vigente DESC,
              (m.estado <> 'cancelada' AND m.fecha_inicio <= ? AND m.fecha_fin >= ?) DESC,
              (m.estado <> 'cancelada') DESC,
              m.fecha_fin DESC, m.id_membresia DESC
     LIMIT 1`,
    [...todayParams(hoy), idCliente, hoy, hoy],
  );
  return rows[0] ?? null;
}

export async function findLastNotCancelled(idCliente, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id_membresia, DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin
     FROM membresias WHERE id_cliente = ? AND estado <> 'cancelada'
     ORDER BY fecha_fin DESC, id_membresia DESC LIMIT 1`,
    [idCliente],
  );
  return rows[0] ?? null;
}

export async function countOverlaps(idCliente, inicio, fin, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM membresias
     WHERE id_cliente = ? AND estado <> 'cancelada' AND fecha_inicio <= ? AND fecha_fin >= ?`,
    [idCliente, fin, inicio],
  );
  return Number(rows[0].total);
}

export async function create(
  { id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, monto, creado_por },
  connection = pool,
) {
  const [result] = await connection.execute(
    `INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, monto, creado_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, monto, creado_por],
  );
  return result.insertId;
}

export async function updateStatus(id, estado, motivo, connection = pool) {
  await connection.execute('UPDATE membresias SET estado = ?, motivo_estado = ? WHERE id_membresia = ?', [
    estado,
    motivo,
    id,
  ]);
}

// Bloquea la fila mientras dura la transacción (research R-09)
export async function lockById(id, connection) {
  const [rows] = await connection.execute('SELECT id_membresia FROM membresias WHERE id_membresia = ? FOR UPDATE', [
    id,
  ]);
  return rows[0] ?? null;
}
