import { useEffect, useRef } from 'react';

// Diálogo de confirmación para acciones que cambian el estado (FR-028)
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, busy = false }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="actions">
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            Confirmar
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            ref={cancelRef}
            disabled={busy}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
