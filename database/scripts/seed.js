import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createConnection, isMainModule } from './connection.js';

const seedsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seeds');

// Ejecuta en orden todas las semillas de database/seeds
export async function runSeeds() {
  const connection = await createConnection();
  try {
    const files = (await fs.readdir(seedsDir)).filter((file) => file.endsWith('.js')).sort();
    for (const file of files) {
      const module = await import(pathToFileURL(path.join(seedsDir, file)).href);
      const result = await module.seed(connection);
      console.log(`${file}: ${result}`);
    }
  } finally {
    await connection.end();
  }
}

if (isMainModule(import.meta.url)) {
  runSeeds().catch((error) => {
    console.error(`No se pudieron ejecutar las semillas: ${error.message}`);
    process.exitCode = 1;
  });
}
