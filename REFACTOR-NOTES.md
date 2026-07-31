# Refactor notes — deferred, not blocking

Shipping notes for things knowingly left as-is. None of these break the running app.

## 1. Two diverged copies of the design source  ⚠️ highest value

The Claude Design project contains **two** copies of the source, and they have drifted:

| Copy | Status |
|---|---|
| `design_handoff_stockist/source/*` | older handoff snapshot — most of this port came from here |
| root-level `retailer.jsx`, `retailer.css`, `index.html`, … | later iteration |

Known differences found so far (root is newer):
- root added the image-forward **feed** card — one product, three category-matched shots —
  and made it the default `catalogLayout: "index"`. The handoff still had a dense text list.
- the handoff README still documents the old nav (`Shop · Floor map · Walk the line · New in`).

**Only `src/retailer/` currently tracks the root version.** These have *not* been diffed
against their root counterparts and may be stale:

- `src/data/store.js`            ← `store.jsx`
- `src/retailer/retailer-flow.jsx` ← `retailer-flow.jsx`  (most likely to have changed —
  the PDP gallery probably wants the same three shots)
- `src/showroom/*`               ← `showroom.jsx`, `showroom-edit.jsx`, `showroom.css`
- `src/tradefloor/TradeFloor.jsx`← `trade-floor.jsx`, `trade.css`
- `src/brand/*`                  ← `brand.jsx`, `brand-extra.jsx`, `brand-charts.jsx`, `brand.css`
- `src/styles/tokens.css`        ← `styles.css`

To resolve: fetch each root file and diff against the ported module. Prefer root.

> Gotcha for whoever does this: `DesignSync get_file` caps at 256 KiB and sets
> `truncated: true` — check that flag. `STOCKIST Marketplace.html` is ~256 KB and
> silently returns only its first chunk.

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

## 5. Unverified in this environment

- **Walk loops** in The Floor (FPS) and Pavilion are `requestAnimationFrame`-driven and were
  never exercised — the automation pane reports `visibility: hidden` and rAF ticks 0/sec there.
  Steering, collision, proximity and `E`-to-enter need a manual pass in a real tab.
- **Product photos** never resolved in the sandbox (outbound image requests blocked), so only
  the fallback path was seen. Confirm they populate in a normal browser.

## 6. Smaller items

- `three` is pinned to `0.128.0` because `fps-world.js` uses `THREE.sRGBEncoding` and
  `renderer.outputEncoding`, both removed in r152+. Upgrading means porting those two call sites
  to `colorSpace` / `outputColorSpace`.
- Mobile is undefined below ~860px for the feed and the 3D views; the design is desktop-first.
- `src/data/api.js` is the backend seam — all functions still resolve from the local store.
