import { pool } from '../config/db.js';

// Estas consultas nunca seleccionan columnas biométricas (FR-030)
export async function findActiveStatusByClient(idCliente, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT r.id_rostro, r.estado, r.creado_en, r.registrado_por, u.nombre AS registrado_por_nombre
     FROM rostros r JOIN usuarios u ON u.id_usuario = r.registrado_por
     WHERE r.id_cliente = ? AND r.estado = 'activo'`,
    [idCliente],
  );
  return rows[0] ?? null;
}

export async function lockActiveByClient(idCliente, connection) {
  const [rows] = await connection.execute(
    "SELECT id_rostro FROM rostros WHERE id_cliente = ? AND estado = 'activo' FOR UPDATE",
    [idCliente],
  );
  return rows[0] ?? null;
}

export async function insert(
  { id_cliente, descriptor_cifrado, iv, auth_tag, version_modelo, registrado_por },
  connection = pool,
) {
  const [result] = await connection.execute(
    `INSERT INTO rostros (id_cliente, descriptor_cifrado, iv, auth_tag, version_modelo, consentimiento, registrado_por)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [id_cliente, descriptor_cifrado, iv, auth_tag, version_modelo, registrado_por],
  );
  return result.insertId;
}

export async function deactivate(idRostro, connection = pool) {
  await connection.execute("UPDATE rostros SET estado = 'inactivo', desactivado_en = NOW() WHERE id_rostro = ?", [
    idRostro,
  ]);
}

// USO EXCLUSIVO de faces.service.js: única consulta que lee los datos biométricos cifrados
export async function listActiveEncrypted(connection = pool) {
  const [rows] = await connection.execute(
    "SELECT id_cliente, descriptor_cifrado, iv, auth_tag, version_modelo FROM rostros WHERE estado = 'activo'",
  );
  return rows;
}
