/* Local and test Postgres when DATABASE_URL is not already set.
   Production never imports this; it connects to RDS. */
import fs from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

let instance = null;

export async function ensurePostgres({ dataDir, port, database = 'stockist' }) {
  const user = 'stockist';
  const password = 'stockist';
  fs.mkdirSync(dataDir, { recursive: true });
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port,
    persistent: true,
    onLog: () => {},
    onError: message => {
      const text = String(message || '');
      if (text.trim()) console.error(text);
    },
  });
  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(database);
  } catch (err) {
    const message = String(err && err.message || err);
    if (!/already exists/i.test(message)) throw err;
  }
  instance = pg;
  return `postgres://${user}:${password}@127.0.0.1:${port}/${database}`;
}

export async function stopPostgres() {
  if (!instance) return;
  const current = instance;
  instance = null;
  await current.stop();
}
