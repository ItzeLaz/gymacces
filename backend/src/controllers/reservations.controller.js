import * as reservationsService from '../services/reservations.service.js';
import { sendData } from '../utils/response.js';

export async function create(req, res) {
  sendData(res, await reservationsService.createReservation(req.validated, req.user), 201);
}
