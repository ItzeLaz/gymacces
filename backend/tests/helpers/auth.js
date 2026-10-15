import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../../src/config/env.js';

export async function loginAs(app, correo, password) {
  const response = await request(app).post('/api/auth/login').send({ correo, password });
  if (response.status !== 200) {
    throw new Error(`No se pudo iniciar sesión como ${correo}: ${response.status}`);
  }
  return response.body.data.token;
}

export function tokenFor(usuario, options = {}) {
  return jwt.sign({ sub: String(usuario.id_usuario), rol: usuario.rol }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '1h',
    ...options,
  });
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
