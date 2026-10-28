/* ============================================================
   API client. The cookie from POST /api/session is the login.
   Shapes match types.d.ts. Vite proxies /api in development;
   production serves the app and the API from one Node process.

     POST   /api/signup           { role, name, email, password }
     POST   /api/session          { email, password }
     GET    /api/session
     DELETE /api/session
     GET    /api/brands
     GET    /api/products?category=
     GET    /api/products/:id
     POST   /api/products         { name, cat, unit, wp, rrp, moq, stock, blurb, image? }
     GET    /api/orders
     POST   /api/orders            { items: [{ id, qty }], note }
     PATCH  /api/orders/:id        { status }
     GET    /api/favorites
     PUT    /api/favorites/:brandId
     DELETE /api/favorites/:brandId
     POST   /api/reset             development only
   ============================================================ */

async function request(path, { method = 'GET', body, allowStatus = [] } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('The catalogue API is not running. Start it with npm run dev.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !allowStatus.includes(res.status)) {
    throw new Error(data.error || `Request failed (${res.status}).`);
  }
  return { status: res.status, data };
}

export async function currentSession() {
  const { status, data } = await request('/api/session', { allowStatus: [401] });
  return status === 401 ? null : data;
}

export async function login({ email, password }) {
  const { data } = await request('/api/session', { method: 'POST', body: { email, password } });
  return data;
}

export async function signup({ role, name, email, password }) {
  const { data } = await request('/api/signup', { method: 'POST', body: { role, name, email, password } });
  return data;
}

export async function logout() {
  await request('/api/session', { method: 'DELETE' });
}

export const api = {
  listBrands() {
    return request('/api/brands').then(res => res.data);
  },
  listProducts({ category } = {}) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return request('/api/products' + query).then(res => res.data);
  },
  getProduct(id) {
    return request('/api/products/' + encodeURIComponent(id)).then(res => res.data);
  },
  createProduct(body) {
    return request('/api/products', { method: 'POST', body }).then(res => res.data);
  },
  listOrders() {
    return request('/api/orders').then(res => res.data);
  },
  placeOrder({ items, note } = {}) {
    return request('/api/orders', { method: 'POST', body: { items, note } }).then(res => res.data);
  },
  setOrderStatus(id, status) {
    return request('/api/orders/' + encodeURIComponent(id), { method: 'PATCH', body: { status } }).then(res => res.data);
  },
  listFavorites() {
    return request('/api/favorites').then(res => res.data);
  },
  addFavorite(brandId) {
    return request('/api/favorites/' + encodeURIComponent(brandId), { method: 'PUT' }).then(res => res.data);
  },
  removeFavorite(brandId) {
    return request('/api/favorites/' + encodeURIComponent(brandId), { method: 'DELETE' }).then(res => res.data);
  },
  reset() {
    return request('/api/reset', { method: 'POST', body: {} }).then(res => res.data);
  },
};
