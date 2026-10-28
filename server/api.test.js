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
  const creds = role === 'brand'
    ? { email: 'verre@stockist.test', password: 'verre' }
    : { email: 'maison@stockist.test', password: 'maison' };
  const res = await fetch(base + '/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
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
      body: JSON.stringify({ email: 'verre@stockist.test', password: 'nope' }),
    });
    assert.equal(bad.status, 401);
    const good = await fetch(base + '/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'maison@stockist.test', password: 'maison' }),
    });
    assert.equal(good.status, 200);
    assert.equal((await good.json()).account, 'Maison Bleu');

    const spoofed = await call('GET', '/api/orders', { headers: { 'X-Stockist-Role': 'brand' } });
    assert.ok(spoofed.body.every(order => order.retailer === 'Maison Bleu'));
  });

  test('serves the seed catalogue', async () => {
    const brands = await call('GET', '/api/brands');
    const products = await call('GET', '/api/products');
    const drink = await call('GET', '/api/products?category=Food%20%26%20Drink');
    const one = await call('GET', '/api/products/p1');
    assert.equal(brands.status, 200);
    assert.equal(brands.body.length, 9);
    assert.ok(brands.body.some(brand => brand.id === 'brand-verre-group' && brand.name === 'Verre Group'));
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

  test('a seller can add a product and a buyer cannot', async () => {
    const denied = await call('POST', '/api/products', {
      body: { brandId: 'b1', name: 'Yuzu Cordial', cat: 'Food & Drink', unit: 'case of 6', wp: 24, rrp: 44, moq: 2, stock: 40, blurb: 'A bottled cordial.' },
    });
    assert.equal(denied.status, 403);

    const created = await call('POST', '/api/products', {
      role: 'brand',
      body: { brandId: 'b1', name: 'Yuzu Cordial', cat: 'Food & Drink', unit: 'case of 6', wp: 24, rrp: 44, moq: 2, stock: 40, blurb: 'A bottled cordial for the back bar.' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.name, 'Yuzu Cordial');
    assert.equal(created.body.b, 'brand-verre-group');
    assert.equal(created.body.marks, 'YC');
    const listed = await call('GET', '/api/products/' + created.body.id, { role: 'brand' });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.stock, 40);

    const blank = await call('POST', '/api/products', { role: 'brand', body: {} });
    assert.equal(blank.status, 400);
  });

  test('stores an uploaded product image', async () => {
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const created = await call('POST', '/api/products', {
      role: 'brand',
      body: {
        name: 'Photo Jar', cat: 'Home', unit: 'case of 6', wp: 20, rrp: 36, moq: 1, stock: 8,
        blurb: 'A photographed jar.',
        image: { type: 'image/png', data: png },
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.imageUrl, '/api/products/' + created.body.id + '/image');
    const image = await fetch(base + created.body.imageUrl, { headers: { cookie: await cookieFor('brand') } });
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/png');
    const bytes = Buffer.from(await image.arrayBuffer());
    assert.equal(bytes[0], 0x89);
    const anon = await fetch(base + created.body.imageUrl);
    assert.equal(anon.status, 401);
    const bad = await call('POST', '/api/products', {
      role: 'brand',
      body: {
        name: 'Broken Photo', cat: 'Home', unit: 'each', wp: 1, rrp: 2, moq: 1, stock: 1,
        blurb: 'Not an image.', image: { type: 'image/png', data: 'aaaa' },
      },
    });
    assert.equal(bad.status, 400);
  });

  test('signup creates a buyer and a seller with separate sessions', async () => {
    const buyerEmail = `buyer-${Date.now()}@example.com`;
    const buyer = await fetch(base + '/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'retailer', name: 'North Shop', email: buyerEmail, password: 'north-shop' }),
    });
    const buyerBody = await buyer.json();
    assert.equal(buyer.status, 201);
    assert.equal(buyerBody.role, 'retailer');
    assert.equal(buyerBody.account, 'North Shop');
    const buyerCookie = buyer.headers.getSetCookie().map(entry => entry.split(';')[0]).join('; ');

    const own = await fetch(base + '/api/orders', { headers: { cookie: buyerCookie } });
    assert.deepEqual(await own.json(), []);

    const seller = await fetch(base + '/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'brand', name: 'North Studio', email: `seller-${Date.now()}@example.com`, password: 'north-studio' }),
    });
    const sellerBody = await seller.json();
    assert.equal(seller.status, 201);
    assert.equal(sellerBody.role, 'brand');
    const sellerCookie = seller.headers.getSetCookie().map(entry => entry.split(';')[0]).join('; ');
    const all = await fetch(base + '/api/orders', { headers: { cookie: sellerCookie } });
    const allBody = await all.json();
    assert.equal(all.status, 200);
    assert.ok(allBody.some(order => order.retailer === 'The Larder'));

    const ownProduct = await fetch(base + '/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: sellerCookie },
      body: JSON.stringify({ name: 'Studio Oil', cat: 'Beauty', unit: 'case of 6', wp: 22, rrp: 40, moq: 1, stock: 12, blurb: 'A house oil.', brandId: 'b1' }),
    });
    const ownBody = await ownProduct.json();
    assert.equal(ownProduct.status, 201);
    assert.notEqual(ownBody.b, 'b1');
    const brands = await fetch(base + '/api/brands', { headers: { cookie: sellerCookie } });
    const brandList = await brands.json();
    assert.equal(brandList.find(brand => brand.id === ownBody.b).name, 'North Studio');

    const duplicate = await fetch(base + '/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'retailer', name: 'Other', email: buyerEmail, password: 'north-shop' }),
    });
    assert.equal(duplicate.status, 409);
  });
});
