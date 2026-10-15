import { isUtf8 } from 'node:buffer';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { validationError } from './utils/AppError.js';

// express.json cambia en silencio los bytes que no son UTF-8 por "�" y el texto llega dañado a la
// base (por ejemplo, Invoke-RestMethod de Windows PowerShell 5.1 envía el cuerpo en Latin-1).
// Se rechaza la solicitud para que el cliente la reenvíe en UTF-8 en lugar de perder las tildes.
function rejectInvalidUtf8(req, res, buffer) {
  if (!isUtf8(buffer)) {
    throw validationError(undefined, 'El cuerpo de la solicitud debe estar codificado en UTF-8.');
  }
}

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '100kb', verify: rejectInvalidUtf8 }));

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);
