import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getClient } from '../api/clients.js';
import { registerFace } from '../api/faces.js';
import CameraView from '../components/CameraView.jsx';
import Message from '../components/Message.jsx';
import { analyzeFrame, loadFaceEngine } from '../face/faceEngine.js';
import { FACE_MODEL_VERSION } from '../face/humanConfig.js';

const REQUIRED_SAMPLES = 3;

export default function FaceRegister() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [video, setVideo] = useState(null);
  const [engineReady, setEngineReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [samples, setSamples] = useState([]);
  const [hint, setHint] = useState('');
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    getClient(id)
      .then(setClient)
      .catch((error) => setMessage({ type: 'error', text: error.message }));
    loadFaceEngine()
      .then(() => setEngineReady(true))
      .catch(() => setMessage({ type: 'error', text: 'No se pudieron cargar los modelos de reconocimiento facial.' }));
  }, [id]);

  const capture = async () => {
    setWorking(true);
    setHint('');
    try {
      const { status, descriptor, message: text } = await analyzeFrame(video);
      if (status !== 'ok') {
        setHint(text);
        return;
      }
      setSamples((current) => [...current, descriptor]);
      setHint('Captura válida. Mueve ligeramente la cabeza para la siguiente.');
    } catch {
      setHint('No se pudo analizar la imagen. Intenta de nuevo.');
    } finally {
      setWorking(false);
    }
  };

  const save = async () => {
    setWorking(true);
    setMessage({ type: 'success', text: '' });
    try {
      await registerFace(id, { consentimiento: true, version_modelo: FACE_MODEL_VERSION, muestras: samples });
      navigate(`/clients/${id}`, { state: { message: 'Información facial registrada correctamente.' } });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setSamples([]);
    } finally {
      setWorking(false);
    }
  };

  const ready = engineReady && video && consent;
  const complete = samples.length >= REQUIRED_SAMPLES;

  return (
    <section className="card">
      <h1>Registro facial{client ? ` de ${client.nombre} ${client.apellido}` : ''}</h1>
      <Message type={message.type}>{message.text}</Message>
      {client?.rostro_registrado && (
        <p className="message message-warning" role="status">
          El cliente ya tiene información facial: al guardar se reemplazará la anterior.
        </p>
      )}

      <div className="field field-check">
        <input id="consentimiento" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <label htmlFor="consentimiento">El cliente dio su consentimiento para registrar su información facial</label>
      </div>
      <p className="field-hint">
        Solo se guarda una representación numérica cifrada del rostro, nunca fotografías. Se usa únicamente para el
        control de acceso.
      </p>

      <CameraView onReady={setVideo} />
      {!engineReady && !message.text && <p role="status">Preparando la cámara…</p>}

      <p role="status">
        Capturas válidas: {Math.min(samples.length, REQUIRED_SAMPLES)}/{REQUIRED_SAMPLES}
      </p>
      {hint && <p className="field-hint">{hint}</p>}

      <div className="actions">
        {complete ? (
          <button type="button" className="btn" onClick={save} disabled={working}>
            {working ? 'Guardando…' : 'Guardar información facial'}
          </button>
        ) : (
          <button type="button" className="btn" onClick={capture} disabled={!ready || working}>
            {working ? 'Analizando…' : 'Capturar'}
          </button>
        )}
        {samples.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => setSamples([])} disabled={working}>
            Reiniciar capturas
          </button>
        )}
        <Link to={`/clients/${id}`} className="btn btn-secondary">
          Volver
        </Link>
      </div>
    </section>
  );
}
