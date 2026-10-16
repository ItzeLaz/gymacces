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

// Reservas activas por sesión de varias clases entre dos fechas (horario, US4-4)
export async function countActiveBySessions(idsClase, desde, hasta, connection = pool) {
  if (idsClase.length === 0) return [];
  const marcas = idsClase.map(() => '?').join(', ');
  const [rows] = await connection.execute(
    `SELECT id_clase, DATE_FORMAT(fecha_sesion, '%Y-%m-%d') AS fecha_sesion, COUNT(*) AS total
     FROM reservas
     WHERE id_clase IN (${marcas}) AND fecha_sesion BETWEEN ? AND ? AND estado = 'activa'
     GROUP BY id_clase, fecha_sesion`,
    [...idsClase, desde, hasta],
  );
  return rows.map((row) => ({ ...row, total: Number(row.total) }));
}

// Reservados de una sesión ordenados por apellido y nombre, sin datos de contacto (US4-2, US4-3)
export async function listActiveBySession(idClase, fechaSesion, connection = pool) {
  const [rows] = await connection.execute(
    `${VIEW_SELECT}
     WHERE r.id_clase = ? AND r.fecha_sesion = ? AND r.estado = 'activa'
     ORDER BY cl.apellido, cl.nombre, r.id_reserva`,
    [idClase, fechaSesion],
  );
  return rows;
}

// Bloquea la reserva junto con el horario de su clase para calcular el estado de la sesión (US3, US5)
export async function lockById(id, connection) {
  const [rows] = await connection.execute(
    `SELECT r.id_reserva, r.id_clase, DATE_FORMAT(r.fecha_sesion, '%Y-%m-%d') AS fecha_sesion, r.id_cliente,
            r.estado, r.asistencia, c.nombre AS clase_nombre,
            TIME_FORMAT(c.hora_inicio, '%H:%i') AS hora_inicio, c.duracion_minutos
     FROM reservas r
     JOIN clases c ON c.id_clase = r.id_clase
     WHERE r.id_reserva = ? FOR UPDATE`,
    [id],
  );
  return rows[0] ?? null;
}

// La reserva cancelada se conserva; la fecha llega desde Node (FR-007, research R-05)
export async function cancel(id, idUsuario, canceladoEn, connection = pool) {
  await connection.execute(
    "UPDATE reservas SET estado = 'cancelada', cancelado_por = ?, cancelado_en = ? WHERE id_reserva = ?",
    [idUsuario, canceladoEn, id],
  );
}
