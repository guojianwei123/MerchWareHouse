import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(rootDir);

const parseEnvValue = (value) => {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const loadDotEnv = () => {
  const envPath = resolve(rootDir, '.env');

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^(?:export\s+)?([^=\s]+)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, value] = match;
    process.env[key] = parseEnvValue(value);
  }
};

const isWindows = process.platform === 'win32';
const children = new Set();
let isShuttingDown = false;

loadDotEnv();

const start = (label, script) => {
  const child = spawn('corepack', ['pnpm', script], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    shell: isWindows,
  });

  children.add(child);

  child.on('exit', (code, signal) => {
    children.delete(child);

    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    stopChildren();

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });

  child.on('error', (error) => {
    console.error(`${label} failed to start: ${error.message}`);

    if (!isShuttingDown) {
      isShuttingDown = true;
      stopChildren();
      process.exit(1);
    }
  });
};

const stopChildren = () => {
  for (const child of children) {
    if (isWindows && child.pid) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      continue;
    }

    child.kill();
  }
};

const shutdown = () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  stopChildren();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', stopChildren);

console.log(`Starting API on http://localhost:${process.env.PORT || '3000'}`);
start('API', 'api:dev');

console.log(`Starting Web on ${process.env.VITE_API_BASE_URL || 'http://localhost:3000'} backed Vite dev server`);
start('Web', 'dev');
