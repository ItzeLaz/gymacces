import { pool } from '../../src/config/db.js';
import { addDays, today } from '../../src/utils/dates.js';
import { isoWeekday } from '../../src/utils/sessions.js';
import { createUser } from './db.js';

let counter = 0;
const unique = () => `${Date.now().toString(36)}${(counter += 1)}`;

export const DESCRIPTOR_LENGTH = 1024;

export async function createMembershipType(datos = {}) {
  const tipo = {
    nombre: `Tipo ${unique()}`,
    descripcion: null,
    duracion_dias: 30,
    precio: '450.00',
    estado: 'activo',
    ...datos,
  };
  const [result] = await pool.execute(
    'INSERT INTO tipos_membresia (nombre, descripcion, duracion_dias, precio, estado) VALUES (?, ?, ?, ?, ?)',
    [tipo.nombre, tipo.descripcion, tipo.duracion_dias, tipo.precio, tipo.estado],
  );
  return { ...tipo, id_tipo_membresia: result.insertId };
}

// Inserción directa: permite fechas pasadas para probar membresías vencidas
export async function createMembership({ id_cliente, id_tipo_membresia, ...datos }) {
  const membresia = {
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-01-30',
    monto: '450.00',
    estado: 'activa',
    ...datos,
  };
  const [result] = await pool.execute(
    'INSERT INTO membresias (id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, monto, estado) VALUES (?, ?, ?, ?, ?, ?)',
    [id_cliente, id_tipo_membresia, membresia.fecha_inicio, membresia.fecha_fin, membresia.monto, membresia.estado],
  );
  return { ...membresia, id_cliente, id_tipo_membresia, id_membresia: result.insertId };
}

export async function createPayment({ id_cliente, id_membresia, ...datos }) {
  const pago = { monto: '100.00', metodo_pago: 'efectivo', estado: 'pagado', fecha_pago: null, ...datos };
  const [result] = await pool.execute(
    `INSERT INTO pagos (id_cliente, id_membresia, monto, metodo_pago, estado, fecha_pago)
     VALUES (?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
    [id_cliente, id_membresia, pago.monto, pago.metodo_pago, pago.estado, pago.fecha_pago],
  );
  return { ...pago, id_cliente, id_membresia, id_pago: result.insertId };
}

export async function createAccess({ id_cliente = null, resultado, motivo = null, fecha_hora = null, registrado_por }) {
  const [result] = await pool.execute(
    `INSERT INTO accesos (id_cliente, resultado, motivo, registrado_por, fecha_hora)
     VALUES (?, ?, ?, ?, COALESCE(?, NOW(3)))`,
    [id_cliente, resultado, motivo, registrado_por, fecha_hora],
  );
  return { id_acceso: result.insertId, id_cliente, resultado, motivo };
}

// Generador pseudoaleatorio determinista (mulberry32)
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return vector.map((value) => value / norm);
}

// Vector unitario determinista; dos semillas distintas dan similitud cercana a 0
export function syntheticDescriptor(seed) {
  const next = random(seed);
  return normalize(Array.from({ length: DESCRIPTOR_LENGTH }, () => next() * 2 - 1));
}

// Variación del mismo "rostro": con ruido 0.3 la similitud queda alrededor de 0.95
export function nearDescriptor(base, noise = 0.3, seed = 99) {
  const offset = syntheticDescriptor(seed);
  return normalize(base.map((value, index) => value + noise * offset[index]));
}

// Tres muestras cercanas entre sí, como un registro facial real
export function sampleSet(seed) {
  const base = syntheticDescriptor(seed);
  return [nearDescriptor(base, 0.2, seed + 1), nearDescriptor(base, 0.2, seed + 2), nearDescriptor(base, 0.2, seed + 3)];
}

// Usuario con rol entrenador para impartir clases (feature 004)
export async function createTrainer(datos = {}) {
  return createUser({ nombre: `Entrenador ${unique()}`, rol: 'entrenador', ...datos });
}

// Inserción directa de una clase; por omisión se imparte el día de mañana a las 07:00
export async function createClass({ id_instructor, creado_por, ...datos }) {
  const clase = {
    nombre: 'Spinning',
    dia_semana: isoWeekday(addDays(today(), 1)),
    hora_inicio: '07:00',
    duracion_minutos: 45,
    cupo_maximo: 20,
    estado: 'activa',
    ...datos,
  };
  const [result] = await pool.execute(
    `INSERT INTO clases (nombre, id_instructor, dia_semana, hora_inicio, duracion_minutos, cupo_maximo, estado, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      clase.nombre,
      id_instructor,
      clase.dia_semana,
      clase.hora_inicio,
      clase.duracion_minutos,
      clase.cupo_maximo,
      clase.estado,
      creado_por ?? id_instructor,
    ],
  );
  return { ...clase, id_instructor, id_clase: result.insertId };
}

// Inserción directa de una reserva, sin las validaciones del servicio (para preparar escenarios)
export async function createReservation({ id_clase, fecha_sesion, id_cliente, registrado_por, ...datos }) {
  const cancelada = datos.estado === 'cancelada';
  const presente = datos.asistencia === 'presente';
  const reserva = {
    estado: 'activa',
    asistencia: 'sin_registrar',
    registrada_en_curso: 0,
    ...datos,
  };
  const [result] = await pool.execute(
    `INSERT INTO reservas (id_clase, fecha_sesion, id_cliente, estado, asistencia, registrada_en_curso,
       registrado_por, cancelado_por, cancelado_en, asistencia_por, asistencia_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_clase,
      fecha_sesion,
      id_cliente,
      reserva.estado,
      reserva.asistencia,
      reserva.registrada_en_curso,
      registrado_por,
      cancelada ? registrado_por : null,
      cancelada ? new Date() : null,
      presente ? registrado_por : null,
      presente ? new Date() : null,
    ],
  );
  return { ...reserva, id_clase, fecha_sesion, id_cliente, id_reserva: result.insertId };
}
