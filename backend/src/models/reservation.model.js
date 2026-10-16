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

// Forma base de ReservationView; asistencia_mostrada se calcula en el servicio
const VIEW_SELECT = `
  SELECT r.id_reserva, r.id_clase, DATE_FORMAT(r.fecha_sesion, '%Y-%m-%d') AS fecha_sesion,
         r.id_cliente, cl.nombre AS cliente_nombre, cl.apellido AS cliente_apellido,
         r.estado, r.asistencia, r.registrada_en_curso,
         r.registrado_por, u.nombre AS registrado_por_nombre, r.creado_en
  FROM reservas r
  JOIN clientes cl ON cl.id_cliente = r.id_cliente
  JOIN usuarios u ON u.id_usuario = r.registrado_por`;

export async function findById(id, connection = pool) {
  const [rows] = await connection.execute(`${VIEW_SELECT} WHERE r.id_reserva = ?`, [id]);
  return rows[0] ?? null;
}

// Las fechas llegan desde Node (research R-05): creado_en y, si la sesión está en curso, asistencia_en
export async function create(
  { id_clase, fecha_sesion, id_cliente, registrado_por, creado_en, asistencia, asistencia_por, asistencia_en, registrada_en_curso },
  connection = pool,
) {
  const [result] = await connection.execute(
    `INSERT INTO reservas (id_clase, fecha_sesion, id_cliente, asistencia, registrada_en_curso, registrado_por,
       creado_en, asistencia_por, asistencia_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_clase,
      fecha_sesion,
      id_cliente,
      asistencia,
      registrada_en_curso,
      registrado_por,
      creado_en,
      asistencia_por,
      asistencia_en,
    ],
  );
  return result.insertId;
}

export async function existsActive(idClase, fechaSesion, idCliente, connection = pool) {
  const [rows] = await connection.execute(
    "SELECT 1 FROM reservas WHERE id_clase = ? AND fecha_sesion = ? AND id_cliente = ? AND estado = 'activa' LIMIT 1",
    [idClase, fechaSesion, idCliente],
  );
  return rows.length > 0;
}

// Reservas activas del cliente ese día en clases cuyo horario se empalma con [inicio, fin) (US2-6)
export async function countClientOverlaps(idCliente, fechaSesion, inicioMin, finMin, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM reservas r
     JOIN clases c ON c.id_clase = r.id_clase
     WHERE r.id_cliente = ? AND r.fecha_sesion = ? AND r.estado = 'activa'
       AND TIME_TO_SEC(c.hora_inicio) DIV 60 < ?
       AND ? < TIME_TO_SEC(c.hora_inicio) DIV 60 + c.duracion_minutos`,
    [idCliente, fechaSesion, finMin, inicioMin],
  );
  return Number(rows[0].total);
}
