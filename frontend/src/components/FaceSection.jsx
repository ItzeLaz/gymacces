import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deactivateFace, getFaceStatus } from '../api/faces.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import Message from './Message.jsx';
import { formatDateTime } from '../utils/dates.js';

// Estado de la información facial: nunca se muestran datos biométricos (FR-030)
export default function FaceSection({ clientId, clientActive }) {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getFaceStatus(clientId)
      .then(setStatus)
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async () => {
    setBusy(true);
    try {
      setStatus(await deactivateFace(clientId));
      setMessage({ type: 'success', text: 'Información facial desactivada.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <section aria-labelledby="face-title">
      <div className="page-title">
        <h2 id="face-title">Información facial</h2>
        {clientActive && (
          <div className="actions">
            <Link to={`/clients/${clientId}/face`} className="btn">
              {status?.registrado ? 'Reemplazar' : 'Registrar'}
            </Link>
            {status?.registrado && (
              <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
                Desactivar
              </button>
            )}
          </div>
        )}
      </div>
      <Message type={message.type}>{message.text}</Message>
      {status &&
        (status.registrado ? (
          <p>
            Registrada el {formatDateTime(status.creado_en)} por {status.registrado_por.nombre}.
          </p>
        ) : (
          <p role="status">No registrada.</p>
        ))}

      <ConfirmDialog
        open={confirming}
        title="Desactivar información facial"
        message="El cliente ya no podrá identificarse con su rostro hasta que se registre de nuevo. ¿Deseas continuar?"
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
        busy={busy}
      />
    </section>
  );
}
