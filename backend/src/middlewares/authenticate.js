import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as userModel from '../models/user.model.js';
import { unauthenticated } from '../utils/AppError.js';

// Verifica el token y vuelve a leer el usuario en cada solicitud (research R-04)
export async function authenticate(req, res, next) {
  const header = req.get('Authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(unauthenticated());
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return next(unauthenticated());
  }

  const user = await userModel.findById(Number(payload.sub));
  if (!user || user.estado !== 'activo') {
    return next(unauthenticated());
  }

  req.user = {
    id_usuario: user.id_usuario,
    nombre: user.nombre,
    correo: user.correo,
    rol: user.rol,
    estado: user.estado,
    id_cliente: user.id_cliente,
  };
  return next();
}
