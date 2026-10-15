import * as dashboardModel from '../models/dashboard.model.js';
import * as debtModel from '../models/debt.model.js';
import { ACCESS_REASONS } from '../utils/accessReasons.js';
import { addDays, today } from '../utils/dates.js';
import { formatAmount } from '../utils/money.js';

const EXPIRING_WINDOW_DAYS = 6;
const EXPIRING_LIST_SIZE = 20;
const RECENT_REJECTIONS = 10;

// Convierte el periodo elegido en fechas con la zona horaria del gimnasio (data-model, "Periodo")
export function resolvePeriod({ periodo = 'mes', desde, hasta }, hoy = today()) {
  switch (periodo) {
    case 'hoy':
      return { tipo: 'hoy', desde: hoy, hasta: hoy };
    case '7d':
      return { tipo: '7d', desde: addDays(hoy, -6), hasta: hoy };
    case 'rango':
      return { tipo: 'rango', desde, hasta };
    default:
      return { tipo: 'mes', desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
  }
}

// Una entrada por día del periodo, con cero en los días sin datos (FR-009)
function buildTrend(desde, hasta, pagosPorDia, accesosPorDia) {
  const ingresos = new Map(pagosPorDia.map((fila) => [fila.fecha, fila.ingresos]));
  const accesos = new Map();
  for (const fila of accesosPorDia) {
    const dia = accesos.get(fila.fecha) ?? { autorizados: 0, rechazados: 0 };
    dia[fila.resultado === 'autorizado' ? 'autorizados' : 'rechazados'] = Number(fila.total);
    accesos.set(fila.fecha, dia);
  }
  const tendencia = [];
  for (let fecha = desde; fecha <= hasta; fecha = addDays(fecha, 1)) {
    tendencia.push({
      fecha,
      ingresos: formatAmount(ingresos.get(fecha) ?? 0),
      ...(accesos.get(fecha) ?? { autorizados: 0, rechazados: 0 }),
    });
  }
  return tendencia;
}

function countBy(rows, key) {
  return Object.fromEntries(rows.map((row) => [row[key], Number(row.total)]));
}

// Todos los indicadores se calculan al consultar (FR-010); solo lectura
export async function getDashboard(query) {
  const hoy = today();
  const periodo = resolvePeriod(query, hoy);
  const { desde, hasta } = periodo;
  const limite = addDays(hoy, EXPIRING_WINDOW_DAYS);

  const [clientes, membresias, porVencer, pagos, deudas, accesos, motivos, recientes, pagosPorDia, accesosPorDia] =
    await Promise.all([
      dashboardModel.countClientsByStatus(),
      dashboardModel.membershipCounts(hoy, limite),
      dashboardModel.expiringSoon(hoy, limite, EXPIRING_LIST_SIZE),
      dashboardModel.paymentTotals(desde, hasta),
      debtModel.countDebtors({}),
      dashboardModel.accessTotals(desde, hasta),
      dashboardModel.rejectionsByReason(desde, hasta),
      dashboardModel.recentRejections(RECENT_REJECTIONS),
      dashboardModel.dailyPayments(desde, hasta),
      dashboardModel.dailyAccesses(desde, hasta),
    ]);

  const porEstado = countBy(clientes, 'estado');
  const porResultado = countBy(accesos, 'resultado');
  const porMotivo = countBy(motivos, 'motivo');

  return {
    periodo,
    generado_en: new Date().toISOString(),
    clientes: { activos: porEstado.activo ?? 0, inactivos: porEstado.inactivo ?? 0 },
    membresias: {
      vigentes: Number(membresias.vigentes),
      vencidas: Number(membresias.vencidas),
      por_vencer: Number(membresias.por_vencer),
    },
    por_vencer: porVencer.map(({ id_cliente, nombre, apellido, tipo, fecha_fin }) => ({
      id_cliente,
      nombre,
      apellido,
      tipo,
      fecha_fin,
    })),
    pagos: { cantidad: Number(pagos.cantidad), ingresos: formatAmount(pagos.ingresos) },
    adeudo_total: formatAmount(deudas.totalAdeudo),
    accesos: {
      autorizados: porResultado.autorizado ?? 0,
      rechazados: porResultado.rechazado ?? 0,
      rechazos_por_motivo: Object.fromEntries(ACCESS_REASONS.map((motivo) => [motivo, porMotivo[motivo] ?? 0])),
    },
    rechazos_recientes: recientes.map((fila) => ({
      id_acceso: fila.id_acceso,
      fecha_hora: fila.fecha_hora,
      cliente: fila.id_cliente ? { nombre: fila.nombre, apellido: fila.apellido } : null,
      motivo: fila.motivo,
    })),
    tendencia: buildTrend(desde, hasta, pagosPorDia, accesosPorDia),
  };
}
