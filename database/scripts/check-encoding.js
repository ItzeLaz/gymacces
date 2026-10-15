import { createConnection, getDatabaseName, isMainModule } from './connection.js';

// Carácter de reemplazo U+FFFD ("�") en UTF-8: aparece cuando el texto llegó en otra codificación.
// Se compara en binario porque la collation unicode_ci puede ignorarlo.
const REPLACEMENT_CHAR = Buffer.from(String.fromCodePoint(0xfffd), 'utf8');

// Busca en todas las columnas de texto los valores que perdieron caracteres (tildes, ñ, etc.)
export async function findDamagedText(databaseName = getDatabaseName()) {
  const connection = await createConnection({ database: databaseName });
  try {
    const [columns] = await connection.query(
      `SELECT c.TABLE_NAME AS tabla, c.COLUMN_NAME AS columna, k.COLUMN_NAME AS llave
         FROM information_schema.COLUMNS c
         JOIN information_schema.KEY_COLUMN_USAGE k
           ON k.TABLE_SCHEMA = c.TABLE_SCHEMA AND k.TABLE_NAME = c.TABLE_NAME AND k.CONSTRAINT_NAME = 'PRIMARY'
        WHERE c.TABLE_SCHEMA = ? AND c.CHARACTER_SET_NAME IS NOT NULL`,
      [databaseName],
    );

    const damaged = [];
    for (const { tabla, columna, llave } of columns) {
      const [rows] = await connection.query(
        `SELECT \`${llave}\` AS id, \`${columna}\` AS valor FROM \`${tabla}\`
          WHERE INSTR(BINARY \`${columna}\`, ?) > 0`,
        [REPLACEMENT_CHAR],
      );
      for (const row of rows) damaged.push({ tabla, columna, id: row.id, valor: row.valor });
    }
    return damaged;
  } finally {
    await connection.end();
  }
}

if (isMainModule(import.meta.url)) {
  findDamagedText()
    .then((damaged) => {
      if (damaged.length === 0) {
        console.log(`No hay texto dañado en "${getDatabaseName()}".`);
        return;
      }
      console.log('Valores con "�" (el carácter original se perdió y hay que corregirlo a mano):');
      for (const { tabla, columna, id, valor } of damaged) {
        console.log(`  ${tabla}.${columna} id=${id}: ${valor}`);
      }
      process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`No se pudo revisar la codificación: ${error.message}`);
      process.exitCode = 1;
    });
}
