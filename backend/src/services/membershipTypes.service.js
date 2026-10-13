import { withTransaction } from '../config/db.js';
import * as typeModel from '../models/membershipType.model.js';
import { conflict, notFound } from '../utils/AppError.js';
import { formatAmount } from '../utils/money.js';
import { ROLES } from '../utils/roles.js';
import { AUDIT_ACTIONS, record } from './audit.service.js';

const DUPLICATE_NAME = 'Ya existe un tipo de membresía con ese nombre.';

function toView(tipo) {
  return { ...tipo, precio: formatAmount(tipo.precio) };
}

async function findOrFail(id, connection) {
  const tipo = await typeModel.findById(id, connection);
  if (!tipo) throw notFound('El tipo de membresía no existe.');
  return tipo;
}

async function ensureNameAvailable(nombre, exceptId, connection) {
  if (!nombre) return;
  const existing = await typeModel.findByName(nombre, connection);
  if (existing && existing.id_tipo_membresia !== exceptId) throw conflict(DUPLICATE_NAME);
}

// La llave única protege de una carrera entre dos altas con el mismo nombre
function rethrowDuplicate(error) {
  if (error.code === 'ER_DUP_ENTRY') throw conflict(DUPLICATE_NAME);
  throw error;
}

// El recepcionista solo consulta los tipos activos (FR-002)
export async function listTypes({ estado, page, limit, offset }, user) {
  const filters = { estado: user.rol === ROLES.ADMIN ? estado : 'activo' };
  const [rows, total] = await Promise.all([
    typeModel.list({ ...filters, limit, offset }),
    typeModel.count(filters),
  ]);
  return { data: rows.map(toView), meta: { page, limit, total } };
}

export async function createType(datos, user) {
  return withTransaction(async (connection) => {
    await ensureNameAvailable(datos.nombre, null, connection);
    const id = await typeModel.create(datos, connection).catch(rethrowDuplicate);
    await record(connection, user, AUDIT_ACTIONS.TYPE_CREATE, 'tipos_membresia', id, `Tipo "${datos.nombre}"`);
    return toView(await typeModel.findById(id, connection));
  });
}

// Cambiar precio o duración no altera las membresías ya asignadas (FR-004)
export async function updateType(id, changes, user) {
  return withTransaction(async (connection) => {
    await findOrFail(id, connection);
    await ensureNameAvailable(changes.nombre, id, connection);
    await typeModel.update(id, changes, connection).catch(rethrowDuplicate);
    const campos = Object.keys(changes).join(', ') || 'ninguno';
    await record(connection, user, AUDIT_ACTIONS.TYPE_UPDATE, 'tipos_membresia', id, `Campos: ${campos}`);
    return toView(await typeModel.findById(id, connection));
  });
}

export async function changeTypeStatus(id, estado, user) {
  return withTransaction(async (connection) => {
    await findOrFail(id, connection);
    await typeModel.updateStatus(id, estado, connection);
    await record(connection, user, AUDIT_ACTIONS.TYPE_STATUS, 'tipos_membresia', id, `Nuevo estado: ${estado}`);
    return toView(await typeModel.findById(id, connection));
  });
}
