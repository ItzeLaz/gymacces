import { pool } from '../config/db.js';

// Consultas agregadas de solo lectura para el dashboard (research R-03).
// Nunca seleccionan datos de contacto, datos faciales ni similitud (FR-012).
// Los días se filtran como [desde 00:00:00, hasta + 1 día) (research R-05).

const IN_RANGE = (column) => `${column} >= ? AND ${column} < DATE_ADD(?, INTERVAL 1 DAY)`;
const rangeParams = (desde, hasta) => [`${desde} 00:00:00`, hasta];

// Membresía vigente que termina entre hoy y el límite, sin otra posterior (ya renovada)
const EXPIRING_WHERE = `
  WHERE m.estado = 'activa' AND m.fecha_inicio <= ? AND m.fecha_fin BETWEEN ? AND ?
    AND NOT EXISTS (
      SELECT 1 FROM membresias n
      WHERE n.id_cliente = m.id_cliente AND n.estado <> 'cancelada' AND n.fecha_inicio > m.fecha_fin
    )`;

export async function countClientsByStatus() {
  const [rows] = await pool.execute('SELECT estado, COUNT(*) AS total FROM clientes GROUP BY estado');
  return rows;
}

// Clientes (no membresías) por estado de membresía; las canceladas no cuentan (FR-003)
export async function membershipCounts(hoy, limite) {
  const [rows] = await pool.execute(
    `SELECT
       (SELECT COUNT(DISTINCT id_cliente) FROM membresias
         WHERE estado = 'activa' AND fecha_inicio <= ? AND fecha_fin >= ?) AS vigentes,
       (SELECT COUNT(*) FROM (
          SELECT id_cliente FROM membresias WHERE estado <> 'cancelada'
          GROUP BY id_cliente HAVING MAX(fecha_fin) < ?
        ) AS vencidos) AS vencidas,
       (SELECT COUNT(DISTINCT m.id_cliente) FROM membresias m ${EXPIRING_WHERE}) AS por_vencer`,
    [hoy, hoy, hoy, hoy, hoy, limite],
  );
  return rows[0];
}

export async function expiringSoon(hoy, limite, cantidad) {
  // LIMIT es un entero fijo del servicio; se interpola porque execute no lo admite como parámetro en MariaDB
  const [rows] = await pool.execute(
    `SELECT m.id_cliente, c.nombre, c.apellido, t.nombre AS tipo,
            DATE_FORMAT(m.fecha_fin, '%Y-%m-%d') AS fecha_fin
     FROM membresias m
     JOIN clientes c ON c.id_cliente = m.id_cliente
     JOIN tipos_membresia t ON t.id_tipo_membresia = m.id_tipo_membresia
     ${EXPIRING_WHERE}
     ORDER BY m.fecha_fin, c.apellido, c.id_cliente
     LIMIT ${Number(cantidad)}`,
    [hoy, hoy, limite],
  );
  return rows;
}

// Solo pagos no anulados (FR-005)
export async function paymentTotals(desde, hasta) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS ingresos
     FROM pagos WHERE estado = 'pagado' AND ${IN_RANGE('fecha_pago')}`,
    rangeParams(desde, hasta),
  );
  return rows[0];
}

export async function accessTotals(desde, hasta) {
  const [rows] = await pool.execute(
    `SELECT resultado, COUNT(*) AS total FROM accesos WHERE ${IN_RANGE('fecha_hora')} GROUP BY resultado`,
    rangeParams(desde, hasta),
  );
  return rows;
}

export async function rejectionsByReason(desde, hasta) {
  const [rows] = await pool.execute(
    `SELECT motivo, COUNT(*) AS total FROM accesos
     WHERE resultado = 'rechazado' AND ${IN_RANGE('fecha_hora')} GROUP BY motivo`,
    rangeParams(desde, hasta),
  );
  return rows;
}

// Los más recientes sin importar el periodo (FR-007); del cliente solo nombre y apellido
export async function recentRejections(cantidad) {
  const [rows] = await pool.execute(
    `SELECT a.id_acceso, a.fecha_hora, a.motivo, a.id_cliente, c.nombre, c.apellido
     FROM accesos a LEFT JOIN clientes c ON c.id_cliente = a.id_cliente
     WHERE a.resultado = 'rechazado'
     ORDER BY a.fecha_hora DESC, a.id_acceso DESC
     LIMIT ${Number(cantidad)}`,
  );
  return rows;
}

// Ingresos por día del periodo (FR-009)
export async function dailyPayments(desde, hasta) {
  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(fecha_pago, '%Y-%m-%d') AS fecha, SUM(monto) AS ingresos
     FROM pagos WHERE estado = 'pagado' AND ${IN_RANGE('fecha_pago')}
     GROUP BY DATE_FORMAT(fecha_pago, '%Y-%m-%d')`,
    rangeParams(desde, hasta),
  );
  return rows;
}

// Accesos por día y resultado (FR-009)
export async function dailyAccesses(desde, hasta) {
  const [rows] = await pool.execute(
    `SELECT DATE_FORMAT(fecha_hora, '%Y-%m-%d') AS fecha, resultado, COUNT(*) AS total
     FROM accesos WHERE ${IN_RANGE('fecha_hora')}
     GROUP BY DATE_FORMAT(fecha_hora, '%Y-%m-%d'), resultado`,
    rangeParams(desde, hasta),
  );
  return rows;
}
