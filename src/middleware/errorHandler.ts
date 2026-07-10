import { NextFunction, Request, Response } from 'express';
import { PMToolError } from '../utils/errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof PMToolError) {
    res.status(err.statusCode).json({ error: err.message, provider: err.provider });
    return;
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
