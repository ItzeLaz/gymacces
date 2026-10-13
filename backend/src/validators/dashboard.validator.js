import { query } from 'express-validator';
import { dateQuery, dateRangeQuery } from './common.js';

export const DASHBOARD_PERIODS = Object.freeze(['hoy', '7d', 'mes', 'rango']);

export const dashboardRules = [
  query('periodo')
    .optional({ values: 'falsy' })
    .isIn(DASHBOARD_PERIODS)
    .withMessage('El periodo debe ser hoy, 7d, mes o rango.'),
  dateQuery('desde', 'La fecha inicial'),
  dateQuery('hasta', 'La fecha final'),
  dateRangeQuery(366),
  // Con un rango personalizado, ambas fechas son obligatorias (FR-008)
  query('periodo').custom((periodo, { req }) => {
    if (periodo === 'rango' && (!req.query.desde || !req.query.hasta)) {
      throw new Error('Indica la fecha inicial y la final del rango.');
    }
    return true;
  }),
];
