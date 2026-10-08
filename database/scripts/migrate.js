import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection, getDatabaseName, isMainModule } from './connection.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

// Aplica en orden las migraciones pendientes y devuelve los nombres aplicados
export async function runMigrations(databaseName = getDatabaseName(), { silent = false } = {}) {
  const log = silent ? () => {} : console.log;

  const server = await createConnection({ withoutDatabase: true });
  try {
    await server.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await server.end();
  }

  const connection = await createConnection({ database: databaseName });
  const applied = [];
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre VARCHAR(255) NOT NULL PRIMARY KEY,
        aplicada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [rows] = await connection.query('SELECT nombre FROM schema_migrations');
    const done = new Set(rows.map((row) => row.nombre));
    const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await connection.query(sql);
      await connection.execute('INSERT INTO schema_migrations (nombre) VALUES (?)', [file]);
      applied.push(file);
      log(`Migración aplicada: ${file}`);
    }

    if (applied.length === 0) log(`La base "${databaseName}" ya está al día.`);
    return applied;
  } finally {
    await connection.end();
  }
}

if (isMainModule(import.meta.url)) {
  runMigrations().catch((error) => {
    console.error(`No se pudieron aplicar las migraciones: ${error.message}`);
    process.exitCode = 1;
  });
}
