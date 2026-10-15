import { withTransaction } from '../config/db.js';
import * as clientModel from '../models/client.model.js';
import * as debtModel from '../models/debt.model.js';
import * as membershipModel from '../models/membership.model.js';
import * as paymentModel from '../models/payment.model.js';
import { businessRule, notFound } from '../utils/AppError.js';
import { today } from '../utils/dates.js';
import { formatAmount, fromCents, toCents } from '../utils/money.js';
import { AUDIT_ACTIONS, record } from './audit.service.js';
import { toView as toMembershipView } from './memberships.service.js';

// Forma PaymentView del contrato
export function toView(fila) {
  return {
    id_pago: fila.id_pago,
    id_cliente: fila.id_cliente,
    id_membresia: fila.id_membresia,
    cliente: { nombre: fila.cliente_nombre, apellido: fila.cliente_apellido },
    monto: formatAmount(fila.monto),
    metodo_pago: fila.metodo_pago,
    fecha_pago: fila.fecha_pago,
    estado: fila.estado,
    registrado_por: fila.registrado_por ? { id_usuario: fila.registrado_por, nombre: fila.registrado_por_nombre } : null,
    motivo_anulacion: fila.motivo_anulacion,
    anulado_en: fila.anulado_en,
  };
}

// El saldo se recalcula con la membresía bloqueada para que dos pagos simultáneos
// nunca lo dejen negativo (research R-09)
export async function registerPayment({ id_membresia, monto, metodo_pago }, user) {
  return withTransaction(async (connection) => {
    if (!(await membershipModel.lockById(id_membresia, connection))) throw notFound('La membresía no existe.');
    const hoy = today();
    const membresia = await membershipModel.findById(id_membresia, hoy, connection);
    if (membresia.estado === 'cancelada') throw businessRule('No se pueden registrar pagos en una membresía cancelada.');

    const saldo = toCents(toMembershipView(membresia, user.rol).saldo);
    if (saldo === 0) throw businessRule('La membresía no tiene saldo pendiente.');
    if (toCents(monto) > saldo) throw businessRule(`El monto supera el saldo pendiente de ${fromCents(saldo)}.`);

    const id = await paymentModel.create(
      { id_cliente: membresia.id_cliente, id_membresia, monto, metodo_pago, registrado_por: user.id_usuario },
      connection,
    );
    await record(connection, user, AUDIT_ACTIONS.PAYMENT_REGISTER, 'pagos', id, `${monto} en ${metodo_pago}, membresía ${id_membresia}`);

    return {
      pago: toView(await paymentModel.findById(id, connection)),
      membresia: toMembershipView(await membershipModel.findById(id_membresia, hoy, connection), user.rol),
    };
  });
}

export async function cancelPayment(id, { motivo }, user) {
  return withTransaction(async (connection) => {
    const pago = await paymentModel.lockById(id, connection);
    if (!pago) throw notFound('El pago no existe.');
    if (pago.estado === 'cancelado') throw businessRule('El pago ya está anulado.');
    await paymentModel.cancel(id, { motivo, anulado_por: user.id_usuario }, connection);
    await record(connection, user, AUDIT_ACTIONS.PAYMENT_CANCEL, 'pagos', id, `Motivo: ${motivo}`);
    return toView(await paymentModel.findById(id, connection));
  });
}

// Suma de los saldos de las membresías no canceladas (FR-024)
export function debtOf(membresias) {
  return fromCents(membresias.reduce((total, membresia) => total + toCents(membresia.saldo), 0));
}

// Pagos, membresías con saldo y adeudo de un cliente (FR-022)
export async function getClientPayments(idCliente, user) {
  if (!(await clientModel.findById(idCliente))) throw notFound('El cliente no existe.');
  const [pagos, filas] = await Promise.all([
    paymentModel.listByClient(idCliente),
    membershipModel.listByClient(idCliente, today()),
  ]);
  const membresias = filas.map((fila) => toMembershipView(fila, user.rol));
  return { pagos: pagos.map(toView), membresias, adeudo: debtOf(membresias) };
}

// Historial general de pagos con el total pagado del filtro (FR-020)
export async function listPayments({ page, limit, offset, ...filters }) {
  const [rows, total, totalPagado] = await Promise.all([
    paymentModel.list({ ...filters, limit, offset }),
    paymentModel.count(filters),
    paymentModel.sumPaid(filters),
  ]);
  return { data: rows.map(toView), meta: { page, limit, total, total_pagado: formatAmount(totalPagado) } };
}

// Clientes con adeudo, de mayor a menor, con el desglose por membresía (FR-021)
export async function listDebts({ search, page, limit, offset }) {
  const [rows, { total, totalAdeudo }] = await Promise.all([
    debtModel.listDebtors({ search, limit, offset }),
    debtModel.countDebtors({ search }),
  ]);
  const detalle = await debtModel.listByClients(rows.map((row) => row.id_cliente));
  const data = rows.map((row) => ({
    id_cliente: row.id_cliente,
    nombre: row.nombre,
    apellido: row.apellido,
    adeudo: formatAmount(row.adeudo),
    membresias: detalle
      .filter((item) => item.id_cliente === row.id_cliente)
      .map((item) => ({ id_membresia: item.id_membresia, tipo: item.tipo, saldo: formatAmount(item.saldo) })),
  }));
  return { data, meta: { page, limit, total, total_adeudo: formatAmount(totalAdeudo) } };
}

// Pagos y adeudo propios del cliente autenticado (FR-023)
export async function getOwnPayments(idCliente) {
  const [pagos, filas] = await Promise.all([
    paymentModel.listByClient(idCliente),
    membershipModel.listByClient(idCliente, today()),
  ]);
  const membresias = filas.map((fila) => toMembershipView(fila));
  return { pagos: pagos.map(toView), adeudo: debtOf(membresias) };
}
