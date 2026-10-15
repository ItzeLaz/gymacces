export function sendData(res, data, status = 200) {
  return res.status(status).json({ data });
}

export function sendList(res, data, { page, limit, total }) {
  return res.status(200).json({ data, meta: { page, limit, total } });
}

// Convierte page/limit de la consulta en valores de paginación
export function getPagination(query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  return { page, limit, offset: (page - 1) * limit };
}
