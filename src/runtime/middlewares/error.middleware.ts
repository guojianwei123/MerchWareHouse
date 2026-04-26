import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      data: null,
      error: {
        message: 'Validation Error',
        details: err.errors,
      },
      code: 'VALIDATION_ERROR',
    });
  }

  console.error(err);
  res.status(500).json({
    data: null,
    error: { message: err.message || 'Internal Server Error' },
    code: 'INTERNAL_ERROR',
  });
};
