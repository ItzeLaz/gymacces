import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { registerAccessAttempt } from '../api/access.js';
import CameraView from '../components/CameraView.jsx';
import { analyzeFrame, loadFaceEngine } from '../face/faceEngine.js';

// Ciclo de la estación (research R-07): rostro estable ~1 s → validar → mostrar el resultado ~4 s →
// esperar a que no haya nadie frente a la cámara antes de evaluar de nuevo.
const DEFAULT_TIMING = { intervalMs: 300, stableMs: 1000, resultMs: 4000, noValidMs: 5000 };

const ERROR_MESSAGE = 'No fue posible validar el acceso. Intenta de nuevo o acude a recepción.';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AccessStation({ timing = DEFAULT_TIMING }) {
  const [video, setVideo] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [result, setResult] = useState(null);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const timingRef = useRef(timing);

  useEffect(() => {
    loadFaceEngine()
      .then(() => setPhase((current) => (current === 'loading' ? 'ready' : current)))
      .catch(() => setError('No se pudieron cargar los modelos de reconocimiento facial.'));
  }, []);

  useEffect(() => {
    if (!video || phase === 'loading' || error) return undefined;
    let running = true;
    const { intervalMs, stableMs, resultMs, noValidMs } = timingRef.current;

    async function submit(descriptor) {
      let shown;
      try {
        const data = await registerAccessAttempt(descriptor);
        shown = { type: data.resultado === 'autorizado' ? 'authorized' : 'rejected', text: data.mensaje };
      } catch {
        // Ante cualquier fallo nunca se muestra "autorizado" (FR-041)
        shown = { type: 'rejected', text: ERROR_MESSAGE };
      }
      if (!running) return;
      setHint('');
      setResult(shown);
      await sleep(resultMs);
      if (running) setResult(null);
    }

    async function loop() {
      let okSince = null;
      let faceSince = null;
      let waitingClear = false;

      while (running) {
        let analysis;
        try {
          analysis = await analyzeFrame(video);
        } catch {
          analysis = { status: 'error', descriptor: null, message: 'No se pudo analizar la imagen.' };
        }
        if (!running) break;
        const now = Date.now();

        if (waitingClear) {
          // Solo se vuelve a evaluar cuando ya no hay nadie frente a la cámara (FR-038)
          if (analysis.status === 'no_face') waitingClear = false;
        } else if (analysis.status === 'ok') {
          okSince ??= now;
          if (now - okSince >= stableMs) {
            await submit(analysis.descriptor);
            okSince = null;
            faceSince = null;
            waitingClear = true;
          }
        } else {
          okSince = null;
          if (analysis.status === 'no_face') {
            faceSince = null;
            setHint('');
          } else {
            setHint(analysis.message);
            faceSince ??= now;
            // Hay alguien, pero ninguna captura es válida: se registra como no identificado
            if (now - faceSince >= noValidMs) {
              await submit(null);
              faceSince = null;
              waitingClear = true;
            }
          }
        }
        await sleep(intervalMs);
      }
    }

    loop();
    return () => {
      running = false;
    };
  }, [video, phase, error]);

  return (
    <div className="station">
      <header className="station-header">
        <h1>Control de acceso</h1>
        <Link to="/" className="btn btn-secondary">
          Salir de la estación
        </Link>
      </header>

      <CameraView className="camera-view station-camera" onReady={setVideo} onError={setError} />

      {error && !result && (
        <p className="message message-error" role="alert">
          {error}
        </p>
      )}
      {!error && phase === 'loading' && <p role="status">Preparando la cámara…</p>}

      <div aria-live="assertive">
        {result ? (
          <div className={`station-result station-${result.type}`}>
            <p>{result.text}</p>
          </div>
        ) : (
          !error &&
          phase !== 'loading' && <p className="station-hint">{hint || 'Mira de frente a la cámara para ingresar.'}</p>
        )}
      </div>
    </div>
  );
}
