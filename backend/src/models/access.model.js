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
