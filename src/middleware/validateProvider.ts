import { NextFunction, Request, Response } from 'express';
import { PMProvider } from '../types/ticket.types';

const SUPPORTED_PROVIDERS: PMProvider[] = ['jira', 'clickup'];

export function validateProvider(req: Request, res: Response, next: NextFunction): void {
  const provider = req.params.provider as PMProvider;
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    res.status(400).json({
      error: `Unsupported provider "${provider}". Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}`,
    });
    return;
  }
  next();
}
