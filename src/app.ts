import cors from 'cors';
import express, { Express } from 'express';
import { readFileSync } from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import { join } from 'path';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';
import { errorHandler } from './middleware/errorHandler';
import ticketRoutes from './routes/ticket.routes';

const openapiDocument = parse(readFileSync(join(__dirname, '../openapi.yaml'), 'utf8'));

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '15mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/openapi.json', (_req, res) => res.json(openapiDocument));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
  app.use('/api', ticketRoutes);

  app.use(errorHandler);

  return app;
}
