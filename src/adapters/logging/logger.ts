import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { threadId } from 'node:worker_threads';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

const MAX_LOG_STRING_LENGTH = 1000;
const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/;
const RESERVED_LOG_KEYS = new Set(['timestamp', 'level', 'pid', 'thread', 'module', 'message']);

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

interface ConsoleWriter {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export class FileConsoleLogger implements Logger {
  private readonly logDir: string;
  private readonly now: () => Date;
  private readonly consoleWriter: ConsoleWriter;

  constructor(options: { logDir?: string; now?: () => Date; consoleWriter?: ConsoleWriter } = {}) {
    this.logDir = options.logDir ?? join(process.cwd(), 'logs');
    this.now = options.now ?? (() => new Date());
    this.consoleWriter = options.consoleWriter ?? console;
    mkdirSync(this.logDir, { recursive: true });
  }

  info(message: string, context: LogContext = {}): void {
    this.write('info', message, context);
  }

  warn(message: string, context: LogContext = {}): void {
    this.write('warn', message, context);
  }

  error(message: string, context: LogContext = {}): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context: LogContext): void {
    const timestamp = this.now().toISOString();
    const module = this.formatModule(context.module);
    const contextParts = Object.entries(context)
      .filter(([key]) => !RESERVED_LOG_KEYS.has(key))
      .map(([key, value]) => `${key}=${this.formatValue(this.sanitizeValue(value))}`);
    const line = [
      timestamp,
      `level=${level.toUpperCase()}`,
      `pid=${process.pid}`,
      `thread=${threadId}`,
      `module=${module}`,
      `message=${this.formatValue(message)}`,
      ...contextParts,
    ].join(' ');

    appendFileSync(join(this.logDir, `app-${timestamp.slice(0, 10)}.log`), `${line}\n`, 'utf8');

    if (level === 'error') {
      this.consoleWriter.error(line);
      return;
    }

    if (level === 'warn') {
      this.consoleWriter.warn(line);
      return;
    }

    this.consoleWriter.log(line);
  }

  private formatModule(value: unknown): string {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'app';
  }

  private sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, this.sanitizeValue(item)]),
      );
    }

    return value;
  }

  private sanitizeString(value: string): string {
    const dataUrlMatch = value.match(DATA_URL_PATTERN);

    if (dataUrlMatch) {
      return `<image-data-url mime=${dataUrlMatch[1]} bytes=${this.estimateBase64Bytes(dataUrlMatch[2])}>`;
    }

    if (value.length > MAX_LOG_STRING_LENGTH) {
      return `${value.slice(0, MAX_LOG_STRING_LENGTH)}...<truncated chars=${value.length}>`;
    }

    return value;
  }

  private estimateBase64Bytes(base64: string): number {
    const normalized = base64.replace(/\s/g, '');
    const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'string') {
      return JSON.stringify(value);
    }

    return JSON.stringify(value);
  }
}

export const appLogger = new FileConsoleLogger();
