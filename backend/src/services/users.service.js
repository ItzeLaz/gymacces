import bcrypt from 'bcrypt';
import { withTransaction } from '../config/db.js';
import * as userModel from '../models/user.model.js';
import * as clientModel from '../models/client.model.js';
import { conflict, notFound, validationError } from '../utils/AppError.js';
import { ROLES } from '../utils/roles.js';

const BCRYPT_COST = 10;
const LAST_ADMIN = 'Debe existir al menos un administrador activo.';

async function ensureEmailAvailable(correo, exceptId, connection) {
  const existing = await userModel.findByEmail(correo, connection);
  if (existing && existing.id_usuario !== exceptId) {
    throw conflict('Ya existe un usuario con ese correo.');
  }
}

// Valida el cliente que se vinculará a una cuenta con rol cliente (FR-013)
async function resolveLinkedClient(idCliente, exceptUserId, connection) {
  const cliente = await clientModel.findById(idCliente, connection);
  if (!cliente) throw notFound('El cliente indicado no existe.');

  const owner = await userModel.findByClientId(idCliente, connection);
  if (owner && owner.id_usuario !== exceptUserId) {
    throw conflict('Este cliente ya tiene una cuenta.');
  }
  if (!cliente.correo) {
    throw conflict('El cliente necesita un correo registrado para tener cuenta.');
  }
  return cliente;
}

// Impide quedarse sin administradores activos (FR-014, research R-09)
async function ensureAdminRemains(target, nextRol, nextEstado, connection) {
  const wasActiveAdmin = target.rol === ROLES.ADMIN && target.estado === 'activo';
  const remainsActiveAdmin = nextRol === ROLES.ADMIN && nextEstado === 'activo';
  if (!wasActiveAdmin || remainsActiveAdmin) return;

  const activeAdmins = await userModel.lockActiveAdmins(connection);
  if (activeAdmins.filter((id) => id !== target.id_usuario).length === 0) {
    throw conflict(LAST_ADMIN);
  }
}

export async function listUsers({ search, rol, estado, page, limit, offset }) {
  const filters = { search, rol, estado };
  const [data, total] = await Promise.all([
    userModel.list({ ...filters, limit, offset }),
    userModel.count(filters),
  ]);
  return { data, meta: { page, limit, total } };
}

export async function getUser(id) {
  const user = await userModel.findById(id);
  if (!user) throw notFound('El usuario no existe.');
  return user;
}

export async function createUser({ nombre, correo, password, rol, id_cliente }) {
  return withTransaction(async (connection) => {
    let email = correo;
    let clientId = null;

    if (rol === ROLES.CLIENT) {
      const cliente = await resolveLinkedClient(id_cliente, null, connection);
      email = cliente.correo;
      clientId = cliente.id_cliente;
    }

    await ensureEmailAvailable(email, null, connection);
    const hash = await bcrypt.hash(password, BCRYPT_COST);
    const id = await userModel.create(
      { nombre, correo: email, password: hash, rol, id_cliente: clientId },
      connection,
    );
    return userModel.findById(id, connection);
  });
}

export async function updateUser(id, changes) {
  return withTransaction(async (connection) => {
    const target = await userModel.findById(id, connection);
    if (!target) throw notFound('El usuario no existe.');

    const nextRol = changes.rol ?? target.rol;
    const fields = {};

    if (changes.nombre !== undefined) fields.nombre = changes.nombre;
    if (changes.password !== undefined) {
      fields.password = await bcrypt.hash(changes.password, BCRYPT_COST);
    }
    if (changes.rol !== undefined) fields.rol = changes.rol;

    if (nextRol === ROLES.CLIENT) {
      const idCliente = changes.id_cliente ?? target.id_cliente;
      if (!idCliente) {
        throw validationError([
          { field: 'id_cliente', message: 'Para el rol cliente debes indicar el cliente vinculado.' },
        ]);
      }
      const cliente = await resolveLinkedClient(idCliente, target.id_usuario, connection);
      fields.id_cliente = cliente.id_cliente;
      fields.correo = cliente.correo;
    } else {
      if (changes.id_cliente !== undefined && changes.id_cliente !== null) {
        throw validationError([
          {
            field: 'id_cliente',
            message: 'Solo los usuarios con rol cliente pueden vincularse a un cliente.',
          },
        ]);
      }
      fields.id_cliente = null;
      if (changes.correo !== undefined) fields.correo = changes.correo;
    }

    if (fields.correo !== undefined) {
      await ensureEmailAvailable(fields.correo, target.id_usuario, connection);
    }

    await ensureAdminRemains(target, nextRol, target.estado, connection);
    await userModel.update(id, fields, connection);
    return userModel.findById(id, connection);
  });
}

export async function changeUserStatus(id, estado, currentUser) {
  return withTransaction(async (connection) => {
    const target = await userModel.findById(id, connection);
    if (!target) throw notFound('El usuario no existe.');

    if (estado === 'inactivo' && target.id_usuario === currentUser.id_usuario) {
      throw conflict('No puedes desactivar tu propia cuenta.');
    }

    await ensureAdminRemains(target, target.rol, estado, connection);
    await userModel.update(id, { estado }, connection);
    return userModel.findById(id, connection);
  });
}
