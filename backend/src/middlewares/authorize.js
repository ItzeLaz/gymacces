import { forbidden } from '../utils/AppError.js';

// Permite continuar solo a los roles indicados (FR-006)
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return next(forbidden());
    }
    return next();
  };
}
