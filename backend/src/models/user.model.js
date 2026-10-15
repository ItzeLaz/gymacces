import { pool } from '../config/db.js';

// Columnas públicas: nunca incluyen password
const PUBLIC_COLUMNS =
  'id_usuario, nombre, correo, rol, estado, id_cliente, creado_en, actualizado_en';

const UPDATABLE = ['nombre', 'correo', 'password', 'rol', 'id_cliente', 'estado'];

export async function findById(id, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE id_usuario = ?`,
    [id],
  );
  return rows[0] ?? null;
}

// Incluye password: solo para verificar credenciales
export async function findByEmail(correo, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT ${PUBLIC_COLUMNS}, password FROM usuarios WHERE correo = ?`,
    [correo],
  );
  return rows[0] ?? null;
}

export async function findByClientId(idCliente, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE id_cliente = ?`,
    [idCliente],
  );
  return rows[0] ?? null;
}

function buildFilters({ search, rol, estado }) {
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(nombre LIKE ? OR correo LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (rol) {
    conditions.push('rol = ?');
    params.push(rol);
  }
  if (estado) {
    conditions.push('estado = ?');
    params.push(estado);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export async function list({ search, rol, estado, limit, offset }) {
  const { where, params } = buildFilters({ search, rol, estado });
  // LIMIT y OFFSET ya son enteros validados; se interpolan porque execute no los admite como parámetros en MariaDB
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_COLUMNS} FROM usuarios ${where} ORDER BY nombre, id_usuario LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );
  return rows;
}

export async function count(filters) {
  const { where, params } = buildFilters(filters);
  const [rows] = await pool.execute(`SELECT COUNT(*) AS total FROM usuarios ${where}`, params);
  return Number(rows[0].total);
}

export async function create({ nombre, correo, password, rol, id_cliente = null }, connection = pool) {
  const [result] = await connection.execute(
    'INSERT INTO usuarios (nombre, correo, password, rol, id_cliente) VALUES (?, ?, ?, ?, ?)',
    [nombre, correo, password, rol, id_cliente],
  );
  return result.insertId;
}

export async function update(id, fields, connection = pool) {
  const entries = Object.entries(fields).filter(([key]) => UPDATABLE.includes(key));
  if (entries.length === 0) return;
  const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
  await connection.execute(`UPDATE usuarios SET ${assignments} WHERE id_usuario = ?`, [
    ...entries.map(([, value]) => value),
    id,
  ]);
}

// Bloquea los administradores activos dentro de una transacción (research R-09)
export async function lockActiveAdmins(connection) {
  const [rows] = await connection.execute(
    "SELECT id_usuario FROM usuarios WHERE rol = 'administrador' AND estado = 'activo' FOR UPDATE",
  );
  return rows.map((row) => row.id_usuario);
}
