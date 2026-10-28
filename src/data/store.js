/* ============================================================
   STOCKIST — shared client store
   Catalogue and orders come from the API. This store keeps
   session state (cart) and a mirror of the latest server data.
   ============================================================ */
import React from 'react';
import { api, currentSession } from './api.js';

export const BRANDS = [];
export const PRODUCTS = [];
export const CATEGORIES = ['Food & Drink', 'Apparel', 'Home', 'Beauty', 'Accessories'];
export const STATUS_FLOW = ['new', 'packing', 'shipped'];

export const productById = (id) => PRODUCTS.find(p => p.id === id);
export const brandById   = (id) => BRANDS.find(b => b.id === id);
export const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: (n % 1 ? 2 : 0), maximumFractionDigits: 2 });

const STORE_KEY = 'stockist:v5';

function loadCart() {
  try {
    const current = localStorage.getItem(STORE_KEY);
    if (current) return JSON.parse(current).cart || {};
    const previous = localStorage.getItem('stockist:v4');
    if (previous) return JSON.parse(previous).cart || {};
  } catch { /* ignore corrupt storage */ }
  return {};
}

let state = {
  cart: loadCart(),
  orders: [],
  retailer: 'Maison Bleu',
  favorites: [],
  ready: false,
  error: null,
  sessionRole: null,
};
const listeners = new Set();
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ cart: state.cart })); } catch { /* private mode */ }
}
function emit() { persist(); listeners.forEach(l => l()); }
function setState(updater) {
  state = { ...state, ...(typeof updater === 'function' ? updater(state) : updater) };
  emit();
}

function replaceAll(list, next) {
  list.splice(0, list.length, ...next);
}

export const store = {
  getState: () => state,
  subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
};

let hydrateGen = 0;
let placing = false;

export const actions = {
  addToCart(id, qty = 1) {
    setState(s => ({ cart: { ...s.cart, [id]: (s.cart[id] || 0) + qty } }));
  },
  setQty(id, qty) {
    setState(s => {
      const cart = { ...s.cart };
      if (qty <= 0) delete cart[id]; else cart[id] = qty;
      return { cart };
    });
  },
  removeFromCart(id) {
    setState(s => { const cart = { ...s.cart }; delete cart[id]; return { cart }; });
  },
  clearCart() { setState({ cart: {} }); },

  async hydrate(sessionHint) {
    const gen = ++hydrateGen;
    setState({ error: null });
    try {
      const session = sessionHint || await currentSession();
      if (!session) throw new Error('Sign in required.');
      const [brands, products, orders, favorites] = await Promise.all([
        api.listBrands(),
        api.listProducts(),
        api.listOrders(),
        api.listFavorites(),
      ]);
      if (gen !== hydrateGen) return false;
      replaceAll(BRANDS, brands);
      replaceAll(PRODUCTS, products);
      setState({
        orders,
        favorites,
        retailer: session.account,
        ready: true,
        error: null,
        sessionRole: session.role,
      });
      return true;
    } catch (err) {
      if (gen !== hydrateGen) return false;
      setState({
        ready: false,
        error: err.message || 'Could not reach the catalogue.',
        sessionRole: null,
      });
      return false;
    }
  },

  async placeOrder(note = '') {
    const items = Object.entries(state.cart).map(([id, qty]) => ({ id, qty }));
    if (!items.length || placing) return null;
    placing = true;
    try {
      const order = await api.placeOrder({ items, note });
      try {
        replaceAll(PRODUCTS, await api.listProducts());
      } catch { /* order exists; stock refreshes on the next load */ }
      setState(prev => ({
        orders: [order, ...prev.orders.filter(existing => existing.id !== order.id)],
        cart: {},
      }));
      return order.id;
    } finally {
      placing = false;
    }
  },

  async advanceOrder(id) {
    const prev = state.orders.find(order => order.id === id);
    if (!prev) return;
    const index = STATUS_FLOW.indexOf(prev.status);
    if (index < 0 || index >= STATUS_FLOW.length - 1) return;
    const status = STATUS_FLOW[index + 1];
    setState(s => ({ orders: s.orders.map(order => order.id === id ? { ...order, status } : order) }));
    try {
      const order = await api.setOrderStatus(id, status);
      setState(s => ({ orders: s.orders.map(existing => existing.id === id ? order : existing) }));
    } catch (err) {
      setState(s => ({ orders: s.orders.map(existing => existing.id === id ? prev : existing) }));
      throw err;
    }
  },

  async setOrderStatus(id, status) {
    const order = await api.setOrderStatus(id, status);
    setState(s => ({ orders: s.orders.map(existing => existing.id === id ? order : existing) }));
  },

  async createProduct(input) {
    const product = await api.createProduct(input);
    PRODUCTS.push(product);
    setState(s => ({ ready: s.ready }));
    return product;
  },

  async toggleFav(brandId) {
    const has = (state.favorites || []).includes(brandId);
    const favorites = has ? await api.removeFavorite(brandId) : await api.addFavorite(brandId);
    setState({ favorites });
  },

  async resetAll() {
    await api.reset();
    setState({ cart: {} });
    await actions.hydrate();
  },
};

export function orderLines(order) {
  return order.items.flatMap(it => {
    const p = productById(it.id);
    if (!p) return [];
    return [{ ...it, product: p, lineTotal: p.wp * it.qty }];
  });
}
export function orderSubtotal(order) { return orderLines(order).reduce((a, l) => a + l.lineTotal, 0); }
export function orderUnits(order) { return order.items.reduce((a, it) => a + it.qty, 0); }

export function useStore() {
  return React.useSyncExternalStore(store.subscribe, store.getState);
}
