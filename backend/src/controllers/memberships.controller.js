import * as membershipsService from '../services/memberships.service.js';
import { sendData } from '../utils/response.js';

export async function listByClient(req, res) {
  sendData(res, await membershipsService.getClientMemberships(req.params.id, req.user));
}

export async function assign(req, res) {
  sendData(res, await membershipsService.assignMembership(req.params.id, req.validated, req.user), 201);
}

export async function changeStatus(req, res) {
  sendData(res, await membershipsService.changeMembershipStatus(req.params.id, req.validated, req.user));
}
