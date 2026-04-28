import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../src/adapters/logging/logger';
import { createRequestLogger } from '../../src/runtime/middlewares/request-logger.middleware';

const createTestLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe('request logger middleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs method, path, status code, and duration when the response finishes', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1042);
    const logger = createTestLogger();
    const middleware = createRequestLogger(logger);
    const req = {
      method: 'POST',
      originalUrl: '/api/ingestion/extract',
      url: '/api/ingestion/extract',
    } as Request;
    const res = Object.assign(new EventEmitter(), { statusCode: 201 }) as Response;
    const next = vi.fn();

    middleware(req, res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith('HTTP request completed', {
      module: 'http',
      method: 'POST',
      path: '/api/ingestion/extract',
      statusCode: 201,
      durationMs: 42,
    });
  });
});
