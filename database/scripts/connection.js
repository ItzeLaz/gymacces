import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Carga database/.env sin sobrescribir variables ya definidas (por ejemplo, en las pruebas)
dotenv.config({ path: path.join(currentDir, '..', '.env') });

const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'];

export function getDatabaseName() {
  return process.env.NODE_ENV === 'test'
    ? process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test`
    : process.env.DB_NAME;
}

export function checkEnv() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno de la base de datos: ${missing.join(', ')}`);
  }
}

// Crea una conexión; con withoutDatabase se conecta al servidor sin elegir base
export async function createConnection({ database, withoutDatabase = false } = {}) {
  checkEnv();
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: withoutDatabase ? undefined : (database ?? getDatabaseName()),
    multipleStatements: true,
    charset: 'utf8mb4',
  });
}

// Indica si el módulo se ejecuta directamente desde la línea de comandos
export function isMainModule(metaUrl) {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}
