import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Carga backend/.env sin sobrescribir variables ya definidas en el entorno
dotenv.config({ path: path.join(backendDir, '.env') });

const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'JWT_SECRET', 'CORS_ORIGIN', 'FACE_DATA_KEY'];

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Faltan variables de entorno obligatorias: ${missing.join(', ')}. Revisa backend/.env.`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET debe tener al menos 32 caracteres. Revisa backend/.env.');
  process.exit(1);
}

// Llave AES-256 de los descriptores faciales: 32 bytes en base64 (research R-05)
const faceKey = Buffer.from(process.env.FACE_DATA_KEY, 'base64');
if (faceKey.length !== 32) {
  console.error('FACE_DATA_KEY debe ser una llave de 32 bytes en base64. Revisa backend/.env.');
  process.exit(1);
}

// Lee un número opcional dentro de un rango; termina el proceso si no es válido
function numberSetting(name, fallback, { min, max, integer = false }) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    console.error(`${name} debe ser un número entre ${min} y ${max}. Revisa backend/.env.`);
    process.exit(1);
  }
  return value;
}

const timezone = process.env.APP_TIMEZONE || 'America/Mexico_City';
try {
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
} catch {
  console.error(`APP_TIMEZONE no es una zona horaria válida: ${timezone}. Revisa backend/.env.`);
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
  face: Object.freeze({
    key: faceKey,
    threshold: numberSetting('FACE_MATCH_THRESHOLD', 0.6, { min: 0, max: 1 }),
    margin: numberSetting('FACE_MATCH_MARGIN', 0.05, { min: 0, max: 1 }),
  }),
  accessDedupSeconds: numberSetting('ACCESS_DEDUP_SECONDS', 10, { min: 0, max: 3600, integer: true }),
  timezone,
});
