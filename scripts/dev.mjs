import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensurePostgres, stopPostgres } from './embedded-pg.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
let embedded = false;

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = await ensurePostgres({
    dataDir: fileURLToPath(new URL('../server/data/pg', import.meta.url)),
    port: 54329,
  });
  embedded = true;
}
if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'dev-only-session-secret-change-me';
if (!process.env.ALLOW_DEMO_LOGIN) process.env.ALLOW_DEMO_LOGIN = 'true';
process.env.LOCAL_SECOND_SELLER = 'true';
if (!process.env.ALLOW_RESET) process.env.ALLOW_RESET = 'true';
if (!process.env.RETAILER_PASSWORD) process.env.RETAILER_PASSWORD = 'maison';
if (!process.env.BRAND_PASSWORD) process.env.BRAND_PASSWORD = 'verre';

const children = [
  spawn(process.execPath, ['server/index.js'], { cwd: root, stdio: 'inherit', env: process.env }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { cwd: root, stdio: 'inherit', env: process.env }),
];

let closing = false;
function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill('SIGTERM');
  const stop = embedded ? stopPostgres() : Promise.resolve();
  stop.finally(() => process.exit(code));
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
for (const child of children) {
  child.on('exit', code => {
    if (!closing && code) shutdown(code);
  });
}
