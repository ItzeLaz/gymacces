import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Copia a public/models los modelos de @vladmandic/human que usa la configuración facial (research R-03)
const frontendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(frontendDir, 'node_modules', '@vladmandic', 'human', 'models');
const targetDir = path.join(frontendDir, 'public', 'models');

// Detector de rostro, malla facial, descriptor facial, antisuplantación y verificación de presencia
const MODELS = ['blazeface', 'facemesh', 'faceres', 'antispoof', 'liveness'];

async function copyModels() {
  try {
    await fs.access(sourceDir);
  } catch {
    console.error(`No se encontraron los modelos en ${sourceDir}. Ejecuta "npm install" en frontend/.`);
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(targetDir, { recursive: true });
  let copied = 0;
  for (const model of MODELS) {
    for (const extension of ['.json', '.bin']) {
      await fs.copyFile(path.join(sourceDir, `${model}${extension}`), path.join(targetDir, `${model}${extension}`));
      copied += 1;
    }
  }
  console.log(`Modelos faciales copiados a public/models: ${copied} archivos.`);
}

copyModels().catch((error) => {
  console.error(`No se pudieron copiar los modelos faciales: ${error.message}`);
  process.exitCode = 1;
});
