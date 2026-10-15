import * as accessService from '../services/access.service.js';
import { getPagination, sendData, sendList } from '../utils/response.js';

// Siempre 200 cuando el intento se procesa, autorizado o rechazado (contracts/api.md)
export async function registerAttempt(req, res) {
  sendData(res, await accessService.registerAttempt({ descriptor: req.body.descriptor ?? null }, req.user));
}

export async function list(req, res) {
  const { desde, hasta, id_cliente, resultado, motivo } = req.validatedQuery;
  const { data, meta } = await accessService.listAccesses(
    { desde, hasta, id_cliente, resultado, motivo, ...getPagination(req.validatedQuery) },
    req.user,
  );
  sendList(res, data, meta);
}

export async function listOwn(req, res) {
  const { data, meta } = await accessService.listOwnAccesses(req.user, getPagination(req.validatedQuery));
  sendList(res, data, meta);
}
