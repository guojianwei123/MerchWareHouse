import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileConsoleLogger } from '../../src/adapters/logging/logger';

describe('FileConsoleLogger', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('writes readable lines with runtime metadata to the daily log file and console', () => {
    const logDir = mkdtempSync(join(tmpdir(), 'guozi-logs-'));
    tempDirs.push(logDir);
    const consoleWriter = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const logger = new FileConsoleLogger({
      logDir,
      now: () => new Date('2026-04-27T01:02:03.000Z'),
      consoleWriter,
    });

    logger.info('Test log entry', { requestId: 'req-1' });

    const files = readdirSync(logDir);
    expect(files).toEqual(['app-2026-04-27.log']);

    const line = readFileSync(join(logDir, files[0]), 'utf8').trim();
    expect(line).toContain('2026-04-27T01:02:03.000Z');
    expect(line).toContain('level=INFO');
    expect(line).toContain(`pid=${process.pid}`);
    expect(line).toContain('thread=0');
    expect(line).toContain('module=app');
    expect(line).toContain('message="Test log entry"');
    expect(line).toContain('requestId="req-1"');
    expect(consoleWriter.log).toHaveBeenCalledWith(line);
  });

  it('summarizes image data URLs and truncates long strings', () => {
    const logDir = mkdtempSync(join(tmpdir(), 'guozi-logs-'));
    tempDirs.push(logDir);
    const consoleWriter = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const logger = new FileConsoleLogger({
      logDir,
      now: () => new Date('2026-04-27T01:02:03.000Z'),
      consoleWriter,
    });

    logger.info('Image payload', {
      module: 'ai.ocr',
      image: 'data:image/jpeg;base64,aGVsbG8=',
      nested: { longText: 'a'.repeat(1005) },
    });

    const line = readFileSync(join(logDir, 'app-2026-04-27.log'), 'utf8').trim();
    expect(line).toContain('module=ai.ocr');
    expect(line).toContain('image="<image-data-url mime=image/jpeg bytes=5>"');
    expect(line).not.toContain('aGVsbG8=');
    expect(line).toContain('<truncated chars=1005>');
  });
});
