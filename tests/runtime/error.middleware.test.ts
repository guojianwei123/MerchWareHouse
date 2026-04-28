import type { Request, Response } from 'express';
import { z, type ZodError } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../src/adapters/logging/logger';
import { createErrorHandler } from '../../src/runtime/middlewares/error.middleware';

const createTestLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const createRequest = (): Request =>
  ({
    method: 'POST',
    originalUrl: '/api/items',
    url: '/api/items',
  }) as Request;

const createResponse = (): Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
};

const createZodError = (): ZodError => {
  try {
    z.object({ name: z.string() }).parse({});
  } catch (error) {
    return error as ZodError;
  }

  throw new Error('Expected ZodError');
};

describe('error middleware', () => {
  it('logs validation errors as warnings and returns 400', () => {
    const logger = createTestLogger();
    const handler = createErrorHandler(logger);
    const res = createResponse();

    handler(createZodError(), createRequest(), res, vi.fn());

    expect(logger.warn).toHaveBeenCalledWith(
      'Request validation failed',
      expect.objectContaining({
        module: 'http.error',
        method: 'POST',
        path: '/api/items',
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: 'name',
            message: 'Required',
          }),
        ]),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });

  it('logs unhandled errors and returns 500', () => {
    const logger = createTestLogger();
    const handler = createErrorHandler(logger);
    const res = createResponse();
    const error = new Error('Database unavailable');

    handler(error, createRequest(), res, vi.fn());

    expect(logger.error).toHaveBeenCalledWith(
      'Unhandled request error',
      expect.objectContaining({
        module: 'http.error',
        method: 'POST',
        path: '/api/items',
        errorMessage: 'Database unavailable',
        stack: expect.stringContaining('Database unavailable'),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INTERNAL_ERROR' }));
  });
});
