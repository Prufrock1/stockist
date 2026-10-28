import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { once } from 'node:events';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ensurePostgres, stopPostgres } from '../scripts/embedded-pg.mjs';

process.env.NODE_ENV = 'test';
process.env.ALLOW_DEMO_LOGIN = 'true';
process.env.ALLOW_RESET = 'true';
process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars';
process.env.RETAILER_PASSWORD = 'maison';
process.env.BRAND_PASSWORD = 'verre';

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}

function assertLocal(url) {
  const host = new URL(url).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error('Refusing to run tests against a non-local database. Unset DATABASE_URL or point it at localhost.');
  }
}

const external = process.env.DATABASE_URL;
if (!external) {
  const dir = mkdtempSync(path.join(tmpdir(), 'stockist-pg-'));
  process.env.DATABASE_URL = await ensurePostgres({ dataDir: dir, port: await freePort() });
}
assertLocal(process.env.DATABASE_URL);

const { prepareDatabase, closeDatabase } = await import('./db.js');
const { listen } = await import('./index.js');

await prepareDatabase();
const server = listen(0);
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const jars = {};

async function cookieFor(role) {
  if (jars[role]) return jars[role];
  const res = await fetch(base + '/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, body.error || 'login failed');
  jars[role] = res.headers.getSetCookie().map(entry => entry.split(';')[0]).join('; ');
  return jars[role];
}

async function call(method, pathname, { role = 'retailer', body, auth = true, headers = {} } = {}) {
  const res = await fetch(base + pathname, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { cookie: await cookieFor(role) } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

test.after(async () => {
  server.close();
  await closeDatabase();
  if (!external) await stopPostgres();
});

describe('stockist api', { concurrency: false, timeout: 120_000 }, () => {
  test('requires a session and ignores forged role headers', async () => {
    assert.equal((await call('GET', '/api/health', { auth: false })).status, 200);
    const anon = await call('GET', '/api/orders', { auth: false });
    assert.equal(anon.status, 401);

    const bad = await fetch(base + '/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'brand', password: 'nope' }),
    });
    assert.equal(bad.status, 401);
    const good = await fetch(base + '/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'retailer', password: 'maison' }),
    });
    assert.equal(good.status, 200);

    const spoofed = await call('GET', '/api/orders', { headers: { 'X-Stockist-Role': 'brand' } });
    assert.ok(spoofed.body.every(order => order.retailer === 'Maison Bleu'));
  });

  test('serves the seed catalogue', async () => {
    const brands = await call('GET', '/api/brands');
    const products = await call('GET', '/api/products');
    const drink = await call('GET', '/api/products?category=Food%20%26%20Drink');
    const one = await call('GET', '/api/products/p1');
    assert.equal(brands.status, 200);
    assert.equal(brands.body.length, 8);
    assert.equal(products.body.length, 24);
    assert.equal(products.body[0].id, 'p1');
    assert.equal(products.body[9].id, 'p10');
    assert.ok(drink.body.every(product => product.cat === 'Food & Drink'));
    assert.equal(one.body.name, 'Yuzu & Verbena Spritz');
    assert.equal((await call('GET', '/api/products/nope')).status, 404);
    assert.equal((await call('GET', '/api/products?category=Nope')).status, 400);
  });

  test('scopes orders and decrements stock', async () => {
    const before = await call('GET', '/api/products/p15');
    const placed = await call('POST', '/api/orders', { body: { items: [{ id: 'p15', qty: 6 }], note: 'back bar' } });
    assert.equal(placed.status, 201);
    assert.equal(placed.body.status, 'new');
    assert.equal(placed.body.retailer, 'Maison Bleu');
    assert.equal(placed.body.note, 'back bar');
    assert.match(placed.body.id, /^ORD-\d+$/);

    const after = await call('GET', '/api/products/p15');
    assert.equal(after.body.stock, before.body.stock - 6);

    const mine = await call('GET', '/api/orders');
    assert.ok(mine.body.some(order => order.id === placed.body.id));
    assert.ok(mine.body.every(order => order.retailer === 'Maison Bleu'));

    const all = await call('GET', '/api/orders', { role: 'brand' });
    assert.ok(all.body.some(order => order.id === placed.body.id));
    assert.ok(all.body.some(order => order.retailer === 'The Larder'));

    const denied = await call('PATCH', `/api/orders/${placed.body.id}`, { body: { status: 'packing' } });
    assert.equal(denied.status, 403);
    const packed = await call('PATCH', `/api/orders/${placed.body.id}`, { role: 'brand', body: { status: 'packing' } });
    assert.equal(packed.body.status, 'packing');
  });

  test('rejects short and oversold lines', async () => {
    const short = await call('POST', '/api/orders', { body: { items: [{ id: 'p1', qty: 1 }] } });
    assert.equal(short.status, 400);
    const product = await call('GET', '/api/products/p9');
    const over = await call('POST', '/api/orders', { body: { items: [{ id: 'p9', qty: product.body.stock + 1 }] } });
    assert.equal(over.status, 409);
  });

  test('keeps favourites on the signed-in account and resets the fixture', async () => {
    const saved = await call('PUT', '/api/favorites/b3');
    assert.deepEqual(saved.body, ['b3']);
    assert.deepEqual((await call('GET', '/api/favorites', { role: 'brand' })).body, []);
    assert.deepEqual((await call('DELETE', '/api/favorites/b3')).body, []);

    const reset = await call('POST', '/api/reset');
    assert.equal(reset.status, 200);
    const product = await call('GET', '/api/products/p15');
    assert.equal(product.body.stock, 8);
    const orders = await call('GET', '/api/orders', { role: 'brand' });
    assert.equal(orders.body.some(order => order.note === 'back bar'), false);
  });

  test('only one of two concurrent orders can take the last stock', async () => {
    const [first, second] = await Promise.all([
      call('POST', '/api/orders', { body: { items: [{ id: 'p23', qty: 100 }] } }),
      call('POST', '/api/orders', { body: { items: [{ id: 'p23', qty: 100 }] } }),
    ]);
    assert.deepEqual([first.status, second.status].sort(), [201, 409]);
    const product = await call('GET', '/api/products/p23');
    assert.equal(product.body.stock, 40);
  });
});
