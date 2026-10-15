import bcrypt from 'bcrypt';
import { env } from '../../src/config/env.js';
import { pool } from '../../src/config/db.js';
import { resetDatabase } from '../../../database/scripts/reset.js';

let counter = 0;
const unique = () => `${Date.now().toString(36)}${(counter += 1)}`;

// Borra y recrea la base de pruebas con las mismas migraciones del proyecto
export async function resetTestDatabase() {
  if (!env.isTest) throw new Error('Las pruebas solo pueden usar la base de pruebas.');
  await resetDatabase(env.db.name, { silent: true });
}

export async function createClient(datos = {}) {
  const cliente = {
    nombre: 'Cliente',
    apellido: `Prueba${unique()}`,
    correo: `cliente.${unique()}@prueba.com`,
    telefono: '5512345678',
    direccion: null,
    estado: 'activo',
    ...datos,
  };
  const [result] = await pool.execute(
    'INSERT INTO clientes (nombre, apellido, correo, telefono, direccion, estado) VALUES (?, ?, ?, ?, ?, ?)',
    [cliente.nombre, cliente.apellido, cliente.correo, cliente.telefono, cliente.direccion, cliente.estado],
  );
  return { ...cliente, id_cliente: result.insertId };
}

export async function createUser(datos = {}) {
  const usuario = {
    nombre: 'Usuario de prueba',
    correo: `usuario.${unique()}@prueba.com`,
    password: 'Prueba2026',
    rol: 'recepcionista',
    estado: 'activo',
    id_cliente: null,
    ...datos,
  };
  const hash = await bcrypt.hash(usuario.password, 4);
  const [result] = await pool.execute(
    'INSERT INTO usuarios (nombre, correo, password, rol, estado, id_cliente) VALUES (?, ?, ?, ?, ?, ?)',
    [usuario.nombre, usuario.correo, hash, usuario.rol, usuario.estado, usuario.id_cliente],
  );
  return { ...usuario, id_usuario: result.insertId };
}

// Crea un usuario con rol cliente vinculado a un cliente nuevo
export async function createClientUser(datosCliente = {}, datosUsuario = {}) {
  const cliente = await createClient(datosCliente);
  const usuario = await createUser({
    rol: 'cliente',
    id_cliente: cliente.id_cliente,
    correo: cliente.correo,
    ...datosUsuario,
  });
  return { cliente, usuario };
}

export async function closePool() {
  await pool.end();
}
