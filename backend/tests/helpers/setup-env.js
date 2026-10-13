// Se carga con --import antes que cualquier módulo: fuerza la base de pruebas
process.env.NODE_ENV = 'test';

// Llave fija solo para pruebas: npm test no depende de la llave real de backend/.env
process.env.FACE_DATA_KEY ??= Buffer.alloc(32, 7).toString('base64');
process.env.APP_TIMEZONE ??= 'America/Mexico_City';
