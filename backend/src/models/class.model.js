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

const UPDATABLE = ['nombre', 'id_instructor', 'dia_semana', 'hora_inicio', 'duracion_minutos', 'cupo_maximo'];

// Inicio y fin de la clase en minutos desde la medianoche, calculados en SQL
const START_MIN = 'TIME_TO_SEC(c.hora_inicio) DIV 60';
const END_MIN = `(${START_MIN} + c.duracion_minutos)`;

export async function create(
  { nombre, id_instructor, dia_semana, hora_inicio, duracion_minutos, cupo_maximo, creado_por },
  connection = pool,
) {
  const [result] = await connection.execute(
    `INSERT INTO clases (nombre, id_instructor, dia_semana, hora_inicio, duracion_minutos, cupo_maximo, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nombre, id_instructor, dia_semana, hora_inicio, duracion_minutos, cupo_maximo, creado_por],
  );
  return result.insertId;
}

export async function update(id, fields, connection = pool) {
  const entries = Object.entries(fields).filter(([key]) => UPDATABLE.includes(key));
  if (entries.length === 0) return;
  const sets = entries.map(([key]) => `${key} = ?`).join(', ');
  await connection.execute(`UPDATE clases SET ${sets} WHERE id_clase = ?`, [...entries.map(([, value]) => value), id]);
}

export async function updateStatus(id, estado, connection = pool) {
  await connection.execute('UPDATE clases SET estado = ? WHERE id_clase = ?', [estado, id]);
}

// Catálogo ordenado como horario semanal (FR-002)
export async function list({ estado } = {}, connection = pool) {
  const where = estado ? 'WHERE c.estado = ?' : '';
  const [rows] = await connection.execute(
    `${VIEW_SELECT} ${where} ORDER BY c.dia_semana, c.hora_inicio, c.nombre, c.id_clase`,
    estado ? [estado] : [],
  );
  return rows;
}

// Instructores elegibles: solo entrenadores activos (US1, criterio 7)
export async function listActiveTrainers(connection = pool) {
  const [rows] = await connection.execute(
    "SELECT id_usuario, nombre FROM usuarios WHERE rol = 'entrenador' AND estado = 'activo' ORDER BY nombre, id_usuario",
  );
  return rows;
}

// Bloquea al usuario instructor para serializar las altas y cambios de sus clases (research R-03)
export async function lockInstructor(idUsuario, connection) {
  const [rows] = await connection.execute(
    'SELECT id_usuario, rol, estado FROM usuarios WHERE id_usuario = ? FOR UPDATE',
    [idUsuario],
  );
  return rows[0] ?? null;
}

// Clases activas del instructor ese día cuyo horario se empalma con [inicio, fin) (US1, criterio 5)
export async function countInstructorOverlaps(idInstructor, diaSemana, inicioMin, finMin, excluirId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total FROM clases c
     WHERE c.id_instructor = ? AND c.dia_semana = ? AND c.estado = 'activa' AND c.id_clase <> ?
       AND ${START_MIN} < ? AND ? < ${END_MIN}`,
    [idInstructor, diaSemana, excluirId ?? 0, finMin, inicioMin],
  );
  return Number(rows[0].total);
}

// Clases activas para generar el horario (FR-002, FR-008)
export async function listActive(connection = pool) {
  return list({ estado: 'activa' }, connection);
}
