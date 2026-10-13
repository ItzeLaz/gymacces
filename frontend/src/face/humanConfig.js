// Configuración de @vladmandic/human: solo detección, descriptor, antisuplantación y presencia (research R-01, R-04)

export const FACE_MODEL_VERSION = 'human-3.3.6-faceres';
export const FACE_DESCRIPTOR_LENGTH = 1024;

// Condiciones mínimas de captura; se ajustan en la calibración del quickstart
export const QUALITY = Object.freeze({
  minDetectionScore: 0.8,
  minFaceWidth: 120,
  minAntispoof: 0.5,
  minLiveness: 0.5,
});

export const humanConfig = {
  modelBasePath: import.meta.env.VITE_FACE_MODELS_URL ?? '/models',
  backend: 'webgl',
  debug: false,
  warmup: 'face',
  // Sin caché de resultados: cada captura se analiza completa
  cacheSensitivity: 0,
  face: {
    enabled: true,
    detector: { enabled: true, rotation: true, maxDetected: 2, minConfidence: 0.5, return: false },
    mesh: { enabled: true },
    iris: { enabled: false },
    attention: { enabled: false },
    description: { enabled: true },
    emotion: { enabled: false },
    antispoof: { enabled: true },
    liveness: { enabled: true },
    gear: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
  filter: { enabled: true, equalization: false },
};
