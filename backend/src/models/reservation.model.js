import { pool } from '../config/db.js';

// Reservas activas de una sesión (id_clase, fecha_sesion); las canceladas no ocupan lugar (FR-004, FR-008)
export async function countActiveBySession(idClase, fechaSesion, connection = pool) {
  const [rows] = await connection.execute(
    "SELECT COUNT(*) AS total FROM reservas WHERE id_clase = ? AND fecha_sesion = ? AND estado = 'activa'",
    [idClase, fechaSesion],
  );
  return Number(rows[0].total);
}

// Una sesión futura todavía no termina: fecha posterior a hoy, o de hoy con fin posterior a la hora
// actual (spec, "Sesión futura"). Hoy y los minutos actuales llegan de nowInGym(), nunca del reloj de MySQL.
const FUTURE_SESSION = `(r.fecha_sesion > ? OR (r.fecha_sesion = ?
  AND TIME_TO_SEC(c.hora_inicio) DIV 60 + c.duracion_minutos > ?))`;

// Mayor número de reservas activas en una sesión futura de la clase (US1, criterio 9)
export async function maxActiveInFutureSessions(idClase, hoy, minutosAhora, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(MAX(total), 0) AS maximo FROM (
       SELECT COUNT(*) AS total FROM reservas r
       JOIN clases c ON c.id_clase = r.id_clase
       WHERE r.id_clase = ? AND r.estado = 'activa' AND ${FUTURE_SESSION}
       GROUP BY r.fecha_sesion
     ) sesiones`,
    [idClase, hoy, hoy, minutosAhora],
  );
  return Number(rows[0].maximo);
}

// Reservas activas en sesiones futuras de la clase (US1, criterios 10 y 11)
export async function countActiveInFutureSessions(idClase, hoy, minutosAhora, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM reservas r
     JOIN clases c ON c.id_clase = r.id_clase
     WHERE r.id_clase = ? AND r.estado = 'activa' AND ${FUTURE_SESSION}`,
    [idClase, hoy, hoy, minutosAhora],
  );
  return Number(rows[0].total);
}
