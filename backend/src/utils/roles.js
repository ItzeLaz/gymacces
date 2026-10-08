// Roles fijos del sistema (FR-009)
export const ROLES = Object.freeze({
  ADMIN: 'administrador',
  RECEPTIONIST: 'recepcionista',
  TRAINER: 'entrenador',
  CLIENT: 'cliente',
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export const STAFF_ROLES = Object.freeze([ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.TRAINER]);
