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
Vite proxies `/api`. Development signs you in as the retailer or the brand
from the bottom pill. Passwords, if you need them, are `maison` and `verre`.

`?dev` opens the design-tweaks panel. “Reset orders & cart” restores the
seed catalogue. The cart stays in `localStorage` under `stockist:v5`.

## Structure

```
src/
  main.jsx               entry: Root, role switch, tweaks mount
  styles/tokens.css      design tokens (oklch palette, type, radii, shadows)
  components/ui.jsx      Ico (icon set) · Ph (product-image placeholder)
  data/
    seed.js              fixture imported by the API on first boot and on reset
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
Orders and stock updates run in one transaction with a row lock. Sign-in is
`POST /api/session` with a password; the session is a signed HttpOnly cookie.
A retailer sees only their orders and is the only one who can place one. The
brand studio sees every order and is the only one who can move status along
`new → packing → shipped`. Saved brands are stored per account. The demo pill
exists only when `ALLOW_DEMO_LOGIN=true`, which production refuses.

```
POST   /api/session             { role, password }
GET    /api/session
DELETE /api/session
GET    /api/health
GET    /api/brands
GET    /api/products?category=
GET    /api/products/:id
GET    /api/orders
POST   /api/orders              { items: [{ id, qty }], note }
PATCH  /api/orders/:id          { status }
GET    /api/favorites
PUT    /api/favorites/:brandId
DELETE /api/favorites/:brandId
POST   /api/reset               development only
```

### AWS

Build the image and run it on App Runner or Fargate, with RDS Postgres. The
process serves the built frontend and the API on `PORT`. Point the load
balancer at `GET /api/health`.

```bash
docker build -t stockist .
docker run --rm -p 8787:8787 \
  -e DATABASE_URL='postgres://…@your-rds-host:5432/stockist?sslmode=require' \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e RETAILER_PASSWORD='…' \
  -e BRAND_PASSWORD='…' \
  -e TRUST_PROXY=true \
  stockist
```

Set `sslmode=verify-full` once the RDS CA bundle is available.
`CORS_ORIGIN` is only needed if the frontend is hosted on a different origin.
On first boot the API migrates and loads the seed catalogue when the database
is empty. Account passwords come from the environment on every boot.
`POST /api/reset` and the role pill are off in production; sign in with the
password form. See `.env.example`.

Still open: shareable URLs, and real product photography via `Product.imageUrl`.

## Notes

- Colours, type (Bricolage Grotesque / Hanken Grotesk / JetBrains Mono via Google Fonts),
  spacing, motion and copy are production-intended.
- Desktop-first; mobile behaviour still needs to be defined for production.
