import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: false,
});

// XAMPP trae MariaDB en modo no estricto: un ENUM inválido se guardaría como '' sin error.
// El modo estricto hace que la base rechace valores fuera de sus restricciones.
pool.pool.on('connection', (connection) => {
  connection.query("SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',STRICT_TRANS_TABLES')");
});

// Ejecuta el callback dentro de una transacción con una conexión propia
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
