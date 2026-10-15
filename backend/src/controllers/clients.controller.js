import * as clientsService from '../services/clients.service.js';
import { getPagination, sendData, sendList } from '../utils/response.js';

export async function list(req, res) {
  const { search, estado } = req.validatedQuery;
  const { data, meta } = await clientsService.listClients(
    { search, estado, ...getPagination(req.validatedQuery) },
    req.user.rol,
  );
  sendList(res, data, meta);
}

export async function getById(req, res) {
  sendData(res, await clientsService.getClient(req.params.id, req.user.rol));
}

export async function me(req, res) {
  sendData(res, await clientsService.getOwnProfile(req.user));
}

export async function create(req, res) {
  sendData(res, await clientsService.createClient(req.validated), 201);
}

export async function update(req, res) {
  sendData(res, await clientsService.updateClient(req.params.id, req.validated));
}

export async function changeStatus(req, res) {
  sendData(res, await clientsService.changeClientStatus(req.params.id, req.validated.estado));
}
