import { body } from 'express-validator';
import { dateField, idParam, motivoField } from './common.js';

const tipoField = () =>
  body('id_tipo_membresia')
    .isInt({ min: 1 })
    .withMessage('Selecciona un tipo de membresía válido.')
    .toInt();

export const assignMembershipRules = [
  idParam(),
  tipoField(),
  dateField('fecha_inicio', 'La fecha de inicio').optional({ values: 'falsy' }),
];

export const listClientMembershipsRules = [idParam()];

export const membershipStatusRules = [
  idParam(),
  body('estado')
    .isIn(['suspendida', 'activa', 'cancelada'])
    .withMessage('El estado debe ser "suspendida", "activa" o "cancelada".'),
  motivoField(),
];
