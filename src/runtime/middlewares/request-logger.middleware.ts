import type { NextFunction, Request, Response } from 'express';
import { appLogger, type Logger } from '../../adapters/logging/logger';

export const createRequestLogger = (logger: Logger = appLogger) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      logger.info('HTTP request completed', {
        module: 'http',
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      });
    });

    next();
  };
};

export const requestLogger = createRequestLogger();
