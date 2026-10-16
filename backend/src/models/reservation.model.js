import { pool } from '../config/db.js';

// Reservas activas de una sesión (id_clase, fecha_sesion); las canceladas no ocupan lugar (FR-004, FR-008)
export async function countActiveBySession(idClase, fechaSesion, connection = pool) {
  const [rows] = await connection.execute(
    "SELECT COUNT(*) AS total FROM reservas WHERE id_clase = ? AND fecha_sesion = ? AND estado = 'activa'",
    [idClase, fechaSesion],
  );
  return Number(rows[0].total);
}
