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
npm run dev        # app http://localhost:5199  ·  API http://localhost:8787
npm test           # API tests against Postgres
```

`npm run dev` starts Postgres on port 54329 when `DATABASE_URL` is unset
(data in `server/data/pg`, gitignored), then the API and the Vite app.
Vite proxies `/api`. Sign in, or create a buyer or seller account. The sample
buyer is `maison@stockist.test` / `maison`. The sample seller is
`verre@stockist.test` / `verre`.

`?dev` opens the design-tweaks panel. “Reset orders & cart” clears orders
and products, then recreates each seller’s empty brand. The cart stays in
`localStorage` under `stockist:v5`.

## Structure

```
src/
  main.jsx               entry: Root, sign-in gate, tweaks mount
  styles/tokens.css      design tokens (oklch palette, type, radii, shadows)
  components/ui.jsx      Ico (icon set) · Ph (product-image placeholder)
  data/
    store.js             session cart + a mirror of the latest server data
    api.js               fetch client for /api (cookie session)
server/                  Node API: Postgres, migrations, signed sessions
Dockerfile               production image (static app + API, one process)
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

## Backend

Node (`node:http` + `pg`) and Postgres. `types.d.ts` is the response contract.
Orders and stock updates run in one transaction with a row lock. A buyer
(role `retailer`) and a seller (role `brand`) each sign up, then sign in with
email and password. The session is a signed HttpOnly cookie. A buyer sees only
their orders and is the only one who can place one. A seller sees every order
and is the only one who can move status along `new → packing → shipped`.
Saved brands are stored per account.

```
POST   /api/signup              { role, name, email, password }
POST   /api/session             { email, password }
GET    /api/session
DELETE /api/session
GET    /api/health
GET    /api/brands
GET    /api/products?category=
GET    /api/products/:id
POST   /api/products           { name, cat, unit, wp, rrp, moq, stock, blurb }
GET    /api/orders
POST   /api/orders              { items: [{ id, qty }], note }
PATCH  /api/orders/:id          { status }
GET    /api/favorites
PUT    /api/favorites/:brandId
DELETE /api/favorites/:brandId
POST   /api/reset               development only
```

### Deploy

`main` is production. Do the work on a branch and open a pull request into
`main`. Merging runs the tests, then GitHub Actions builds the image and
updates the ECS service that serves https://stockist.pro. See
`.github/workflows/deploy.yml`. GitHub Pages is no longer the production host.

The service reads `DATABASE_URL`, `SESSION_SECRET`, `RETAILER_PASSWORD`, and
`BRAND_PASSWORD` from SSM. On first boot the API migrates and loads the seed
catalogue when the database is empty. Account passwords come from the
environment on every boot. `POST /api/reset` is off in production. Sign in
with email and password, or create a buyer or seller account. See
`.env.example`.

`CORS_ORIGIN` is only needed if the frontend is hosted on a different origin.
Set `sslmode=verify-full` once the RDS CA bundle is available.

Still open: shareable URLs, and real product photography via `Product.imageUrl`.

## Notes

- Colours, type (Bricolage Grotesque / Hanken Grotesk / JetBrains Mono via Google Fonts),
  spacing, motion and copy are production-intended.
- Desktop-first; mobile behaviour still needs to be defined for production.
