import * as paymentsService from '../services/payments.service.js';
import { getPagination, sendData } from '../utils/response.js';

export async function create(req, res) {
  sendData(res, await paymentsService.registerPayment(req.validated, req.user), 201);
}

export async function cancel(req, res) {
  sendData(res, await paymentsService.cancelPayment(req.params.id, req.validated, req.user));
}

export async function listByClient(req, res) {
  sendData(res, await paymentsService.getClientPayments(req.params.id, req.user));
}

export async function list(req, res) {
  const { id_cliente, desde, hasta, metodo_pago, estado } = req.validatedQuery;
  const { data, meta } = await paymentsService.listPayments({
    id_cliente,
    desde,
    hasta,
    metodo_pago,
    estado,
    ...getPagination(req.validatedQuery),
  });
  res.status(200).json({ data, meta });
}

export async function listDebts(req, res) {
  const { data, meta } = await paymentsService.listDebts({
    search: req.validatedQuery.search,
    ...getPagination(req.validatedQuery),
  });
  res.status(200).json({ data, meta });
}
