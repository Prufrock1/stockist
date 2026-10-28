/* Catalogue, orders, and accounts in Postgres.
   Stock changes and order inserts share one transaction. */
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { BRANDS, PRODUCTS, seedOrders } from '../src/data/seed.js';
import { config } from './config.js';
import { hashPassword } from './auth.js';
import { migrate } from './migrate.js';

const { Pool } = pg;
const CATEGORIES = new Set(['Food & Drink', 'Apparel', 'Home', 'Beauty', 'Accessories']);
const TINTS = {
  'Food & Drink': 'oklch(0.90 0.03 150)',
  Apparel: 'oklch(0.89 0.012 250)',
  Home: 'oklch(0.91 0.03 85)',
  Beauty: 'oklch(0.90 0.035 20)',
  Accessories: 'oklch(0.88 0.012 70)',
};

function wholeNumber(value, message, min, max) {
  if (value === '' || value === null || value === undefined) throw HttpError(400, message);
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < min || n > max) throw HttpError(400, message);
  return n;
}

function imageOf(value) {
  if (!value) return null;
  const type = value.type;
  if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp') {
    throw HttpError(400, 'Use a JPEG, PNG, or WebP image.');
  }
  const data = String(value.data || '').replace(/^data:[^;]+;base64,/, '');
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length < 32 || bytes.length > 1_500_000 || !imageLooksValid(type, bytes)) {
    throw HttpError(400, 'That image could not be read. Use a JPEG, PNG, or WebP under 1.5 MB.');
  }
  return { type, bytes };
}

function imageLooksValid(type, bytes) {
  if (type === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8;
  return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}
function marksOf(name) {
  const words = name.split(/\s+/).filter(word => /[A-Za-z0-9]/.test(word));
  const letters = words.length >= 2 ? words[0][0] + words[1][0] : name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2);
  return (letters || 'NP').toUpperCase();
}
const STATUSES = new Set(['new', 'packing', 'shipped']);
const LOGIN_LIMIT = 8;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export function HttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function productOf(row) {
  const product = {
    id: row.id,
    b: row.brand_id,
    name: row.name,
    cat: row.cat,
    unit: row.unit,
    wp: row.wp,
    rrp: row.rrp,
    moq: row.moq,
    stock: row.stock,
    tint: row.tint,
    marks: row.marks,
    blurb: row.blurb,
  };
  if (row.image_url) product.imageUrl = row.image_url;
  return product;
}

function orderOf(row) {
  return {
    id: row.id,
    retailer: row.retailer,
    items: row.items || [],
    status: row.status,
    placedAt: Number(row.placed_at_ms),
    note: row.note,
  };
}

const PRODUCT_COLUMNS = 'id, brand_id, name, cat, unit, wp, rrp, moq, stock, tint, marks, blurb, image_url, position';

const ORDER_SQL = `
  SELECT o.id, o.retailer, o.status, o.note,
         (EXTRACT(EPOCH FROM o.placed_at) * 1000)::bigint AS placed_at_ms,
         COALESCE(
           json_agg(json_build_object('id', i.product_id, 'qty', i.qty) ORDER BY i.product_id)
             FILTER (WHERE i.product_id IS NOT NULL),
           '[]'
         ) AS items
  FROM orders o
  LEFT JOIN order_items i ON i.order_id = o.id
`;

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* already aborted */ }
    throw err;
  } finally {
    client.release();
  }
}

function linesOf(items) {
  if (!Array.isArray(items) || items.length === 0) throw HttpError(400, 'Order needs at least one line.');
  if (items.length > 100) throw HttpError(400, 'An order can have at most 100 lines.');
  const qtyById = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(item.id)) {
      throw HttpError(400, 'Each line needs a product id and a positive whole-number quantity.');
    }
    if (!Number.isInteger(item.qty) || item.qty <= 0 || item.qty > 100_000) {
      throw HttpError(400, 'Each line needs a product id and a positive whole-number quantity.');
    }
    qtyById.set(item.id, (qtyById.get(item.id) || 0) + item.qty);
  }
  return qtyById;
}

async function seedCatalogue(client) {
  const existing = await client.query('SELECT count(*)::int AS n FROM brands');
  if (existing.rows[0].n > 0) return;

  for (let i = 0; i < BRANDS.length; i++) {
    const brand = BRANDS[i];
    await client.query(
      `INSERT INTO brands (id, name, category, loc, tagline, position) VALUES ($1, $2, $3, $4, $5, $6)`,
      [brand.id, brand.name, brand.category, brand.loc, brand.tagline, i + 1],
    );
  }
  for (let i = 0; i < PRODUCTS.length; i++) {
    const product = PRODUCTS[i];
    await client.query(
      `INSERT INTO products
         (id, brand_id, name, cat, unit, wp, rrp, moq, stock, tint, marks, blurb, image_url, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [product.id, product.b, product.name, product.cat, product.unit, product.wp, product.rrp,
        product.moq, product.stock, product.tint, product.marks, product.blurb, product.imageUrl || null, i + 1],
    );
  }
  for (const order of seedOrders()) {
    await client.query(
      `INSERT INTO orders (id, retailer, user_id, status, placed_at, note)
       VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0), $6)`,
      [order.id, order.retailer, order.retailer === 'Maison Bleu' ? 'user-maison-bleu' : null,
        order.status, order.placedAt, order.note || ''],
    );
    for (const item of order.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, qty) VALUES ($1, $2, $3)`,
        [order.id, item.id, item.qty],
      );
    }
  }
  await client.query(`
    SELECT setval(
      'order_seq',
      GREATEST((SELECT MAX(CAST(substring(id FROM 5) AS integer)) FROM orders), 4471)
    )
  `);
}

const DEMO_ACCOUNTS = [
  { id: 'user-maison-bleu', email: 'maison@stockist.test', name: 'Maison Bleu', role: 'retailer', password: () => config.retailerPassword },
  { id: 'user-verre-group', email: 'verre@stockist.test', name: 'Verre Group', role: 'brand', password: () => config.brandPassword },
];

async function createBrandFor(client, account) {
  const brandId = account.id === 'user-verre-group' ? 'brand-verre-group' : 'brand-' + randomId();
  const position = await client.query('SELECT COALESCE(MAX(position), 0) + 1 AS n FROM brands');
  await client.query(
    `INSERT INTO brands (id, name, category, loc, tagline, position)
     VALUES ($1, $2, 'Home', '', '', $3)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [brandId, account.name, position.rows[0].n],
  );
  await client.query('UPDATE accounts SET brand_id = $2 WHERE id = $1', [account.id, brandId]);
  return brandId;
}

async function ensureSellerBrands(client) {
  const { rows } = await client.query(
    `SELECT id, name FROM accounts WHERE role = 'brand' AND brand_id IS NULL`,
  );
  for (const account of rows) await createBrandFor(client, account);
}

async function syncAccounts(client) {
  for (const account of DEMO_ACCOUNTS) {
    const passwordHash = await hashPassword(account.password());
    await client.query(
      `INSERT INTO accounts (id, email, name, role, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash`,
      [account.id, account.email, account.name, account.role, passwordHash],
    );
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function randomId() {
  return randomBytes(8).toString('hex');
}

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 120) throw HttpError(400, 'Enter a valid email.');
  return email;
}

function cleanName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 80) throw HttpError(400, 'Enter the business name.');
  return name;
}

async function waitForDatabase() {
  let last;
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      last = err;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw last;
}

export async function prepareDatabase() {
  await waitForDatabase();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [582019]);
    await migrate(client);
    await syncAccounts(client);
    await client.query('BEGIN');
    try {
      await seedCatalogue(client);
      await ensureSellerBrands(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [582019]); } catch { /* connection lost */ }
    client.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}

export async function healthy() {
  await pool.query('SELECT 1');
}

export const db = {
  async brands() {
    const { rows } = await pool.query(
      'SELECT id, name, category, loc, tagline FROM brands ORDER BY position',
    );
    return rows;
  },

  async products(category) {
    if (category && !CATEGORIES.has(category)) throw HttpError(400, 'Unknown category.');
    const { rows } = await pool.query(
      `SELECT ${PRODUCT_COLUMNS} FROM products WHERE ($1::text IS NULL OR cat = $1) ORDER BY position`,
      [category || null],
    );
    return rows.map(productOf);
  },

  async product(id) {
    const { rows } = await pool.query(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = $1`, [id]);
    return rows[0] ? productOf(rows[0]) : null;
  },

  async productImage(id) {
    const { rows } = await pool.query(
      'SELECT image_type, image_bytes FROM products WHERE id = $1',
      [id],
    );
    if (!rows[0] || !rows[0].image_bytes) return null;
    return { type: rows[0].image_type, bytes: rows[0].image_bytes };
  },

  async createProduct(session, body = {}) {
    if (session.role !== 'brand') throw HttpError(403, 'Only a seller account can add a product.');
    const name = String(body.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 1 || name.length > 120) throw HttpError(400, 'Enter a product name.');
    if (!CATEGORIES.has(body.cat)) throw HttpError(400, 'Choose a category.');
    const unit = String(body.unit || '').trim().replace(/\s+/g, ' ');
    if (unit.length < 1 || unit.length > 40) throw HttpError(400, 'Enter the wholesale unit, such as a case of 12.');
    const blurb = String(body.blurb || '').trim();
    if (blurb.length < 1 || blurb.length > 800) throw HttpError(400, 'Enter a short description.');
    const wp = wholeNumber(body.wp, 'Enter a wholesale price in whole dollars.', 0, 1_000_000);
    const rrp = wholeNumber(body.rrp, 'Enter a retail price in whole dollars.', 1, 1_000_000);
    const moq = wholeNumber(body.moq, 'Enter a minimum order of at least 1.', 1, 100_000);
    const stock = wholeNumber(body.stock, 'Enter how many units are in stock.', 0, 1_000_000);
    const image = imageOf(body.image);

    return withTransaction(async (client) => {
      const account = await client.query(
        'SELECT id, name, brand_id FROM accounts WHERE id = $1 AND role = $2',
        [session.userId, 'brand'],
      );
      if (!account.rowCount) throw HttpError(403, 'Only a seller account can add a product.');
      const brandId = account.rows[0].brand_id || await createBrandFor(client, account.rows[0]);
      const owned = await client.query('SELECT count(*)::int AS n FROM products WHERE brand_id = $1', [brandId]);
      if (owned.rows[0].n === 0) {
        await client.query('UPDATE brands SET category = $2 WHERE id = $1', [brandId, body.cat]);
      }
      const position = await client.query('SELECT COALESCE(MAX(position), 0) + 1 AS n FROM products');
      const id = 'p' + randomBytes(4).toString('hex');
      // Bytes live on the row for now. Move to S3 + CloudFront; see REFACTOR-NOTES.md §2.
      const imageUrl = image ? `/api/products/${id}/image` : null;
      const { rows } = await client.query(
        `INSERT INTO products
           (id, brand_id, name, cat, unit, wp, rrp, moq, stock, tint, marks, blurb, image_url, image_type, image_bytes, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING ${PRODUCT_COLUMNS}`,
        [id, brandId, name, body.cat, unit, wp, rrp, moq, stock,
          TINTS[body.cat], marksOf(name), blurb, imageUrl, image && image.type, image && image.bytes, position.rows[0].n],
      );
      return productOf(rows[0]);
    });
  },

  async ordersFor(session) {
    const userId = session.role === 'brand' ? null : session.userId;
    const { rows } = await pool.query(
      `${ORDER_SQL}
       WHERE ($1::text IS NULL OR o.user_id = $1)
       GROUP BY o.id
       ORDER BY o.placed_at DESC`,
      [userId],
    );
    return rows.map(orderOf);
  },

  async placeOrder(session, { items, note } = {}) {
    if (session.role !== 'retailer') throw HttpError(403, 'Only a retailer account can place an order.');
    const qtyById = linesOf(items);
    const ids = [...qtyById.keys()];
    const noteText = typeof note === 'string' ? note.trim().slice(0, 500) : '';

    return withTransaction(async (client) => {
      const locked = await client.query(
        'SELECT id, name, moq, stock FROM products WHERE id = ANY($1::text[]) FOR UPDATE',
        [ids],
      );
      const byId = new Map(locked.rows.map(row => [row.id, row]));
      for (const [id, qty] of qtyById) {
        const product = byId.get(id);
        if (!product) throw HttpError(400, `Unknown product ${id}.`);
        if (qty < product.moq) throw HttpError(400, `${product.name} has a minimum order of ${product.moq}.`);
        if (qty > product.stock) throw HttpError(409, `${product.name} only has ${product.stock} in stock.`);
      }
      for (const [id, qty] of qtyById) {
        const updated = await client.query(
          'UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2',
          [id, qty],
        );
        if (!updated.rowCount) throw HttpError(409, 'Stock changed while placing the order. Try again.');
      }
      const seq = await client.query(`SELECT nextval('order_seq') AS n`);
      const id = 'ORD-' + Number(seq.rows[0].n);
      await client.query(
        `INSERT INTO orders (id, retailer, user_id, status, placed_at, note) VALUES ($1, $2, $3, 'new', now(), $4)`,
        [id, session.account, session.userId, noteText],
      );
      for (const [productId, qty] of qtyById) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, qty) VALUES ($1, $2, $3)',
          [id, productId, qty],
        );
      }
      const { rows } = await client.query(`${ORDER_SQL} WHERE o.id = $1 GROUP BY o.id`, [id]);
      return orderOf(rows[0]);
    });
  },

  async setStatus(session, id, status) {
    if (session.role !== 'brand') throw HttpError(403, 'Only the brand studio can update order status.');
    if (!STATUSES.has(status)) throw HttpError(400, 'Status must be new, packing, or shipped.');
    const { rows } = await pool.query(
      `UPDATE orders SET status = $2 WHERE id = $1 RETURNING id`,
      [id, status],
    );
    if (!rows[0]) throw HttpError(404, 'Order not found.');
    const order = await pool.query(`${ORDER_SQL} WHERE o.id = $1 GROUP BY o.id`, [id]);
    return orderOf(order.rows[0]);
  },

  async favorites(session) {
    const { rows } = await pool.query(
      `SELECT f.brand_id
       FROM favorites f
       JOIN brands b ON b.id = f.brand_id
       WHERE f.user_id = $1
       ORDER BY b.position`,
      [session.userId],
    );
    return rows.map(row => row.brand_id);
  },

  async addFavorite(session, brandId) {
    const brand = await pool.query('SELECT 1 FROM brands WHERE id = $1', [brandId]);
    if (!brand.rowCount) throw HttpError(404, 'Brand not found.');
    await pool.query(
      `INSERT INTO favorites (user_id, brand_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [session.userId, brandId],
    );
    return this.favorites(session);
  },

  async removeFavorite(session, brandId) {
    await pool.query('DELETE FROM favorites WHERE user_id = $1 AND brand_id = $2', [session.userId, brandId]);
    return this.favorites(session);
  },

  async accountByEmail(email) {
    const { rows } = await pool.query(
      'SELECT id, email, name, role, password_hash FROM accounts WHERE lower(email) = $1',
      [cleanEmail(email)],
    );
    return rows[0] || null;
  },

  async signup({ email, name, role, password }) {
    if (role !== 'retailer' && role !== 'brand') throw HttpError(400, 'Choose a buyer or seller account.');
    const cleanPassword = String(password || '');
    if (cleanPassword.length < 8 || cleanPassword.length > 200) throw HttpError(400, 'Use at least 8 characters.');
    const id = 'user-' + randomId();
    const passwordHash = await hashPassword(cleanPassword);
    const accountName = cleanName(name);
    const accountEmail = cleanEmail(email);
    try {
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO accounts (id, email, name, role, password_hash) VALUES ($1, $2, $3, $4, $5)`,
          [id, accountEmail, accountName, role, passwordHash],
        );
        if (role === 'brand') await createBrandFor(client, { id, name: accountName });
      });
    } catch (err) {
      if (err.code === '23505') throw HttpError(409, 'An account with that email already exists.');
      throw err;
    }
    return { id, email: accountEmail, name: accountName, role };
  },

  async loginAllowed(ip) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM login_attempts
       WHERE ip = $1 AND at > now() - interval '15 minutes'`,
      [ip],
    );
    if (rows[0].n >= LOGIN_LIMIT) throw HttpError(429, 'Too many sign-in attempts. Try again later.');
  },

  async recordLoginFailure(ip) {
    await pool.query('INSERT INTO login_attempts (ip) VALUES ($1)', [ip]);
    await pool.query(`DELETE FROM login_attempts WHERE at < now() - interval '1 day'`);
  },

  async clearLoginFailures(ip) {
    await pool.query('DELETE FROM login_attempts WHERE ip = $1', [ip]);
  },

  async reset() {
    if (!config.allowReset) throw HttpError(404, 'Not found.');
    await withTransaction(async (client) => {
      await client.query('UPDATE accounts SET brand_id = NULL');
      await client.query('TRUNCATE favorites, order_items, orders, products');
      await client.query('DELETE FROM brands');
      await seedCatalogue(client);
      await ensureSellerBrands(client);
    });
  },
};
