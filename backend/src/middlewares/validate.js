import { matchedData, validationResult } from 'express-validator';
import { validationError } from '../utils/AppError.js';

// Corta la solicitud con 400 si las reglas de express-validator fallaron
export function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const details = result
      .array({ onlyFirstError: true })
      .map((error) => ({ field: error.path, message: error.msg }));
    return next(validationError(details));
  }
  // Solo los campos validados llegan a los controladores
  req.validated = matchedData(req, { locations: ['body'], includeOptionals: false });
  req.validatedQuery = matchedData(req, { locations: ['query'] });
  return next();
}
