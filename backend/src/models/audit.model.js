import { pool } from '../config/db.js';

export async function insert({ id_usuario, accion, entidad, id_registro, descripcion = null }, connection = pool) {
  await connection.execute(
    'INSERT INTO auditoria (id_usuario, accion, entidad, id_registro, descripcion) VALUES (?, ?, ?, ?, ?)',
    [id_usuario, accion, entidad, id_registro, descripcion],
  );
}
