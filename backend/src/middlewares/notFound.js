import { notFound as notFoundError } from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(notFoundError('La ruta solicitada no existe.'));
}
