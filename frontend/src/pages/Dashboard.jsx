import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../api/dashboard.js';
import Message from '../components/Message.jsx';
import { formatMoney } from '../components/Money.jsx';
import StatCard from '../components/StatCard.jsx';
import { REASON_LABELS } from './Accesses.jsx';
import { formatDateTime, formatDay } from '../utils/dates.js';

const number = new Intl.NumberFormat('es-MX');

// Sin ningún registro en el gimnasio (FR-013)
function isEmpty(data) {
  return (
    data.clientes.activos + data.clientes.inactivos === 0 &&
    data.pagos.cantidad === 0 &&
    data.accesos.autorizados + data.accesos.rechazados === 0 &&
    data.rechazos_recientes.length === 0
  );
}

// Dashboard administrativo: solo resumen, sin datos sensibles (FR-002 a FR-007, FR-012)
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query = {}) => {
    setLoading(true);
    setError('');
    try {
      setData(await getDashboard(query));
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <p>Cargando el dashboard…</p>;
  if (error && !data) return <Message type="error">{error}</Message>;
  if (!data) return null;

  const { periodo } = data;

  return (
    <section>
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>
          Periodo: {formatDay(periodo.desde)} al {formatDay(periodo.hasta)}
        </p>
      </div>
      <Message type="error">{error}</Message>
      {isEmpty(data) && <p role="status">Todavía no hay datos para mostrar.</p>}

      <h2>Clientes y membresías</h2>
      <div className="stat-grid">
        <StatCard
          title="Clientes activos"
          value={number.format(data.clientes.activos)}
          detail={`${number.format(data.clientes.inactivos)} inactivos`}
        />
        <StatCard title="Clientes con membresía vigente" value={number.format(data.membresias.vigentes)} />
        <StatCard title="Clientes con membresía vencida" value={number.format(data.membresias.vencidas)} />
        <StatCard
          title="Clientes con membresía por vencer"
          value={number.format(data.membresias.por_vencer)}
          detail="En los próximos 7 días, sin renovación"
        />
      </div>

      <h2>Finanzas y accesos del periodo</h2>
      <div className="stat-grid">
        <StatCard
          title="Ingresos"
          value={formatMoney(data.pagos.ingresos)}
          detail={`${number.format(data.pagos.cantidad)} pagos`}
        />
        <StatCard title="Adeudo total" value={formatMoney(data.adeudo_total)} detail="Saldo pendiente actual" />
        <StatCard title="Accesos autorizados" value={number.format(data.accesos.autorizados)} />
        <StatCard title="Accesos rechazados" value={number.format(data.accesos.rechazados)} />
      </div>

      <h2>Membresías por vencer</h2>
      {data.por_vencer.length === 0 ? (
        <p>No hay membresías por vencer en los próximos 7 días.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Cliente</th>
              <th scope="col">Membresía</th>
              <th scope="col">Termina</th>
            </tr>
          </thead>
          <tbody>
            {data.por_vencer.map((fila) => (
              <tr key={fila.id_cliente}>
                <td>
                  <Link to={`/clients/${fila.id_cliente}`}>
                    {fila.nombre} {fila.apellido}
                  </Link>
                </td>
                <td>{fila.tipo}</td>
                <td>{formatDay(fila.fecha_fin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Rechazos por motivo</h2>
      <ul className="plain-list">
        {Object.entries(data.accesos.rechazos_por_motivo).map(([motivo, total]) => (
          <li key={motivo}>
            {REASON_LABELS[motivo] ?? motivo}: {number.format(total)}
          </li>
        ))}
      </ul>

      <h2>Rechazos recientes</h2>
      {data.rechazos_recientes.length === 0 ? (
        <p>No hay accesos rechazados.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Fecha y hora</th>
              <th scope="col">Cliente</th>
              <th scope="col">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {data.rechazos_recientes.map((fila) => (
              <tr key={fila.id_acceso}>
                <td>{formatDateTime(fila.fecha_hora)}</td>
                <td>{fila.cliente ? `${fila.cliente.nombre} ${fila.cliente.apellido}` : 'No identificado'}</td>
                <td>{REASON_LABELS[fila.motivo] ?? fila.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

