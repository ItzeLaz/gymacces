import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as userModel from '../models/user.model.js';
import { invalidCredentials } from '../utils/AppError.js';

// Hash válido para comparar cuando el correo no existe y no revelar por tiempo de respuesta
const DUMMY_HASH = bcrypt.hashSync('contrasena-inexistente-0', 10);

export async function login(correo, password) {
  const user = await userModel.findByEmail(correo);
  const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

  if (!user || !valid) {
    throw invalidCredentials();
  }
  if (user.estado !== 'activo') {
    throw invalidCredentials('Tu cuenta está desactivada. Contacta al administrador.');
  }

  const token = jwt.sign({ sub: String(user.id_usuario), rol: user.rol }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });

  const { password: _password, ...publicUser } = user;
  return { token, expiresIn: env.jwtExpiresIn, user: publicUser };
}
