import { pool } from '../config/db.js';

// Saldo pendiente por membresía no cancelada: monto − pagos no anulados (research R-10)
const DEBTS = `
  SELECT m.id_cliente, m.id_membresia, t.nombre AS tipo,
         m.monto - COALESCE(p.pagado, 0) AS saldo
  FROM membresias m
  JOIN tipos_membresia t ON t.id_tipo_membresia = m.id_tipo_membresia
  LEFT JOIN (
    SELECT id_membresia, SUM(monto) AS pagado FROM pagos WHERE estado = 'pagado' GROUP BY id_membresia
  ) p ON p.id_membresia = m.id_membresia
  WHERE m.estado <> 'cancelada' AND m.monto - COALESCE(p.pagado, 0) > 0`;

function buildSearch(search) {
  if (!search) return { where: '', params: [] };
  return {
    where: 'WHERE c.nombre LIKE ? OR c.apellido LIKE ?',
    params: [`%${search}%`, `%${search}%`],
  };
}

export async function listDebtors({ search, limit, offset }) {
  const { where, params } = buildSearch(search);
  // LIMIT y OFFSET ya son enteros validados; se interpolan porque execute no los admite como parámetros en MariaDB
  const [rows] = await pool.execute(
    `SELECT c.id_cliente, c.nombre, c.apellido, SUM(d.saldo) AS adeudo
     FROM (${DEBTS}) d JOIN clientes c ON c.id_cliente = d.id_cliente
     ${where}
     GROUP BY c.id_cliente, c.nombre, c.apellido
     ORDER BY adeudo DESC, c.id_cliente
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params,
  );
  return rows;
}

export async function countDebtors({ search }) {
  const { where, params } = buildSearch(search);
  const [rows] = await pool.execute(
    `SELECT COUNT(DISTINCT d.id_cliente) AS total, COALESCE(SUM(d.saldo), 0) AS total_adeudo
     FROM (${DEBTS}) d JOIN clientes c ON c.id_cliente = d.id_cliente ${where}`,
    params,
  );
  return { total: Number(rows[0].total), totalAdeudo: rows[0].total_adeudo };
}

// Desglose por membresía de los clientes de la página actual
export async function listByClients(ids) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT * FROM (${DEBTS}) d WHERE d.id_cliente IN (${placeholders}) ORDER BY d.id_membresia`,
    ids,
  );
  return rows;
}
