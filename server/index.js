/* STOCKIST API
   POST   /api/signup                 { role: retailer|brand, name, email, password }
   POST   /api/session                { email, password }
   GET    /api/session
   DELETE /api/session
   GET    /api/health
   GET    /api/brands
   GET    /api/products?category=
   GET    /api/products/:id
   POST   /api/products               seller: { name, cat, unit, wp, rrp, moq, stock, blurb, image? }
   GET    /api/orders                  buyer: own orders, one shipment per seller · seller: their shipment only
   POST   /api/orders                  { items: [{ id, qty }], note }
   PATCH  /api/orders/:id              { status }
   GET    /api/favorites
   PUT    /api/favorites/:brandId
   DELETE /api/favorites/:brandId
   POST   /api/reset                   development only

   Buyer is role "retailer". Seller is role "brand".
   Authorization is the signed HttpOnly cookie from signup or sign-in.
*/
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from './config.js';
import { clearCookie, COOKIE, readSession, sessionCookie, signSession, verifyPassword } from './auth.js';
import { closeDatabase, db, healthy, prepareDatabase } from './db.js';

const DIST = path.resolve('dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function log(fields) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...fields }));
}

function cookiesOf(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function clientIp(req) {
  if (config.trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim().slice(0, 64);
  }
  return req.socket.remoteAddress || 'unknown';
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin || !config.corsOrigins.length) return '';
  return config.corsOrigins.includes(origin) ? origin : '';
}

function send(req, res, status, body, extra = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
    ...extra,
  };
  const allow = originAllowed(req);
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers.Vary = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 2_500_000) {
        reject(Object.assign(new Error('Payload too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('Invalid JSON.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function sessionOf(req) {
  return readSession(cookiesOf(req)[COOKIE]);
}

function publicSession(account) {
  return { userId: account.id, role: account.role, account: account.name, email: account.email };
}

async function login(req, res) {
  const body = await readBody(req);
  const ip = clientIp(req);
  await db.loginAllowed(ip);
  let account = null;
  try {
    account = await db.accountByEmail(body.email);
  } catch (err) {
    if (err.status) {
      send(req, res, err.status, { error: err.message });
      return;
    }
    throw err;
  }
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
  const match = account && await verifyPassword(password, account.password_hash);
  if (!match) {
    await db.recordLoginFailure(ip);
    send(req, res, 401, { error: 'Email or password is incorrect.' });
    return;
  }
  await db.clearLoginFailures(ip);
  const session = publicSession(account);
  send(req, res, 200, session, { 'Set-Cookie': sessionCookie(signSession(session)) });
}

async function signup(req, res) {
  const body = await readBody(req);
  const ip = clientIp(req);
  await db.loginAllowed(ip);
  const account = await db.signup(body);
  await db.clearLoginFailures(ip);
  const session = publicSession(account);
  send(req, res, 201, session, { 'Set-Cookie': sessionCookie(signSession(session)) });
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    const headers = {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Max-Age': '600',
    };
    const allow = originAllowed(req);
    if (allow) {
      headers['Access-Control-Allow-Origin'] = allow;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers.Vary = 'Origin';
    }
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'health' && parts.length === 2) {
    await healthy();
    send(req, res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'signup' && parts.length === 2) {
    return signup(req, res);
  }

  if (parts[0] === 'api' && parts[1] === 'session' && parts.length === 2) {
    if (req.method === 'POST') return login(req, res);
    if (req.method === 'DELETE') {
      send(req, res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
      return;
    }
    if (req.method === 'GET') {
      const session = sessionOf(req);
      if (!session) {
        send(req, res, 401, { error: 'Sign in required.' });
        return;
      }
      send(req, res, 200, session);
      return;
    }
  }

  if (parts[0] !== 'api') {
    if (await serveStatic(req, res, url.pathname)) return;
    send(req, res, 404, { error: 'Not found.' });
    return;
  }

  const session = sessionOf(req);
  if (!session) {
    send(req, res, 401, { error: 'Sign in required.' });
    return;
  }

  if (req.method === 'GET' && parts[1] === 'brands' && parts.length === 2) {
    send(req, res, 200, await db.brands(session));
    return;
  }
  if (req.method === 'GET' && parts[1] === 'products' && parts.length === 4 && parts[3] === 'image') {
    const image = await db.productImage(session, decodeURIComponent(parts[2]));
    if (!image) {
      send(req, res, 404, { error: 'Image not found.' });
      return;
    }
    res.writeHead(200, {
      'Content-Type': image.type,
      'Content-Length': image.bytes.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=86400',
    });
    res.end(image.bytes);
    return;
  }
  if (req.method === 'POST' && parts[1] === 'products' && parts.length === 2) {
    send(req, res, 201, await db.createProduct(session, await readBody(req)));
    return;
  }
  if (req.method === 'GET' && parts[1] === 'products' && parts.length === 2) {
    send(req, res, 200, await db.products(session, url.searchParams.get('category') || undefined));
    return;
  }
  if (req.method === 'GET' && parts[1] === 'products' && parts.length === 3) {
    const product = await db.product(session, decodeURIComponent(parts[2]));
    if (!product) {
      send(req, res, 404, { error: 'Product not found.' });
      return;
    }
    send(req, res, 200, product);
    return;
  }
  if (req.method === 'GET' && parts[1] === 'orders' && parts.length === 2) {
    send(req, res, 200, await db.ordersFor(session));
    return;
  }
  if (req.method === 'POST' && parts[1] === 'orders' && parts.length === 2) {
    send(req, res, 201, await db.placeOrder(session, await readBody(req)));
    return;
  }
  if (req.method === 'PATCH' && parts[1] === 'orders' && parts.length === 3) {
    const body = await readBody(req);
    send(req, res, 200, await db.setStatus(session, decodeURIComponent(parts[2]), body.status));
    return;
  }
  if (parts[1] === 'favorites' && parts.length === 2 && req.method === 'GET') {
    send(req, res, 200, await db.favorites(session));
    return;
  }
  if (parts[1] === 'favorites' && parts.length === 3 && req.method === 'PUT') {
    send(req, res, 200, await db.addFavorite(session, decodeURIComponent(parts[2])));
    return;
  }
  if (parts[1] === 'favorites' && parts.length === 3 && req.method === 'DELETE') {
    send(req, res, 200, await db.removeFavorite(session, decodeURIComponent(parts[2])));
    return;
  }
  if (req.method === 'POST' && parts[1] === 'reset' && parts.length === 2) {
    await db.reset();
    send(req, res, 200, { ok: true });
    return;
  }

  send(req, res, 404, { error: 'Not found.' });
}

async function serveStatic(req, res, pathname) {
  if (!config.production || (req.method !== 'GET' && req.method !== 'HEAD')) return false;
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  let file = path.resolve(DIST, '.' + rel);
  const inside = file === DIST || file.startsWith(DIST + path.sep);
  if (!inside) return false;
  let info = await stat(file).catch(() => null);
  if (!info || !info.isFile()) {
    file = path.join(DIST, 'index.html');
    info = await stat(file).catch(() => null);
    if (!info) return false;
  }
  const type = TYPES[path.extname(file)] || 'application/octet-stream';
  const cache = file.includes(`${path.sep}assets${path.sep}`)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': info.size,
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  });
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  createReadStream(file).pipe(res);
  return true;
}

export function createApp() {
  return http.createServer((req, res) => {
    const started = Date.now();
    res.on('finish', () => {
      const url = (req.url || '').split('?')[0];
      if (url === '/api/health' && res.statusCode === 200) return;
      log({ method: req.method, path: url, status: res.statusCode, ms: Date.now() - started });
    });
    handle(req, res).catch(err => {
      const status = err.status || 500;
      if (status === 500) log({ level: 'error', message: err.message, stack: err.stack });
      if (!res.headersSent) send(req, res, status, { error: status === 500 ? 'Something went wrong.' : err.message });
    });
  });
}

export function listen(port = config.port) {
  const server = createApp();
  const sockets = new Set();
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.listen(port, () => {
    const address = server.address();
    log({ message: 'listening', port: address && address.port });
  });
  return server;
}

let shuttingDown = false;
async function shutdown(server) {
  if (shuttingDown) return;
  shuttingDown = true;
  log({ message: 'shutting down' });
  server.close();
  await closeDatabase();
  process.exit(0);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  prepareDatabase()
    .then(() => {
      const server = listen();
      process.on('SIGTERM', () => shutdown(server));
      process.on('SIGINT', () => shutdown(server));
    })
    .catch(err => {
      log({ level: 'error', message: err.message, stack: err.stack });
      process.exit(1);
    });
}
