import * as clientModel from '../models/client.model.js';
import { conflict, notFound } from '../utils/AppError.js';
import { ROLES } from '../utils/roles.js';
import { getCurrentMembership, toSummary, toView } from './memberships.service.js';
import { hasActiveFace } from './faces.service.js';
import { getOwnPayments } from './payments.service.js';

const DUPLICATE_EMAIL = 'Ya existe un cliente con ese correo.';

// El entrenador solo recibe datos básicos (FR-023, research R-10)
function projectForRole(cliente, rol) {
  if (rol === ROLES.TRAINER) {
    const { id_cliente, nombre, apellido, estado } = cliente;
    return { id_cliente, nombre, apellido, estado };
  }
  return cliente;
}

// Agrega el resumen de la membresía actual que ve el personal (FR-013)
async function withMembership(cliente, rol) {
  const actual = await getCurrentMembership(cliente.id_cliente);
  return { ...projectForRole(cliente, rol), membresia_actual: toSummary(actual, rol) };
}

async function ensureEmailAvailable(correo, exceptId) {
  if (!correo) return;
  const existing = await clientModel.findByEmail(correo);
  if (existing && existing.id_cliente !== exceptId) throw conflict(DUPLICATE_EMAIL);
}

async function findOrFail(id) {
  const cliente = await clientModel.findById(id);
  if (!cliente) throw notFound('El cliente no existe.');
  return cliente;
}

// Registrar un cliente nunca crea una cuenta de usuario (FR-013)
export async function createClient(datos) {
  const cliente = { ...datos, correo: datos.correo || null, direccion: datos.direccion || null };
  await ensureEmailAvailable(cliente.correo);
  const id = await clientModel.create(cliente);
  return clientModel.findById(id);
}

export async function updateClient(id, changes) {
  await findOrFail(id);
  const fields = { ...changes };
  if ('correo' in fields) fields.correo = fields.correo || null;
  await ensureEmailAvailable(fields.correo, id);
  await clientModel.update(id, fields);
  return clientModel.findById(id);
}

export async function changeClientStatus(id, estado) {
  await findOrFail(id);
  await clientModel.updateStatus(id, estado);
  return clientModel.findById(id);
}

export async function listClients({ search, estado, page, limit, offset }, rol) {
  const filters = { search, estado };
  const [rows, total] = await Promise.all([
    clientModel.list({ ...filters, limit, offset }),
    clientModel.count(filters),
  ]);
  const data = await Promise.all(rows.map((cliente) => withMembership(cliente, rol)));
  return { data, meta: { page, limit, total } };
}

export async function getClient(id, rol) {
  const cliente = await withMembership(await findOrFail(id), rol);
  // Solo el personal que registra rostros sabe si existe el registro (FR-025)
  if (rol === ROLES.ADMIN || rol === ROLES.RECEPTIONIST) cliente.rostro_registrado = await hasActiveFace(id);
  return cliente;
}

// Usa siempre el cliente vinculado al usuario autenticado (FR-024, RN-14)
export async function getOwnProfile(user) {
  const cliente = await findOrFail(user.id_cliente);
  const [membresia, { pagos, adeudo }] = await Promise.all([
    getCurrentMembership(cliente.id_cliente),
    getOwnPayments(cliente.id_cliente),
  ]);
  return { cliente, membresia: toView(membresia, ROLES.CLIENT), pagos, adeudo };
}
