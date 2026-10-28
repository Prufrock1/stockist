/* Catalogue, orders, and accounts in Postgres.
   Stock changes and order inserts share one transaction. */
import pg from 'pg';
import { BRANDS, PRODUCTS, seedOrders } from '../src/data/seed.js';
import { config } from './config.js';
import { hashPassword } from './auth.js';
import { migrate } from './migrate.js';

const { Pool } = pg;
const CATEGORIES = new Set(['Food & Drink', 'Apparel', 'Home', 'Beauty', 'Accessories']);
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
      `INSERT INTO orders (id, retailer, status, placed_at, note)
       VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), $5)`,
      [order.id, order.retailer, order.status, order.placedAt, order.note || ''],
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

async function syncAccounts(client) {
  const accounts = [
    ['Maison Bleu', 'retailer', config.retailerPassword],
    ['Verre Group', 'brand', config.brandPassword],
  ];
  for (const [name, role, password] of accounts) {
    const passwordHash = await hashPassword(password);
    await client.query(
      `INSERT INTO accounts (name, role, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash`,
      [name, role, passwordHash],
    );
  }
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
      `SELECT * FROM products WHERE ($1::text IS NULL OR cat = $1) ORDER BY position`,
      [category || null],
    );
    return rows.map(productOf);
  },

  async product(id) {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return rows[0] ? productOf(rows[0]) : null;
  },

  async ordersFor(session) {
    const retailer = session.role === 'brand' ? null : session.account;
    const { rows } = await pool.query(
      `${ORDER_SQL}
       WHERE ($1::text IS NULL OR o.retailer = $1)
       GROUP BY o.id
       ORDER BY o.placed_at DESC`,
      [retailer],
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
        `INSERT INTO orders (id, retailer, status, placed_at, note) VALUES ($1, $2, 'new', now(), $3)`,
        [id, session.account, noteText],
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
       WHERE f.account = $1
       ORDER BY b.position`,
      [session.account],
    );
    return rows.map(row => row.brand_id);
  },

  async addFavorite(session, brandId) {
    const brand = await pool.query('SELECT 1 FROM brands WHERE id = $1', [brandId]);
    if (!brand.rowCount) throw HttpError(404, 'Brand not found.');
    await pool.query(
      `INSERT INTO favorites (account, brand_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [session.account, brandId],
    );
    return this.favorites(session);
  },

  async removeFavorite(session, brandId) {
    await pool.query('DELETE FROM favorites WHERE account = $1 AND brand_id = $2', [session.account, brandId]);
    return this.favorites(session);
  },

  async accountByRole(role) {
    const { rows } = await pool.query(
      'SELECT name, role, password_hash FROM accounts WHERE role = $1',
      [role],
    );
    return rows[0] || null;
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
      await client.query('TRUNCATE favorites, order_items, orders, products, brands');
      await seedCatalogue(client);
    });
  },
};
