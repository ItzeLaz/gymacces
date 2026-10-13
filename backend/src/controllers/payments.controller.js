import * as paymentsService from '../services/payments.service.js';
import { sendData } from '../utils/response.js';

export async function create(req, res) {
  sendData(res, await paymentsService.registerPayment(req.validated, req.user), 201);
}

export async function cancel(req, res) {
  sendData(res, await paymentsService.cancelPayment(req.params.id, req.validated, req.user));
}

export async function listByClient(req, res) {
  sendData(res, await paymentsService.getClientPayments(req.params.id, req.user));
}
