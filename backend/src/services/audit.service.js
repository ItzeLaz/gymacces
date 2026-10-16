import * as auditModel from '../models/audit.model.js';

// Catálogo de acciones auditadas: Sprint 2 (FR-042) y clases grupales (feature 004, FR-012)
export const AUDIT_ACTIONS = Object.freeze({
  TYPE_CREATE: 'tipo_membresia.crear',
  TYPE_UPDATE: 'tipo_membresia.modificar',
  TYPE_STATUS: 'tipo_membresia.cambiar_estado',
  MEMBERSHIP_ASSIGN: 'membresia.asignar',
  MEMBERSHIP_RENEW: 'membresia.renovar',
  MEMBERSHIP_SUSPEND: 'membresia.suspender',
  MEMBERSHIP_REACTIVATE: 'membresia.reactivar',
  MEMBERSHIP_CANCEL: 'membresia.cancelar',
  PAYMENT_REGISTER: 'pago.registrar',
  PAYMENT_CANCEL: 'pago.anular',
  FACE_REGISTER: 'rostro.registrar',
  FACE_REPLACE: 'rostro.reemplazar',
  FACE_DEACTIVATE: 'rostro.desactivar',
  CLASS_CREATE: 'clase.crear',
  CLASS_UPDATE: 'clase.modificar',
  CLASS_DEACTIVATE: 'clase.desactivar',
  RESERVATION_CREATE: 'reserva.registrar',
  RESERVATION_CANCEL: 'reserva.cancelar',
});

const VALID_ACTIONS = new Set(Object.values(AUDIT_ACTIONS));

// Se llama con la conexión de la transacción activa para confirmar o revertir junto con la acción.
// La descripción nunca debe incluir datos biométricos, contraseñas ni tokens.
export async function record(connection, user, accion, entidad, idRegistro, descripcion = null) {
  if (!VALID_ACTIONS.has(accion)) throw new Error(`Acción de auditoría desconocida: ${accion}`);
  await auditModel.insert(
    {
      id_usuario: user.id_usuario,
      accion,
      entidad,
      id_registro: idRegistro,
      descripcion: descripcion ? String(descripcion).slice(0, 500) : null,
    },
    connection,
  );
}
