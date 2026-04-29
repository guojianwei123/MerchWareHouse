import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { appLogger, type Logger } from '../../adapters/logging/logger';
import { AuthServiceError } from '../../service/auth.service';
import { ShowcaseServiceError } from '../../service/showcase.service';

export const createErrorHandler = (logger: Logger = appLogger) => {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ZodError) {
      logger.warn('Request validation failed', {
        module: 'http.error',
        method: req.method,
        path: req.originalUrl || req.url,
        issues: err.errors.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });

      return res.status(400).json({
        data: null,
        error: {
          message: 'Validation Error',
          details: err.errors,
        },
        code: 'VALIDATION_ERROR',
      });
    }

    if (err instanceof AuthServiceError) {
      logger.warn('Authentication request failed', {
        module: 'http.error',
        method: req.method,
        path: req.originalUrl || req.url,
        code: err.code,
        message: err.message,
      });

      return res.status(err.statusCode).json({
        data: null,
        error: { message: err.message },
        code: err.code,
      });
    }

    if (err instanceof ShowcaseServiceError) {
      logger.warn('Showcase request failed', {
        module: 'http.error',
        method: req.method,
        path: req.originalUrl || req.url,
        code: err.code,
        message: err.message,
      });

      return res.status(err.statusCode).json({
        data: null,
        error: { message: err.message },
        code: err.code,
      });
    }

    logger.error('Unhandled request error', {
      module: 'http.error',
      method: req.method,
      path: req.originalUrl || req.url,
      errorMessage: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      data: null,
      error: { message: err.message || 'Internal Server Error' },
      code: 'INTERNAL_ERROR',
    });
  };
};

export const errorHandler = createErrorHandler();
