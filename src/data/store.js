/* ============================================================
   STOCKIST — shared client store
   One source of truth. Retailer orders flow into Brand queue.

   Backend note: this store currently owns ALL state (catalogue,
   orders) and persists to localStorage. When the backend
   lands, route the actions below through src/data/api.js and keep
   only session state (cart, favourites, current view) here.
   ============================================================ */
import React from 'react';
import { BRANDS, PRODUCTS, CATEGORIES, seedOrders } from './seed.js';

export { BRANDS, PRODUCTS, CATEGORIES };

// ---- lookups ----
export const productById = (id) => PRODUCTS.find(p => p.id === id);
export const brandById   = (id) => BRANDS.find(b => b.id === id);
export const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: (n % 1 ? 2 : 0), maximumFractionDigits: 2 });

// ============ store ============
const STORE_KEY = 'stockist:v4';
export const STATUS_FLOW = ['new', 'packing', 'shipped'];

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { cart: {}, orders: seedOrders(), retailer: 'Maison Bleu', favorites: [] };
}

let state = loadState();
const listeners = new Set();
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }
function emit() { persist(); listeners.forEach(l => l()); }
function setState(updater) { state = { ...state, ...(typeof updater === 'function' ? updater(state) : updater) }; emit(); }

export const store = {
  getState: () => state,
  subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
};

// ---- actions ----
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
  placeOrder() {
    const s = state;
    const items = Object.entries(s.cart).map(([id, qty]) => ({ id, qty }));
    if (!items.length) return null;
    const id = 'ORD-' + (4472 + s.orders.length);
    const order = { id, retailer: s.retailer, items, status: 'new', placedAt: Date.now(), note: '' };
    setState(prev => ({ orders: [order, ...prev.orders], cart: {} }));
    return id;
  },
  advanceOrder(id) {
    setState(s => ({ orders: s.orders.map(o => {
      if (o.id !== id) return o;
      const i = STATUS_FLOW.indexOf(o.status);
      return { ...o, status: STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)] };
    }) }));
  },
  setOrderStatus(id, status) {
    setState(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, status } : o) }));
  },
  toggleFav(brandId) {
    setState(s => {
      const has = (s.favorites || []).includes(brandId);
      return { favorites: has ? s.favorites.filter(x => x !== brandId) : [...(s.favorites || []), brandId] };
    });
  },
  resetAll() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    state = { cart: {}, orders: seedOrders(), retailer: 'Maison Bleu', favorites: [] };
    emit();
  },
};

// ---- order math helpers ----
export function orderLines(order) {
  return order.items.map(it => {
    const p = productById(it.id);
    return { ...it, product: p, lineTotal: p.wp * it.qty };
  });
}
export function orderSubtotal(order) { return orderLines(order).reduce((a, l) => a + l.lineTotal, 0); }
export function orderUnits(order) { return order.items.reduce((a, it) => a + it.qty, 0); }

// ---- React hook ----
export function useStore() {
  return React.useSyncExternalStore(store.subscribe, store.getState);
}
