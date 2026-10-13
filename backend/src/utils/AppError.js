// Error controlado de la aplicación: se responde al cliente tal cual
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const validationError = (details, message = 'Revisa los datos marcados.') =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const invalidCredentials = (message = 'Correo o contraseña incorrectos.') =>
  new AppError(401, 'INVALID_CREDENTIALS', message);

export const unauthenticated = (
  message = 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.',
) => new AppError(401, 'UNAUTHENTICATED', message);

export const forbidden = (message = 'No tienes permiso para realizar esta acción.') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'El recurso solicitado no existe.') =>
  new AppError(404, 'NOT_FOUND', message);

export const conflict = (message) => new AppError(409, 'CONFLICT', message);

// Solicitud válida en formato que viola una regla de negocio (contracts/api.md)
export const businessRule = (message) => new AppError(422, 'BUSINESS_RULE', message);
