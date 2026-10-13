import { useEffect, useRef, useState } from 'react';

// Confirmación que exige escribir un motivo (suspender, cancelar, anular; FR-046)
export default function ReasonDialog({ open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel, busy = false }) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setMotivo('');
    setError('');
    inputRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = motivo.trim();
    if (!text || text.length > 255) {
      setError('Escribe un motivo de entre 1 y 255 caracteres.');
      return;
    }
    onConfirm(text);
  };

  return (
    <div className="dialog-backdrop">
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="reason-title" onSubmit={handleSubmit}>
        <h2 id="reason-title">{title}</h2>
        <p>{message}</p>
        <div className="field">
          <label htmlFor="reason-motivo">Motivo</label>
          <input
            id="reason-motivo"
            ref={inputRef}
            type="text"
            maxLength={255}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            aria-invalid={Boolean(error)}
          />
          {error && <span className="field-error">{error}</span>}
        </div>
        <div className="actions">
          <button type="submit" className="btn btn-danger" disabled={busy}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
