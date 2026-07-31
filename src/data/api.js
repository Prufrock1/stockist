/* ============================================================
   API layer — the seam where the backend plugs in.

   Today every function resolves from the in-memory store
   (seed data + localStorage). When the backend exists, replace
   the bodies with fetch() calls — the call sites don't change.
   The shapes returned here are the contract; see types.d.ts.

   Suggested endpoints:
     GET    /api/brands
     GET    /api/products?category=
     GET    /api/products/:id
     GET    /api/orders            (scoped to the session account)
     POST   /api/orders            { items: [{ id, qty }], note }
     PATCH  /api/orders/:id        { status }
     GET    /api/booths/:brandId
     PUT    /api/booths/:brandId   partial BoothConfig patch
     DELETE /api/booths/:brandId   (reset to defaults)
     PUT    /api/favorites/:brandId · DELETE /api/favorites/:brandId
   ============================================================ */
import {
  BRANDS, PRODUCTS, store, actions, getBooth,
} from './store.js';

const delay = (ms = 0) => new Promise(r => setTimeout(r, ms));

export const api = {
  // ---- catalogue (server data in production) ----
  async listBrands() {
    await delay();
    return BRANDS;
  },
  async listProducts({ category } = {}) {
    await delay();
    return category ? PRODUCTS.filter(p => p.cat === category) : PRODUCTS;
  },
  async getProduct(id) {
    await delay();
    return PRODUCTS.find(p => p.id === id) || null;
  },

  // ---- orders ----
  async listOrders() {
    await delay();
    return store.getState().orders;
  },
  async placeOrder() {
    await delay();
    return actions.placeOrder();
  },
  async setOrderStatus(id, status) {
    await delay();
    actions.setOrderStatus(id, status);
  },

  // ---- booths ----
  async getBooth(brandId) {
    await delay();
    return getBooth(brandId);
  },
  async updateBooth(brandId, patch) {
    await delay();
    actions.updateBooth(brandId, patch);
  },
  async resetBooth(brandId) {
    await delay();
    actions.resetBooth(brandId);
  },
};
