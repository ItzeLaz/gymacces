import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Carga backend/.env sin sobrescribir variables ya definidas en el entorno
dotenv.config({ path: path.join(backendDir, '.env') });

const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'JWT_SECRET', 'CORS_ORIGIN'];

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}. Revisa backend/.env.`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET debe tener al menos 32 caracteres. Revisa backend/.env.');
  process.exit(1);
}

const isTest = process.env.NODE_ENV === 'test';

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isTest,
  port: Number(process.env.PORT) || 3000,
  db: Object.freeze({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    name: isTest ? process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test` : process.env.DB_NAME,
  }),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN,
});
