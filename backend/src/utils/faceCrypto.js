import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';

// Cifra las muestras faciales con AES-256-GCM y un IV aleatorio por registro (research R-05)
export function encryptSamples(muestras, key = env.face.key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const descriptorCifrado = Buffer.concat([cipher.update(JSON.stringify({ muestras }), 'utf8'), cipher.final()]);
  return { descriptor_cifrado: descriptorCifrado, iv, auth_tag: cipher.getAuthTag() };
}

// Lanza un error si el contenido, el IV o la etiqueta fueron alterados, o si la llave no coincide
export function decryptSamples({ descriptor_cifrado: descriptorCifrado, iv, auth_tag: authTag }, key = env.face.key) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const texto = Buffer.concat([decipher.update(descriptorCifrado), decipher.final()]).toString('utf8');
  return JSON.parse(texto).muestras;
}
