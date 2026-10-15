import { FACE_DESCRIPTOR_LENGTH, QUALITY, humanConfig } from './humanConfig.js';

// Punto único de uso de la librería facial: las pantallas no dependen de ella directamente,
// así se puede reemplazar sin tocarlas (plan, "Decisión de estructura").

let enginePromise = null;

// Carga la librería y los modelos una sola vez; las siguientes llamadas reutilizan la instancia
export function loadFaceEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { Human } = await import('@vladmandic/human');
      const human = new Human(humanConfig);
      await human.load();
      await human.warmup();
      return human;
    })().catch((error) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

const MESSAGES = {
  no_face: 'Colócate frente a la cámara.',
  multiple_faces: 'Solo debe aparecer una persona frente a la cámara.',
  too_far: 'Acércate un poco más a la cámara.',
  low_quality: 'No se ve bien el rostro. Mejora la iluminación y mira de frente.',
  spoof: 'No se pudo verificar el rostro. Mira de frente a la cámara, sin fotos ni pantallas.',
};

const result = (status) => ({ status, descriptor: null, message: MESSAGES[status] });

// Analiza el cuadro actual del video. Nada se guarda ni se envía: solo se devuelve el
// descriptor numérico cuando la captura cumple las condiciones mínimas (FR-026, FR-029).
export async function analyzeFrame(video) {
  const human = await loadFaceEngine();
  const { face: faces } = await human.detect(video);

  if (faces.length === 0) return result('no_face');
  if (faces.length > 1) return result('multiple_faces');

  const [face] = faces;
  if ((face.boxScore ?? 0) < QUALITY.minDetectionScore) return result('low_quality');
  if (face.box[2] < QUALITY.minFaceWidth) return result('too_far');
  if ((face.real ?? 0) < QUALITY.minAntispoof || (face.live ?? 0) < QUALITY.minLiveness) return result('spoof');
  if (!face.embedding || face.embedding.length !== FACE_DESCRIPTOR_LENGTH) return result('low_quality');

  // Seis decimales bastan para comparar y reducen el tamaño de la solicitud
  const descriptor = Array.from(face.embedding, (value) => Math.round(value * 1e6) / 1e6);
  return { status: 'ok', descriptor, message: 'Rostro capturado.' };
}
