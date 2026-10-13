import * as facesService from '../services/faces.service.js';
import { sendData } from '../utils/response.js';

export async function getStatus(req, res) {
  sendData(res, await facesService.getFaceStatus(req.params.id));
}

// 201 si es el primer registro, 200 si reemplazó uno anterior
export async function register(req, res) {
  const { status, replaced } = await facesService.registerFace(req.params.id, req.validated, req.user);
  sendData(res, status, replaced ? 200 : 201);
}

export async function changeStatus(req, res) {
  sendData(res, await facesService.deactivateFace(req.params.id, req.user));
}
