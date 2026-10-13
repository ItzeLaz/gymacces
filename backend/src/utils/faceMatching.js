// Comparación de descriptores faciales por similitud coseno (research R-06)

// Longitud del descriptor del modelo faceres de @vladmandic/human
export const FACE_DESCRIPTOR_LENGTH = 1024;
export const FACE_MODEL_VERSION = 'human-3.3.6-faceres';

export function isValidDescriptor(value) {
  return (
    Array.isArray(value) &&
    value.length === FACE_DESCRIPTOR_LENGTH &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Mejor similitud entre una captura y las muestras de un cliente
export function bestSimilarity(descriptor, muestras) {
  return muestras.reduce((best, muestra) => Math.max(best, cosineSimilarity(descriptor, muestra)), -1);
}

// Clientes ordenados de más a menos parecido: [{ id_cliente, similitud }]
export function rankCandidates(descriptor, candidatos) {
  return candidatos
    .map(({ id_cliente, muestras }) => ({ id_cliente, similitud: bestSimilarity(descriptor, muestras) }))
    .sort((a, b) => b.similitud - a.similitud);
}

// Coincidencia válida: supera el umbral y aventaja al segundo cliente por el margen.
// Devuelve { id_cliente, similitud } o null si no hay coincidencia o es ambigua.
export function bestMatch(descriptor, candidatos, { threshold, margin }) {
  const [first, second] = rankCandidates(descriptor, candidatos);
  if (!first || first.similitud < threshold) return null;
  if (second && first.similitud - second.similitud < margin) return null;
  return first;
}
