/* ============================================================
   STOCKIST — product imagery
   Three different category-matched shots per product (stable seeds),
   as used by the image-forward feed on the homepage.

   PRODUCTION: replace with real per-SKU angle photography
   (Product.imageUrl[]). Every consumer falls back to the tonal `Ph`
   block when a fetch fails, so removing this degrades gracefully.
   ============================================================ */

const CAT_KW = {
  'Food & Drink': 'coffee',
  'Apparel': 'sweater',
  'Home': 'ceramic',
  'Beauty': 'cosmetics',
  'Accessories': 'leather',
};

export function productImages(p) {
  if (Array.isArray(p.imageUrl) && p.imageUrl.length) return p.imageUrl.slice(0, 3);
  if (typeof p.imageUrl === 'string' && p.imageUrl) return [p.imageUrl, p.imageUrl, p.imageUrl];
  const kw = CAT_KW[p.cat] || 'product';
  const base = ((parseInt(String(p.id).replace(/\D/g, ''), 10) || 1) * 3) + 5;
  // For offline/standalone export, prefer inlined blobs from window.__resources.
  const res = (typeof window !== 'undefined' && window.__resources) || {};
  return [0, 1, 2].map(k => res['pf_' + p.id + '_' + k] || `https://loremflickr.com/600/800/${kw}?lock=${base + k}`);
}

export function productImage(p) { return productImages(p)[0]; }
