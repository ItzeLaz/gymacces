import { createConnection, getDatabaseName, isMainModule } from './connection.js';
import { runMigrations } from './migrate.js';

// Borra y recrea la base de datos. Solo para desarrollo y pruebas.
export async function resetDatabase(databaseName = getDatabaseName(), { silent = false } = {}) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El reinicio de la base de datos no está permitido en producción.');
  }

  const server = await createConnection({ withoutDatabase: true });
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  } finally {
    await server.end();
  }

  if (!silent) console.log(`Base "${databaseName}" eliminada. Recreando...`);
  return runMigrations(databaseName, { silent });
}

if (isMainModule(import.meta.url)) {
  resetDatabase().catch((error) => {
    console.error(`No se pudo reiniciar la base de datos: ${error.message}`);
    process.exitCode = 1;
  });
}
