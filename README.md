# STOCKIST — two-sided wholesale marketplace

Working prototype of a wholesale marketplace. Brands (sellers) run a dashboard of
orders, products, insights and retailers; retailers (buyers) browse the catalogue,
use the Console, and place wholesale orders. A retailer's order drops straight into
the brand's order queue.

**This codebase is the source of truth.** It was originally ported from a Claude Design
project; that project is retired and is no longer synced. New screens can be sketched
in a design tool, but they are ported in here deliberately, one at a time.

**The 3D direction is archived.** The CSS-3D showroom and booth editor, the trade-floor
directory, the first-person WebGL "Floor" and the "Pavilion" were removed going forward.
They are preserved on the `archive/3d-showroom` branch (tag `archive-3d-showroom`).

## Run it

```bash
npm install
npm run dev        # http://localhost:5199
```

- The floating pill at the bottom switches between the **Retailer** and **Brand** apps
  (a demo device — replace with real auth).
- Append `?dev` to the URL for the design-tweaks panel (accent, catalogue layout,
  dashboard density, demo-data reset).
- App state persists to `localStorage` under `stockist:v4`; reset via the tweaks
  panel or `localStorage.removeItem('stockist:v4')`.

## Structure

```
src/
  main.jsx               entry: Root, role switch, tweaks mount
  styles/tokens.css      design tokens (oklch palette, type, radii, shadows)
  components/ui.jsx      Ico (icon set) · Ph (product-image placeholder)
  data/
    seed.js              seed catalogue (8 brands, 24 products) — REPLACED by the API
    store.js             client store (pub/sub + useStore hook) + actions + selectors
    api.js               ★ the backend seam — swap bodies for fetch() calls
    types.d.ts           data contract (Brand, Product, Order, …)
  retailer/              shopping shell, PDP, cart drawer, confirm, order history
  brand/                 dashboard shell, overview, orders, products, insights, charts
  console/               "Console" — chat shell + dense sortable buying spreadsheet
  dev/tweaks.jsx         dev-only design exploration panel (?dev)
```

### Destinations
- **Retailer:** `Shop · Console`, plus order history and cart in the nav.
- **Brand:** `Overview · Orders · Products · Insights · Retailers`.

The **Console** is a full-viewport shell with its own chrome: saved views (low stock,
best margin, new this season…), sortable columns, row selection with bulk add-to-order,
and a detail drawer. Its chat replies are scripted today; it is the starting point for
the agentic direction. Product thumbnails come from `loremflickr.com` with a tonal
fallback when offline; replace with `Product.imageUrl`.

## Adding the backend

The handoff README's plan, already prepared here:

1. **Contract**: `src/data/types.d.ts` holds the entity shapes. Use them as your DB
   schema / API response types. Suggested endpoints are listed at the top of
   `src/data/api.js`.
2. **Swap the data source**: implement the endpoints, then replace the bodies in
   `src/data/api.js` with `fetch()` calls. Route the store's actions through `api.*`
   and keep only session state (cart, favourites, current view) client-side.
   `seed.js` becomes DB fixtures/tests.
3. **Auth & roles**: the bottom role-switch pill is a demo device. With real sessions,
   a retailer login renders `<RetailerApp/>`, a brand login renders `<BrandApp/>`
   (scoped to their own products/orders) — then delete the switch from
   `main.jsx`. `state.retailer` ('Maison Bleu') comes from the session instead.
4. **Routing**: views are in-memory React state (`view` in RetailerApp, `nav` in
   BrandApp). Introduce React Router when URLs need to be shareable.
5. **Images**: the `Ph` placeholder renders `product.tint`/`marks`. Populate
   `Product.imageUrl` and swap `Ph` for `<img>` in `components/ui.jsx`.

## Notes

- Colours, type (Bricolage Grotesque / Hanken Grotesk / JetBrains Mono via Google Fonts),
  spacing, motion and copy are production-intended.
- Desktop-first; mobile behaviour still needs to be defined for production.
