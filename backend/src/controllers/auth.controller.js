import * as authService from '../services/auth.service.js';
import { sendData } from '../utils/response.js';

export async function login(req, res) {
  const { correo, password } = req.validated;
  const result = await authService.login(correo, password);
  sendData(res, result);
}

export function me(req, res) {
  sendData(res, req.user);
}
