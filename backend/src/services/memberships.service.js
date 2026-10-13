import { pool, withTransaction } from '../config/db.js';
import * as clientModel from '../models/client.model.js';
import * as membershipModel from '../models/membership.model.js';
import * as typeModel from '../models/membershipType.model.js';
import { businessRule, notFound } from '../utils/AppError.js';
import { endDateFor, today } from '../utils/dates.js';
import { formatAmount, fromCents, toCents } from '../utils/money.js';
import { ROLES } from '../utils/roles.js';
import { AUDIT_ACTIONS, record } from './audit.service.js';

const OVERLAP = 'El cliente ya tiene una membresía en ese periodo. Usa la renovación.';

// Montos de una membresía: saldo = monto − pagos no cancelados; 0 si está cancelada
function amounts(fila) {
  const monto = toCents(fila.monto);
  const pagado = toCents(fila.pagado);
  const saldo = fila.estado === 'cancelada' ? 0 : Math.max(monto - pagado, 0);
  let estadoPago = 'parcial';
  if (saldo === 0) estadoPago = 'pagada';
  else if (pagado === 0) estadoPago = 'pendiente';
  return { monto: fromCents(monto), pagado: fromCents(pagado), saldo: fromCents(saldo), estado_pago: estadoPago };
}

// Forma MembershipView del contrato; el entrenador no recibe montos (FR-013)
export function toView(fila, rol) {
  if (!fila) return null;
  const view = {
    id_membresia: fila.id_membresia,
    id_cliente: fila.id_cliente,
    tipo: { id_tipo_membresia: fila.id_tipo_membresia, nombre: fila.tipo_nombre },
    fecha_inicio: fila.fecha_inicio,
    fecha_fin: fila.fecha_fin,
    estado: fila.estado,
    estado_efectivo: fila.estado_efectivo,
    vigente: Boolean(fila.vigente),
    por_iniciar: Boolean(fila.por_iniciar),
    motivo_estado: fila.motivo_estado,
  };
  if (rol === ROLES.TRAINER) return view;
  return { ...view, ...amounts(fila) };
}

// Resumen para listados de clientes: el saldo solo para administrador y recepcionista
export function toSummary(fila, rol) {
  if (!fila) return null;
  const summary = {
    estado_efectivo: fila.estado_efectivo,
    vigente: Boolean(fila.vigente),
    por_iniciar: Boolean(fila.por_iniciar),
    fecha_fin: fila.fecha_fin,
  };
  if (rol === ROLES.ADMIN || rol === ROLES.RECEPTIONIST) summary.saldo = amounts(fila).saldo;
  return summary;
}

export async function getCurrentMembership(idCliente, connection = pool) {
  return membershipModel.findCurrentByClient(idCliente, today(), connection);
}

async function lockActiveClient(idCliente, connection) {
  const cliente = await clientModel.lockById(idCliente, connection);
  if (!cliente) throw notFound('El cliente no existe.');
  if (cliente.estado !== 'activo') throw businessRule('El cliente está inactivo.');
  return cliente;
}

async function findActiveType(idTipo, connection) {
  const tipo = await typeModel.findById(idTipo, connection);
  if (!tipo) throw notFound('El tipo de membresía no existe.');
  if (tipo.estado !== 'activo') throw businessRule('El tipo de membresía está inactivo.');
  return tipo;
}

// Crea la membresía validando traslapes; se usa al asignar y al renovar
async function insertMembership(connection, { idCliente, tipo, fechaInicio, user, accion }) {
  const fechaFin = endDateFor(fechaInicio, tipo.duracion_dias);
  if ((await membershipModel.countOverlaps(idCliente, fechaInicio, fechaFin, connection)) > 0) {
    throw businessRule(OVERLAP);
  }
  const id = await membershipModel.create(
    {
      id_cliente: idCliente,
      id_tipo_membresia: tipo.id_tipo_membresia,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      monto: formatAmount(tipo.precio),
      creado_por: user.id_usuario,
    },
    connection,
  );
  await record(connection, user, accion, 'membresias', id, `${tipo.nombre}: ${fechaInicio} a ${fechaFin}`);
  return id;
}

export async function assignMembership(idCliente, { id_tipo_membresia, fecha_inicio }, user) {
  return withTransaction(async (connection) => {
    await lockActiveClient(idCliente, connection);
    const tipo = await findActiveType(id_tipo_membresia, connection);
    const hoy = today();
    const fechaInicio = fecha_inicio || hoy;
    if (fechaInicio < hoy) throw businessRule('La fecha de inicio no puede ser anterior a hoy.');
    const id = await insertMembership(connection, {
      idCliente,
      tipo,
      fechaInicio,
      user,
      accion: AUDIT_ACTIONS.MEMBERSHIP_ASSIGN,
    });
    return toView(await membershipModel.findById(id, hoy, connection), user.rol);
  });
}

export async function getClientMemberships(idCliente, user) {
  if (!(await clientModel.findById(idCliente))) throw notFound('El cliente no existe.');
  const hoy = today();
  const [historial, actual] = await Promise.all([
    membershipModel.listByClient(idCliente, hoy),
    membershipModel.findCurrentByClient(idCliente, hoy),
  ]);
  return { actual: toView(actual, user.rol), historial: historial.map((fila) => toView(fila, user.rol)) };
}

const TRANSITIONS = {
  suspendida: { from: 'activa', action: AUDIT_ACTIONS.MEMBERSHIP_SUSPEND, error: 'Solo se puede suspender una membresía activa.' },
  activa: { from: 'suspendida', action: AUDIT_ACTIONS.MEMBERSHIP_REACTIVATE, error: 'Solo se puede reactivar una membresía suspendida.' },
  cancelada: { from: null, action: AUDIT_ACTIONS.MEMBERSHIP_CANCEL },
};

// Solo el administrador cambia estados; las fechas nunca cambian (FR-009)
export async function changeMembershipStatus(id, { estado, motivo }, user) {
  return withTransaction(async (connection) => {
    if (!(await membershipModel.lockById(id, connection))) throw notFound('La membresía no existe.');
    const hoy = today();
    const actual = await membershipModel.findById(id, hoy, connection);
    if (actual.estado === 'cancelada') {
      throw businessRule('La membresía está cancelada y ya no se puede modificar.');
    }
    const transition = TRANSITIONS[estado];
    if (estado !== 'cancelada' && actual.estado_efectivo === 'vencida') {
      throw businessRule('La membresía ya venció; no se puede suspender ni reactivar.');
    }
    if (transition.from && actual.estado !== transition.from) throw businessRule(transition.error);

    await membershipModel.updateStatus(id, estado, motivo, connection);
    await record(connection, user, transition.action, 'membresias', id, `Motivo: ${motivo}`);
    return toView(await membershipModel.findById(id, hoy, connection), user.rol);
  });
}
