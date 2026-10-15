import bcrypt from 'bcrypt';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

// Crea el primer administrador si todavía no existe ninguno (FR-016)
export async function seed(connection) {
  const nombre = process.env.ADMIN_NOMBRE?.trim() || 'Administrador';
  const correo = process.env.ADMIN_CORREO?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!correo || !password) {
    throw new Error('Define ADMIN_CORREO y ADMIN_PASSWORD en database/.env');
  }
  if (!PASSWORD_RULE.test(password)) {
    throw new Error(
      'ADMIN_PASSWORD debe tener entre 8 y 72 caracteres, al menos una letra y un número',
    );
  }

  const [admins] = await connection.execute(
    "SELECT id_usuario FROM usuarios WHERE rol = 'administrador' LIMIT 1",
  );
  if (admins.length > 0) {
    return 'Ya existe un administrador; no se creó otro.';
  }

  const hash = await bcrypt.hash(password, 10);
  await connection.execute(
    "INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, 'administrador')",
    [nombre, correo, hash],
  );
  return `Administrador inicial creado: ${correo}`;
}
