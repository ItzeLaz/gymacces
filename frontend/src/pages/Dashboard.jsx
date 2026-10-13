import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../api/dashboard.js';
import Message from '../components/Message.jsx';
import { formatMoney } from '../components/Money.jsx';
import BarChart from '../components/BarChart.jsx';
import StatCard from '../components/StatCard.jsx';
import { REASON_LABELS } from './Accesses.jsx';
import { addDays, formatDateTime, formatDay, todayIso } from '../utils/dates.js';

const number = new Intl.NumberFormat('es-MX');

const PERIODS = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: 'mes', label: 'Mes en curso' },
  { value: 'rango', label: 'Rango de fechas' },
];

const MAX_RANGE_DAYS = 366;

// Misma regla que el servidor: inicio no posterior al fin y como máximo 366 días (FR-008)
export function validateRange(desde, hasta) {
  if (!desde || !hasta) return 'Indica la fecha inicial y la final del rango.';
  if (desde > hasta) return 'La fecha inicial no puede ser posterior a la final.';
  if (addDays(desde, MAX_RANGE_DAYS) < hasta) return `El rango de fechas no puede superar ${MAX_RANGE_DAYS} días.`;
  return '';
}

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
  const [periodo, setPeriodo] = useState('mes');
  const [desde, setDesde] = useState(addDays(todayIso(), -29));
  const [hasta, setHasta] = useState(todayIso());

  // Si falla un cambio de periodo, se conservan las cifras anteriores (historia 2, escenario 3)
  const load = useCallback(async (query = {}) => {
    setLoading(true);
    setError('');
    try {
      setData(await getDashboard(query));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const changePeriod = (value) => {
    setPeriodo(value);
    if (value !== 'rango') load({ periodo: value });
  };

  const applyRange = (event) => {
    event.preventDefault();
    const rangeError = validateRange(desde, hasta);
    if (rangeError) {
      setError(rangeError);
      return;
    }
    load({ periodo: 'rango', desde, hasta });
  };

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <p>Cargando el dashboard…</p>;
  if (error && !data) return <Message type="error">{error}</Message>;
  if (!data) return null;

  const resuelto = data.periodo;

  return (
    <section>
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>
          Periodo: {formatDay(resuelto.desde)} al {formatDay(resuelto.hasta)}
          {loading && ' · Actualizando…'}
        </p>
      </div>

      <form className="filters" onSubmit={applyRange}>
        <div className="field">
          <label htmlFor="dash-periodo">Periodo</label>
          <select id="dash-periodo" value={periodo} onChange={(event) => changePeriod(event.target.value)}>
            {PERIODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {periodo === 'rango' && (
          <>
            <div className="field">
              <label htmlFor="dash-desde">Desde</label>
              <input id="dash-desde" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="dash-hasta">Hasta</label>
              <input id="dash-hasta" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              Aplicar
            </button>
          </>
        )}
      </form>

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

      <h2>Evolución diaria</h2>
      <div className="chart-grid">
        <BarChart
          title="Ingresos por día"
          data={data.tendencia.map((dia) => ({ fecha: dia.fecha, valor: Number(dia.ingresos) }))}
          format={formatMoney}
        />
        <BarChart
          title="Accesos autorizados por día"
          data={data.tendencia.map((dia) => ({ fecha: dia.fecha, valor: dia.autorizados }))}
          format={(valor) => number.format(valor)}
        />
        <BarChart
          title="Accesos rechazados por día"
          data={data.tendencia.map((dia) => ({ fecha: dia.fecha, valor: dia.rechazados }))}
          format={(valor) => number.format(valor)}
        />
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

