import * as typesService from '../services/membershipTypes.service.js';
import { getPagination, sendData, sendList } from '../utils/response.js';

export async function list(req, res) {
  const { estado } = req.validatedQuery;
  const { data, meta } = await typesService.listTypes(
    { estado, ...getPagination(req.validatedQuery) },
    req.user,
  );
  sendList(res, data, meta);
}

export async function create(req, res) {
  sendData(res, await typesService.createType(req.validated, req.user), 201);
}

export async function update(req, res) {
  sendData(res, await typesService.updateType(req.params.id, req.validated, req.user));
}

export async function changeStatus(req, res) {
  sendData(res, await typesService.changeTypeStatus(req.params.id, req.validated.estado, req.user));
}
