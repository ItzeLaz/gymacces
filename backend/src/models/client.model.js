import { pool } from '../config/db.js';

const COLUMNS =
  'id_cliente, nombre, apellido, correo, telefono, direccion, fecha_registro, estado, actualizado_en';

const UPDATABLE = ['nombre', 'apellido', 'correo', 'telefono', 'direccion'];

export async function findById(id, connection = pool) {
  const [rows] = await connection.execute(`SELECT ${COLUMNS} FROM clientes WHERE id_cliente = ?`, [id]);
  return rows[0] ?? null;
}

export async function findByEmail(correo, connection = pool) {
  const [rows] = await connection.execute(`SELECT ${COLUMNS} FROM clientes WHERE correo = ?`, [correo]);
  return rows[0] ?? null;
}

function buildFilters({ search, estado }) {
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(nombre LIKE ? OR apellido LIKE ? OR correo LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (estado) {
    conditions.push('estado = ?');
    params.push(estado);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export async function list({ search, estado, limit, offset }) {
  const { where, params } = buildFilters({ search, estado });
  // LIMIT y OFFSET ya son enteros validados; se interpolan porque execute no los admite como parámetros en MariaDB
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM clientes ${where} ORDER BY apellido, nombre, id_cliente LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );
  return rows;
}

export async function count(filters) {
  const { where, params } = buildFilters(filters);
  const [rows] = await pool.execute(`SELECT COUNT(*) AS total FROM clientes ${where}`, params);
  return Number(rows[0].total);
}

export async function create({ nombre, apellido, correo = null, telefono, direccion = null }) {
  const [result] = await pool.execute(
    'INSERT INTO clientes (nombre, apellido, correo, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
    [nombre, apellido, correo, telefono, direccion],
  );
  return result.insertId;
}

export async function update(id, fields) {
  const entries = Object.entries(fields).filter(([key]) => UPDATABLE.includes(key));
  if (entries.length === 0) return;
  const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
  await pool.execute(`UPDATE clientes SET ${assignments} WHERE id_cliente = ?`, [
    ...entries.map(([, value]) => value),
    id,
  ]);
}

export async function updateStatus(id, estado) {
  await pool.execute('UPDATE clientes SET estado = ? WHERE id_cliente = ?', [estado, id]);
}
