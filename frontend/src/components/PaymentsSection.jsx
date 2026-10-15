import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelPayment, getClientPayments } from '../api/payments.js';
import Message from './Message.jsx';
import Money from './Money.jsx';
import ReasonDialog from './ReasonDialog.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatDateTime } from '../utils/dates.js';

export const METHOD_LABELS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

// Pagos y adeudo de un cliente: solo administrador y recepcionista (FR-022)
export default function PaymentsSection({ clientId, rol, refreshKey, onChange }) {
  const isAdmin = rol === 'administrador';
  const [data, setData] = useState(null);
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getClientPayments(clientId)
      .then(setData)
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const confirmCancel = async (motivo) => {
    setBusy(true);
    try {
      await cancelPayment(pending.id_pago, motivo);
      setMessage({ type: 'success', text: 'Pago anulado. Se conserva en el historial.' });
      onChange?.();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <section aria-labelledby="payments-title">
      <div className="page-title">
        <h2 id="payments-title">Pagos</h2>
        <Link to={`/clients/${clientId}/payments/new`} className="btn">
          Registrar pago
        </Link>
      </div>
      <Message type={message.type}>{message.text}</Message>

      {!data ? (
        <p>Cargando pagos…</p>
      ) : (
        <>
          <p>
            <strong>Adeudo total:</strong> <Money value={data.adeudo} />
          </p>
          {data.pagos.length === 0 ? (
            <p role="status">El cliente no tiene pagos registrados.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Método</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Registró</th>
                  {isAdmin && <th scope="col">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {data.pagos.map((pago) => (
                  <tr key={pago.id_pago}>
                    <td>{formatDateTime(pago.fecha_pago)}</td>
                    <td>
                      <Money value={pago.monto} />
                    </td>
                    <td>{METHOD_LABELS[pago.metodo_pago] ?? pago.metodo_pago}</td>
                    <td>
                      <StatusBadge estado={pago.estado} />
                      {pago.motivo_anulacion && <div className="field-hint">{pago.motivo_anulacion}</div>}
                    </td>
                    <td>{pago.registrado_por?.nombre ?? '—'}</td>
                    {isAdmin && (
                      <td>
                        {pago.estado === 'pagado' && (
                          <button type="button" className="btn btn-danger" onClick={() => setPending(pago)}>
                            Anular
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <ReasonDialog
        open={Boolean(pending)}
        title="Anular pago"
        message="El pago se conservará en el historial como cancelado y dejará de contar para el saldo."
        confirmLabel="Anular"
        onConfirm={confirmCancel}
        onCancel={() => setPending(null)}
        busy={busy}
      />
    </section>
  );
}
