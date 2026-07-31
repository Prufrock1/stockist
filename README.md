# STOCKIST — two-sided wholesale marketplace

Working prototype ported from the Claude Design handoff (`design_handoff_stockist`).
Brands (sellers) run a dashboard and customise a 3D showroom booth; retailers (buyers)
browse the catalogue, walk a virtual trade-show floor, and place wholesale orders.
A retailer's order drops straight into the brand's order queue.

## Run it

```bash
npm install
npm run dev        # http://localhost:5199
```

- The floating pill at the bottom switches between the **Retailer** and **Brand** apps
  (a demo device — replace with real auth).
- Append `?dev` to the URL for the design-tweaks panel (accent, catalogue layout,
  trade-floor style, dashboard density, demo-data reset).
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
    types.d.ts           data contract (Brand, Product, Order, BoothConfig, …)
  retailer/              shopping shell, PDP, cart drawer, confirm, order history
  brand/                 dashboard shell, overview, orders, products, insights, charts
  showroom/              CSS-3D booth (visit + edit modes) + BoothEditor panel
  tradefloor/            brand directory: concourse (3D walk), isometric map, aisle list
    FpsApp + fps-world   "The Floor" — first-person WebGL hall (three.js)
  pavilion/              "Pavilion" — top-down wanderable show floor (CSS/DOM)
  console/               "Console" — chat shell + dense sortable buying spreadsheet
  dev/tweaks.jsx         dev-only design exploration panel (?dev)
```

### Retailer navbar destinations
`Shop · Floor map · Walk the line · The Floor · Console · Pavilion`

The last two are ported from the standalone variants in the design project. Both are
full-viewport shells with their own chrome, so they replace the retailer nav and offer
their own way back; both share the same store, so an order started in either lands in
the same cart and the same brand queue.

- **The Floor** — first-person convention hall in WebGL. Walk with `WASD`, look by
  dragging (or pointer-lock), `E` to enter a booth, which mounts the existing 3D
  Showroom. **three.js is pinned to `0.128.0`**: the world uses `THREE.sRGBEncoding`
  and `renderer.outputEncoding`, both removed in r152+, so upgrading means porting
  those two call sites in `fps-world.js`.
- **Pavilion** — top-down Javits-style plan you wander with an avatar: `WASD`/arrows,
  drag-joystick, or click-to-walk, with a follow-camera, category zones, aisle
  collision, a tap-to-walk minimap and a directory that walks you to a booth. `E` or
  clicking a booth you're stood next to enters the Showroom. Pure CSS/DOM transforms —
  no three.js. Distinct from **Floor map**, which is a static isometric board.
- **Console** — saved views (low stock, best margin, new this season…), sortable
  columns, row selection with bulk add-to-order, and a detail drawer. Product
  thumbnails come from `loremflickr.com` with a tonal fallback when offline; replace
  with `Product.imageUrl` alongside the `Ph` swap.

The Pavilion and The Floor both drive movement from a `requestAnimationFrame` loop, so
they need a visible, focused tab — rAF is suspended in a backgrounded one.

Both are `React.lazy` route splits — three.js stays out of the first paint and only
loads when you open The Floor.

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
   (scoped to their own products/orders/booth) — then delete the switch from
   `main.jsx`. `state.retailer` ('Maison Bleu') comes from the session instead.
4. **Routing**: views are in-memory React state (`view` in RetailerApp, `nav` in
   BrandApp). Introduce React Router when URLs need to be shareable.
5. **Images**: the `Ph` placeholder renders `product.tint`/`marks`. Populate
   `Product.imageUrl` and swap `Ph` for `<img>` in `components/ui.jsx`.
6. **Booths**: `getBooth(brandId)` merges saved edits over `defaultBooth()` defaults.
   Server-side, either store the patch and merge on read (as now) or store the
   resolved config.

## Source provenance — read before porting more

Two copies of the design source exist in the Claude Design project:

- `design_handoff_stockist/source/*` — a **handoff snapshot**, and the basis of most of this port.
- root-level `retailer.jsx`, `retailer.css`, `index.html`, … — a **later iteration**.

They have diverged. The root version added the image-forward **feed** (one product, three
category-matched shots) and made it the default `catalogLayout`; the handoff snapshot still
describes the old dense `index` list and the old `Shop · Floor map · Walk the line · New in` nav.

`src/retailer/` now tracks the **root** version. Other modules (`store`, `showroom`, `trade-floor`,
`retailer-flow`, `brand*`) are still from the handoff snapshot and have **not** been diffed against
their root counterparts — do that before assuming any of them is current.

## Notes from the handoff

- High-fidelity design: colours, type (Bricolage Grotesque / Hanken Grotesk /
  JetBrains Mono via Google Fonts), spacing, motion and copy are production-intended.
- The 3D showroom and trade floor are pure CSS 3D transforms + React state — no
  three.js. They ported as-is.
- Desktop-first; mobile behaviour still needs to be defined for production.
