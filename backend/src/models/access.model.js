import { pool } from '../config/db.js';

// Los registros de acceso solo se insertan y consultan: no hay actualización ni borrado (FR-039)

export async function insert({ id_cliente, id_membresia, resultado, motivo, similitud, registrado_por }, connection = pool) {
  const [result] = await connection.execute(
    `INSERT INTO accesos (id_cliente, id_membresia, resultado, motivo, similitud, registrado_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id_cliente, id_membresia, resultado, motivo, similitud, registrado_por],
  );
  return result.insertId;
}

// Último intento del mismo cliente con el mismo resultado dentro de la ventana anti-duplicados.
// Los rostros no identificados (sin cliente) nunca se deduplican aquí.
export async function findRecentSame({ id_cliente, resultado, segundos }) {
  if (!id_cliente || segundos <= 0) return null;
  const [rows] = await pool.execute(
    `SELECT id_acceso FROM accesos
     WHERE id_cliente = ? AND resultado = ? AND fecha_hora >= NOW(3) - INTERVAL ? SECOND
     ORDER BY fecha_hora DESC LIMIT 1`,
    [id_cliente, resultado, segundos],
  );
  return rows[0] ?? null;
}

const VIEW_SELECT = `
  SELECT a.id_acceso, a.fecha_hora, a.resultado, a.motivo, a.similitud,
         a.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
         a.registrado_por, u.nombre AS registrado_por_nombre
  FROM accesos a
  LEFT JOIN clientes c ON c.id_cliente = a.id_cliente
  JOIN usuarios u ON u.id_usuario = a.registrado_por`;

// Las fechas se comparan por día completo
function buildFilters({ desde, hasta, id_cliente, resultado, motivo }) {
  const conditions = [];
  const params = [];
  if (desde) {
    conditions.push('a.fecha_hora >= ?');
    params.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    conditions.push('a.fecha_hora < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(hasta);
  }
  if (id_cliente) {
    conditions.push('a.id_cliente = ?');
    params.push(id_cliente);
  }
  if (resultado) {
    conditions.push('a.resultado = ?');
    params.push(resultado);
  }
  if (motivo) {
    conditions.push('a.motivo = ?');
    params.push(motivo);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export async function list({ limit, offset, ...filters }) {
  const { where, params } = buildFilters(filters);
  // LIMIT y OFFSET ya son enteros validados; se interpolan porque execute no los admite como parámetros en MariaDB
  const [rows] = await pool.execute(
    `${VIEW_SELECT} ${where} ORDER BY a.fecha_hora DESC, a.id_acceso DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );
  return rows;
}

export async function count(filters) {
  const { where, params } = buildFilters(filters);
  const [rows] = await pool.execute(`SELECT COUNT(*) AS total FROM accesos a ${where}`, params);
  return Number(rows[0].total);
}
