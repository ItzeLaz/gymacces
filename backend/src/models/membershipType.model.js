import { pool } from '../config/db.js';

const COLUMNS = 'id_tipo_membresia, nombre, descripcion, duracion_dias, precio, estado';

const UPDATABLE = ['nombre', 'descripcion', 'duracion_dias', 'precio'];

export async function findById(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT ${COLUMNS} FROM tipos_membresia WHERE id_tipo_membresia = ?`,
    [id],
  );
  return rows[0] ?? null;
}

// La collation utf8mb4_unicode_ci compara sin distinguir mayúsculas
export async function findByName(nombre, connection = pool) {
  const [rows] = await connection.execute(`SELECT ${COLUMNS} FROM tipos_membresia WHERE nombre = ?`, [nombre]);
  return rows[0] ?? null;
}

function buildFilters({ estado }) {
  return estado ? { where: 'WHERE estado = ?', params: [estado] } : { where: '', params: [] };
}

export async function list({ estado, limit, offset }) {
  const { where, params } = buildFilters({ estado });
  // LIMIT y OFFSET ya son enteros validados; se interpolan porque execute no los admite como parámetros en MariaDB
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM tipos_membresia ${where} ORDER BY nombre, id_tipo_membresia LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );
  return rows;
}

export async function count(filters) {
  const { where, params } = buildFilters(filters);
  const [rows] = await pool.execute(`SELECT COUNT(*) AS total FROM tipos_membresia ${where}`, params);
  return Number(rows[0].total);
}

export async function create({ nombre, descripcion = null, duracion_dias, precio }, connection = pool) {
  const [result] = await connection.execute(
    'INSERT INTO tipos_membresia (nombre, descripcion, duracion_dias, precio) VALUES (?, ?, ?, ?)',
    [nombre, descripcion, duracion_dias, precio],
  );
  return result.insertId;
}

export async function update(id, fields, connection = pool) {
  const entries = Object.entries(fields).filter(([key]) => UPDATABLE.includes(key));
  if (entries.length === 0) return;
  const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
  await connection.execute(`UPDATE tipos_membresia SET ${assignments} WHERE id_tipo_membresia = ?`, [
    ...entries.map(([, value]) => value),
    id,
  ]);
}

export async function updateStatus(id, estado, connection = pool) {
  await connection.execute('UPDATE tipos_membresia SET estado = ? WHERE id_tipo_membresia = ?', [estado, id]);
}
