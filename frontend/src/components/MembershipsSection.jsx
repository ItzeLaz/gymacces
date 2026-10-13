import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { changeMembershipStatus, getClientMemberships } from '../api/memberships.js';
import Message from './Message.jsx';
import Money from './Money.jsx';
import ReasonDialog from './ReasonDialog.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatDay } from '../utils/dates.js';

const ACTIONS = {
  suspendida: { label: 'Suspender', title: 'Suspender membresía', message: 'El cliente no podrá entrar mientras esté suspendida. Las fechas no cambian.', done: 'Membresía suspendida.' },
  activa: { label: 'Reactivar', title: 'Reactivar membresía', message: 'La membresía vuelve a estar activa con sus mismas fechas.', done: 'Membresía reactivada.' },
  cancelada: { label: 'Cancelar', title: 'Cancelar membresía', message: 'La cancelación es definitiva: la membresía no se podrá reactivar.', done: 'Membresía cancelada.' },
};

// Estado visible: "Por iniciar" para membresías activas que aún no empiezan
export function membershipBadge(membresia) {
  return membresia.por_iniciar ? 'por_iniciar' : membresia.estado_efectivo;
}

// Acciones del administrador permitidas según el estado (data-model, "Transiciones")
function availableActions(membresia) {
  if (membresia.estado === 'cancelada') return [];
  if (membresia.estado_efectivo === 'vencida') return ['cancelada'];
  return membresia.estado === 'suspendida' ? ['activa', 'cancelada'] : ['suspendida', 'cancelada'];
}

export default function MembershipsSection({ clientId, rol, clientActive, onChange }) {
  const isAdmin = rol === 'administrador';
  const canWrite = isAdmin || rol === 'recepcionista';
  const showMoney = canWrite;
  const [data, setData] = useState(null);
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getClientMemberships(clientId)
      .then(setData)
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async (motivo) => {
    setBusy(true);
    try {
      await changeMembershipStatus(pending.membresia.id_membresia, pending.estado, motivo);
      setMessage({ type: 'success', text: ACTIONS[pending.estado].done });
      load();
      onChange?.();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const actual = data?.actual;

  return (
    <section aria-labelledby="memberships-title">
      <div className="page-title">
        <h2 id="memberships-title">Membresías</h2>
        {canWrite && clientActive && (
          <div className="actions">
            <Link to={`/clients/${clientId}/memberships/new`} className="btn">
              Asignar membresía
            </Link>
            {data?.historial.length > 0 && (
              <Link to={`/clients/${clientId}/memberships/renew`} className="btn btn-secondary">
                Renovar
              </Link>
            )}
          </div>
        )}
      </div>
      <Message type={message.type}>{message.text}</Message>

      {!data ? (
        <p>Cargando membresías…</p>
      ) : !actual ? (
        <p role="status">El cliente no tiene membresías.</p>
      ) : (
        <>
          <p>
            <strong>Actual:</strong> {actual.tipo.nombre} · <StatusBadge estado={membershipBadge(actual)} /> ·{' '}
            {formatDay(actual.fecha_inicio)} al {formatDay(actual.fecha_fin)}
          </p>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Periodo</th>
                <th scope="col">Estado</th>
                {showMoney && <th scope="col">Monto</th>}
                {showMoney && <th scope="col">Saldo</th>}
                {isAdmin && <th scope="col">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {data.historial.map((membresia) => (
                <tr key={membresia.id_membresia}>
                  <td>{membresia.tipo.nombre}</td>
                  <td>
                    {formatDay(membresia.fecha_inicio)} al {formatDay(membresia.fecha_fin)}
                  </td>
                  <td>
                    <StatusBadge estado={membershipBadge(membresia)} />
                    {membresia.motivo_estado && <div className="field-hint">{membresia.motivo_estado}</div>}
                  </td>
                  {showMoney && (
                    <td>
                      <Money value={membresia.monto} />
                    </td>
                  )}
                  {showMoney && (
                    <td>
                      <Money value={membresia.saldo} /> <StatusBadge estado={membresia.estado_pago} />
                    </td>
                  )}
                  {isAdmin && (
                    <td className="actions">
                      {availableActions(membresia).map((estado) => (
                        <button
                          key={estado}
                          type="button"
                          className={estado === 'cancelada' ? 'btn btn-danger' : 'btn btn-secondary'}
                          onClick={() => setPending({ membresia, estado })}
                        >
                          {ACTIONS[estado].label}
                        </button>
                      ))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <ReasonDialog
        open={Boolean(pending)}
        title={pending ? ACTIONS[pending.estado].title : ''}
        message={pending ? ACTIONS[pending.estado].message : ''}
        confirmLabel={pending ? ACTIONS[pending.estado].label : 'Confirmar'}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
        busy={busy}
      />
    </section>
  );
}
