import * as classesService from '../services/classes.service.js';
import { sendData } from '../utils/response.js';

export async function list(req, res) {
  sendData(res, await classesService.listClasses(req.validatedQuery, req.user));
}

export async function instructors(req, res) {
  sendData(res, await classesService.listInstructors());
}

// 201 con el mensaje de éxito de US1, criterio 1
export async function create(req, res) {
  const data = await classesService.createClass(req.validated, req.user);
  res.status(201).json({ data, message: 'Clase registrada.' });
}

export async function update(req, res) {
  sendData(res, await classesService.updateClass(req.params.id, req.validated, req.user));
}

export async function deactivate(req, res) {
  sendData(res, await classesService.deactivateClass(req.params.id, req.user));
}

export async function schedule(req, res) {
  sendData(res, await classesService.getSchedule(req.validatedQuery));
}

export async function sessionDetail(req, res) {
  sendData(res, await classesService.getSessionDetail(req.params.id, req.params.fecha));
}
