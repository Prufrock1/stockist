/* ============================================================
   STOCKIST — Console data helpers (console-data.js)
   Derived fields, saved views, category colors for the dense
   operator's spreadsheet. Pure data — no UI.
   ============================================================ */
export const C_MARGIN = (p) => Math.round((1 - p.wp / p.rrp) * 100);

// stable per-SKU demand series (12 weeks) + total
const _demandCache = {};
export function C_DEMAND(p) {
  if (_demandCache[p.id]) return _demandCache[p.id];
  let seed = 0; for (const ch of p.id) seed += ch.charCodeAt(0);
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const base = 28 + (p.stock % 40);
  const arr = []; let v = base;
  for (let i = 0; i < 12; i++) { v = Math.max(8, Math.min(100, v + (rnd() - 0.42) * 22)); arr.push(Math.round(v)); }
  const total = arr.reduce((a, b) => a + b, 0);
  _demandCache[p.id] = { series: arr, total, trend: arr[11] - arr[0] };
  return _demandCache[p.id];
}

export const C_NEW = new Set(['p2', 'p6', 'p9', 'p12', 'p17', 'p21']);

// category-matched product photography — shared with the catalogue tiles
export { productImage as C_IMG } from '../data/images.js';

export const CAT_COLOR = {
  'Food & Drink': 'oklch(0.62 0.14 45)',
  'Apparel': 'oklch(0.55 0.12 165)',
  'Home': 'oklch(0.52 0.15 280)',
  'Beauty': 'oklch(0.55 0.13 320)',
  'Accessories': 'oklch(0.58 0.12 85)',
};

// saved views (smart filters) — predicate and/or default sort
export const SAVED_VIEWS = [
  { id: 'all', label: 'All products', ico: 'grid', summary: (n) => `All ${n} products in the wholesale catalogue.` },
  { id: 'low', label: 'Low stock', ico: 'bolt', pred: (p) => p.stock < 20, sort: { key: 'stock', dir: 1 }, summary: (n) => `${n} SKUs are running low — reorder candidates, sorted by stock.` },
  { id: 'margin', label: 'Best margin', ico: 'spark', sort: { key: 'margin', dir: -1 }, summary: (n) => `${n} products ranked by retail margin, highest first.` },
  { id: 'newin', label: 'New this season', ico: 'tag', pred: (p) => C_NEW.has(p.id), summary: (n) => `${n} new arrivals just added to the catalogue.` },
  { id: 'value', label: 'Under $50 wholesale', ico: 'box', pred: (p) => p.wp < 50, sort: { key: 'wp', dir: 1 }, summary: (n) => `${n} entry-price SKUs under $50 wholesale.` },
  { id: 'demand', label: 'High demand', ico: 'chart', sort: { key: 'demand', dir: -1 }, summary: (n) => `${n} products ranked by 12-week demand.` },
];

// recent "queries" (canned, for the chat sidebar)
export const RECENT_QUERIES = [
  'low stock apparel',
  'best margin under $200',
  'new coffee from Kessler',
  'home goods, sorted by demand',
];

// suggested composer prompts → mapped intent
export const SUGGESTED = [
  { text: 'Show me what’s low on stock', view: 'low' },
  { text: 'Best margins right now', view: 'margin' },
  { text: 'What’s new this season?', view: 'newin' },
  { text: 'Entry-price SKUs under $50', view: 'value' },
];
