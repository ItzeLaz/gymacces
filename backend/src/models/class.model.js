import { pool } from '../config/db.js';

// Clase con el nombre de su instructor; las horas se devuelven como 'HH:MM' (contracts/api.md)
const VIEW_SELECT = `
  SELECT c.id_clase, c.nombre, c.id_instructor, u.nombre AS instructor_nombre,
         c.dia_semana, TIME_FORMAT(c.hora_inicio, '%H:%i') AS hora_inicio,
         c.duracion_minutos, c.cupo_maximo, c.estado
  FROM clases c
  JOIN usuarios u ON u.id_usuario = c.id_instructor`;

export async function findById(id, connection = pool) {
  const [rows] = await connection.execute(`${VIEW_SELECT} WHERE c.id_clase = ?`, [id]);
  return rows[0] ?? null;
}

// Bloquea la fila de la clase mientras dura la transacción: serializa reservas, cancelaciones y
// cambios de cupo de la misma clase (research R-02)
export async function lockById(id, connection) {
  const [rows] = await connection.execute(
    `SELECT id_clase, nombre, id_instructor, dia_semana, TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
            duracion_minutos, cupo_maximo, estado
     FROM clases WHERE id_clase = ? FOR UPDATE`,
    [id],
  );
  return rows[0] ?? null;
}
