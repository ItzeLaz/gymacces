import * as accessService from '../services/access.service.js';
import { sendData } from '../utils/response.js';

// Siempre 200 cuando el intento se procesa, autorizado o rechazado (contracts/api.md)
export async function registerAttempt(req, res) {
  sendData(res, await accessService.registerAttempt({ descriptor: req.body.descriptor ?? null }, req.user));
}
