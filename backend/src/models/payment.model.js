import { pool } from '../config/db.js';

const VIEW_SELECT = `
  SELECT p.id_pago, p.id_cliente, p.id_membresia, p.monto, p.fecha_pago, p.metodo_pago, p.estado,
         p.motivo_anulacion, p.anulado_en,
         c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
         p.registrado_por, u.nombre AS registrado_por_nombre
  FROM pagos p
  JOIN clientes c ON c.id_cliente = p.id_cliente
  LEFT JOIN usuarios u ON u.id_usuario = p.registrado_por`;

export async function findById(id, connection = pool) {
  const [rows] = await connection.execute(`${VIEW_SELECT} WHERE p.id_pago = ?`, [id]);
  return rows[0] ?? null;
}

export async function listByClient(idCliente, connection = pool) {
  const [rows] = await connection.execute(
    `${VIEW_SELECT} WHERE p.id_cliente = ? ORDER BY p.fecha_pago DESC, p.id_pago DESC`,
    [idCliente],
  );
  return rows;
}

export async function create({ id_cliente, id_membresia, monto, metodo_pago, registrado_por }, connection = pool) {
  const [result] = await connection.execute(
    'INSERT INTO pagos (id_cliente, id_membresia, monto, metodo_pago, registrado_por) VALUES (?, ?, ?, ?, ?)',
    [id_cliente, id_membresia, monto, metodo_pago, registrado_por],
  );
  return result.insertId;
}

// Bloquea el pago para que dos anulaciones simultáneas no se pisen
export async function lockById(id, connection) {
  const [rows] = await connection.execute('SELECT id_pago, estado FROM pagos WHERE id_pago = ? FOR UPDATE', [id]);
  return rows[0] ?? null;
}

// Anular nunca borra: conserva el pago con estado cancelado (FR-019)
export async function cancel(id, { motivo, anulado_por }, connection = pool) {
  await connection.execute(
    "UPDATE pagos SET estado = 'cancelado', motivo_anulacion = ?, anulado_por = ?, anulado_en = NOW() WHERE id_pago = ?",
    [motivo, anulado_por, id],
  );
}

// Filtros del historial general (FR-020); las fechas se comparan por día completo
function buildFilters({ id_cliente, desde, hasta, metodo_pago, estado }) {
  const conditions = [];
  const params = [];
  if (id_cliente) {
    conditions.push('p.id_cliente = ?');
    params.push(id_cliente);
  }
  if (desde) {
    conditions.push('p.fecha_pago >= ?');
    params.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    conditions.push('p.fecha_pago < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(hasta);
  }
  if (metodo_pago) {
    conditions.push('p.metodo_pago = ?');
    params.push(metodo_pago);
  }
  if (estado) {
    conditions.push('p.estado = ?');
    params.push(estado);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export async function list({ limit, offset, ...filters }) {
  const { where, params } = buildFilters(filters);
  // LIMIT y OFFSET ya son enteros validados; se interpolan porque execute no los admite como parámetros en MariaDB
  const [rows] = await pool.execute(
    `${VIEW_SELECT} ${where} ORDER BY p.fecha_pago DESC, p.id_pago DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );
  return rows;
}

export async function count(filters) {
  const { where, params } = buildFilters(filters);
  const [rows] = await pool.execute(`SELECT COUNT(*) AS total FROM pagos p ${where}`, params);
  return Number(rows[0].total);
}

// Suma de los pagos no anulados dentro de los filtros
export async function sumPaid(filters) {
  const { where, params } = buildFilters(filters);
  const condition = where ? `${where} AND p.estado = 'pagado'` : "WHERE p.estado = 'pagado'";
  const [rows] = await pool.execute(`SELECT COALESCE(SUM(p.monto), 0) AS total FROM pagos p ${condition}`, params);
  return rows[0].total;
}
