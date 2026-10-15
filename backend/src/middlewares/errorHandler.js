import { AppError } from '../utils/AppError.js';

// Manejador central de errores: nunca expone trazas ni SQL (FR-027)
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    const body = { code: error.code, message: error.message };
    if (error.details) body.details = error.details;
    return res.status(error.status).json({ error: body });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'El cuerpo de la solicitud no es un JSON válido.' },
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'VALIDATION_ERROR', message: 'La solicitud es demasiado grande.' },
    });
  }

  console.error('Error no controlado:', error);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
    },
  });
}
