import * as usersService from '../services/users.service.js';
import { getPagination, sendData, sendList } from '../utils/response.js';

export async function list(req, res) {
  const { search, rol, estado } = req.validatedQuery;
  const { data, meta } = await usersService.listUsers({ search, rol, estado, ...getPagination(req.validatedQuery) });
  sendList(res, data, meta);
}

export async function getById(req, res) {
  sendData(res, await usersService.getUser(req.params.id));
}

export async function create(req, res) {
  sendData(res, await usersService.createUser(req.validated), 201);
}

export async function update(req, res) {
  sendData(res, await usersService.updateUser(req.params.id, req.validated));
}

export async function changeStatus(req, res) {
  sendData(res, await usersService.changeUserStatus(req.params.id, req.validated.estado, req.user));
}
