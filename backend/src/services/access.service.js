import { env } from '../config/env.js';
import * as accessModel from '../models/access.model.js';
import * as clientModel from '../models/client.model.js';
import { getCurrentMembership } from './memberships.service.js';
import { identify } from './faces.service.js';
import { today } from '../utils/dates.js';
import { ROLES } from '../utils/roles.js';

// Módulo de control de acceso: usa el reconocimiento facial solo a través de su servicio
// (constitución, principio II).

const AUTHORIZED = 'autorizado';
const REJECTED = 'rechazado';

const MOTIVO_POR_ESTADO = {
  suspendida: 'membresia_suspendida',
  cancelada: 'membresia_cancelada',
  vencida: 'membresia_vencida',
};

// Tabla "Decisión de acceso" de data-model.md: primero la identidad, después la membresía.
// El adeudo no interviene (aclaración confirmada el 2026-10-12).
async function decide({ id_cliente: idCliente }) {
  if (!idCliente) return { resultado: REJECTED, motivo: 'rostro_no_identificado', cliente: null, membresia: null };

  const cliente = await clientModel.findById(idCliente);
  if (!cliente) return { resultado: REJECTED, motivo: 'rostro_no_identificado', cliente: null, membresia: null };
  if (cliente.estado !== 'activo') return { resultado: REJECTED, motivo: 'cliente_inactivo', cliente, membresia: null };

  const membresia = await getCurrentMembership(idCliente);
  if (membresia?.vigente) return { resultado: AUTHORIZED, motivo: null, cliente, membresia };

  const motivo = (membresia && MOTIVO_POR_ESTADO[membresia.estado_efectivo]) ?? 'sin_membresia_vigente';
  return { resultado: REJECTED, motivo, cliente, membresia };
}

// En la estación no se muestran motivo, apellido, membresía ni adeudo (FR-036)
function stationResponse(idAcceso, { resultado, cliente }) {
  if (resultado === AUTHORIZED) {
    return {
      id_acceso: idAcceso,
      resultado,
      cliente: { nombre: cliente.nombre },
      mensaje: `Acceso autorizado. ¡Bienvenido, ${cliente.nombre}!`,
    };
  }
  return { id_acceso: idAcceso, resultado, cliente: null, mensaje: 'Acceso no autorizado. Acude a recepción.' };
}

// Registra un intento desde la estación; cada intento queda guardado (FR-032 a FR-038)
export async function registerAttempt({ descriptor }, user) {
  const identificacion = await identify(descriptor);
  const decision = await decide(identificacion);
  const idCliente = decision.cliente?.id_cliente ?? null;

  // Una presentación continua frente a la cámara no genera registros duplicados
  const reciente = await accessModel.findRecentSame({
    id_cliente: idCliente,
    resultado: decision.resultado,
    segundos: env.accessDedupSeconds,
  });
  if (reciente) return stationResponse(reciente.id_acceso, decision);

  const similitud = identificacion.similitud === null ? null : Math.max(-1, identificacion.similitud).toFixed(4);
  const idAcceso = await accessModel.insert({
    id_cliente: idCliente,
    id_membresia: decision.membresia?.id_membresia ?? null,
    resultado: decision.resultado,
    motivo: decision.motivo,
    similitud,
    registrado_por: user.id_usuario,
  });
  return stationResponse(idAcceso, decision);
}

// Registro de acceso para el personal; la similitud solo la ve el administrador (FR-040)
function toView(fila, rol) {
  const view = {
    id_acceso: fila.id_acceso,
    fecha_hora: fila.fecha_hora,
    resultado: fila.resultado,
    motivo: fila.motivo,
    cliente: fila.id_cliente
      ? { id_cliente: fila.id_cliente, nombre: fila.cliente_nombre, apellido: fila.cliente_apellido }
      : null,
    registrado_por: { id_usuario: fila.registrado_por, nombre: fila.registrado_por_nombre },
  };
  if (rol === ROLES.ADMIN) view.similitud = fila.similitud;
  return view;
}

// Sin rango de fechas, se muestra el día de hoy
export async function listAccesses({ page, limit, offset, ...filters }, user) {
  const criteria = { ...filters };
  if (!criteria.desde && !criteria.hasta) {
    criteria.desde = today();
    criteria.hasta = criteria.desde;
  }
  const [rows, total] = await Promise.all([
    accessModel.list({ ...criteria, limit, offset }),
    accessModel.count(criteria),
  ]);
  return { data: rows.map((fila) => toView(fila, user.rol)), meta: { page, limit, total } };
}

// El cliente solo ve sus accesos; el identificador se toma del token (FR-040)
export async function listOwnAccesses(user, { page, limit, offset }) {
  const criteria = { id_cliente: user.id_cliente };
  const [rows, total] = await Promise.all([
    accessModel.list({ ...criteria, limit, offset }),
    accessModel.count(criteria),
  ]);
  const data = rows.map(({ id_acceso, fecha_hora, resultado, motivo }) => ({ id_acceso, fecha_hora, resultado, motivo }));
  return { data, meta: { page, limit, total } };
}
