# Refactor notes — deferred, not blocking

Shipping notes for things knowingly left as-is. None of these break the running app.

## 1. Design source drift — closed

The Claude Design project had two diverged copies of the source. Rather than reconcile
them, the decision (Oct 2026) is that **this codebase is the source of truth** and the
design project is retired. Some brand-side modules may differ from the last design
iteration; that is accepted, and changes are made here directly.

## 2. Product imagery is a third-party stopgap

`src/data/images.js` builds URLs against `loremflickr.com`. Fine for a prototype, wrong for
production — it is an uncontrolled external dependency on the critical render path.
Replace with real per-SKU photography via `Product.imageUrl` (the module already prefers it,
including an array of up to three shots). Every consumer falls back to the tonal `Ph` block,
so removal degrades gracefully.

## 3. Demo devices still in the build

- **Role switch** (bottom pill) — swaps Retailer/Brand. Real auth replaces this; delete from
  `src/main.jsx` and drive the split from the session.
- **`state.retailer`** is the hardcoded string `'Maison Bleu'`. Should come from the session.
- **Tweaks panel** — already behind `?dev`, but it ships in the main bundle. Move behind an
  env flag if that matters.

## 4. Routing is in-memory

`view` in `RetailerApp` / `nav` in `BrandApp` are React state, so nothing is deep-linkable and
the back button does not work. Introduce React Router before real users arrive. This also means
the deployed site needs no SPA rewrite rule today — it will once a router lands.

## 5. Smaller items

- Mobile is undefined below ~860px for the feed; the design is desktop-first.
- `src/data/api.js` talks to `server/`. The cart is still local. Catalogue, orders, and saved brands are in Postgres. Production sign-in is the password form; the role pill is the development shortcut.

## 6. Archived: 3D direction

The showroom, booth editor, trade floor, first-person Floor (three.js) and Pavilion were
removed from `main`'s line of work. Recover them from branch `archive/3d-showroom` or tag
`archive-3d-showroom`. Users with an old `stockist:bdNav = 'showroom'` in localStorage fall
back to Overview.
