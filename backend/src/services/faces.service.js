import { env } from '../config/env.js';
import { pool, withTransaction } from '../config/db.js';
import * as clientModel from '../models/client.model.js';
import * as faceModel from '../models/face.model.js';
import { businessRule, notFound } from '../utils/AppError.js';
import { decryptSamples, encryptSamples } from '../utils/faceCrypto.js';
import { bestMatch, FACE_MODEL_VERSION, rankCandidates } from '../utils/faceMatching.js';
import { AUDIT_ACTIONS, record } from './audit.service.js';

// Módulo de reconocimiento facial: es el único que descifra descriptores y nunca los devuelve
// fuera del backend (FR-030, constitución principio II).

function toStatus(fila) {
  if (!fila) return { registrado: false };
  return {
    registrado: true,
    estado: fila.estado,
    creado_en: fila.creado_en,
    registrado_por: { id_usuario: fila.registrado_por, nombre: fila.registrado_por_nombre },
  };
}

// Descifra los registros activos del modelo vigente; un registro dañado se omite sin exponer datos
async function loadCandidates(connection = pool) {
  const filas = await faceModel.listActiveEncrypted(connection);
  const candidatos = [];
  for (const fila of filas) {
    if (fila.version_modelo !== FACE_MODEL_VERSION) continue;
    try {
      candidatos.push({ id_cliente: fila.id_cliente, muestras: decryptSamples(fila) });
    } catch {
      console.error('No se pudo descifrar un registro facial; revisa FACE_DATA_KEY.');
    }
  }
  return candidatos;
}

export async function hasActiveFace(idCliente) {
  return Boolean(await faceModel.findActiveStatusByClient(idCliente));
}

export async function getFaceStatus(idCliente) {
  if (!(await clientModel.findById(idCliente))) throw notFound('El cliente no existe.');
  return toStatus(await faceModel.findActiveStatusByClient(idCliente));
}

// Registra o reemplaza la información facial; devuelve { status, replaced }
export async function registerFace(idCliente, { muestras, version_modelo: versionModelo }, user) {
  return withTransaction(async (connection) => {
    const cliente = await clientModel.lockById(idCliente, connection);
    if (!cliente) throw notFound('El cliente no existe.');
    if (cliente.estado !== 'activo') throw businessRule('El cliente está inactivo.');

    // Un rostro no puede quedar asociado a dos clientes (FR-027)
    const otros = (await loadCandidates(connection)).filter((c) => c.id_cliente !== idCliente);
    const duplicado = muestras.some((muestra) => {
      const [first] = rankCandidates(muestra, otros);
      return first && first.similitud >= env.face.threshold;
    });
    if (duplicado) throw businessRule('Este rostro ya está registrado para otro cliente.');

    const anterior = await faceModel.lockActiveByClient(idCliente, connection);
    if (anterior) await faceModel.deactivate(anterior.id_rostro, connection);

    const id = await faceModel.insert(
      { id_cliente: idCliente, ...encryptSamples(muestras), version_modelo: versionModelo, registrado_por: user.id_usuario },
      connection,
    );
    const accion = anterior ? AUDIT_ACTIONS.FACE_REPLACE : AUDIT_ACTIONS.FACE_REGISTER;
    await record(connection, user, accion, 'rostros', id, `Cliente ${idCliente}`);

    return {
      status: toStatus(await faceModel.findActiveStatusByClient(idCliente, connection)),
      replaced: Boolean(anterior),
    };
  });
}

export async function deactivateFace(idCliente, user) {
  return withTransaction(async (connection) => {
    const activo = await faceModel.lockActiveByClient(idCliente, connection);
    if (!activo) throw notFound('El cliente no tiene información facial activa.');
    await faceModel.deactivate(activo.id_rostro, connection);
    await record(connection, user, AUDIT_ACTIONS.FACE_DEACTIVATE, 'rostros', activo.id_rostro, `Cliente ${idCliente}`);
    return toStatus(null);
  });
}

// Identifica a un cliente en el punto de acceso. Devuelve { id_cliente, similitud }, con
// id_cliente null si no hay coincidencia válida; similitud es la mejor obtenida (para calibrar).
export async function identify(descriptor) {
  if (!descriptor) return { id_cliente: null, similitud: null };
  const candidatos = await loadCandidates();
  const match = bestMatch(descriptor, candidatos, env.face);
  if (match) return match;
  const [first] = rankCandidates(descriptor, candidatos);
  return { id_cliente: null, similitud: first ? first.similitud : null };
}

