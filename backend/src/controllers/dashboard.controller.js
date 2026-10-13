import * as dashboardService from '../services/dashboard.service.js';
import { sendData } from '../utils/response.js';

export async function get(req, res) {
  const { periodo, desde, hasta } = req.validatedQuery;
  sendData(res, await dashboardService.getDashboard({ periodo, desde, hasta }));
}
