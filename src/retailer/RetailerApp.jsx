/* ============================================================
   RETAILER — luxury shopping shell
   nav · hero · category rail · catalog grid · footer
   ============================================================ */
import React from 'react';
import { Link, Outlet, Route, Routes, useLocation, useOutletContext, useParams } from 'react-router';
import { BRANDS, PRODUCTS, CATEGORIES, brandById, productById, money, useStore, actions } from '../data/store.js';
import { Ico } from '../components/ui.jsx';
import { ProdImg } from '../components/ProductImage.jsx';
import { productImages } from '../data/images.js';
import { ProductDetail, CartDrawer, Confirm, RetailerOrders } from './retailer-flow.jsx';
import { KeepSearch, useGo } from '../route.jsx';
import './retailer.css';

const ConsoleApp = React.lazy(() => import('../console/ConsoleApp.jsx').then(m => ({ default: m.ConsoleApp })));

const Loading = ({ label }) => (
  <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
    background: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12,
    letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</div>
);

const SORTS = [
  { key: 'featured', label: 'Featured' },
  { key: 'price-asc', label: 'Price · low to high' },
  { key: 'price-desc', label: 'Price · high to low' },
  { key: 'margin', label: 'Best margin' },
];

function ProductCard({ p, layout, onQuickAdd, search }) {
  const brand = brandById(p.b);
  const low = p.stock < 20;
  if (layout === 'index') {
    const mg = Math.round((1 - p.wp / p.rrp) * 100);
    const shots = [...new Set(productImages(p))];
    return (
      <Link className="card feed" to={{ pathname: `/products/${p.id}`, search }}>
        <div className={'fc-media' + (shots.length === 1 ? ' solo' : '')}>
          {shots.map((src) => (
            <div className="fc-shot" key={src}><ProdImg src={src} p={p} className="pi-img" /></div>
          ))}
        </div>
        <div className="fc-body">
          <div className="fc-brand">{brand.name}</div>
          <h3 className="fc-name">{p.name}</h3>
          <div className="fc-price">{money(p.wp)} <span>/ {p.unit}</span></div>
          <div className="fc-sub">{mg}% margin · MOQ {p.moq}{low && <span className="fc-low"> · Low stock</span>}</div>
          <button type="button" className="btn-fill sm" onClick={e => { e.preventDefault(); e.stopPropagation(); onQuickAdd(); }}><Ico name="bag" size={14} /> Add to order</button>
        </div>
      </Link>
    );
  }
  return (
    <Link className="card" to={{ pathname: `/products/${p.id}`, search }}>
      <ProdImg className="card-img" src={productImages(p)[0]} p={p} />
      <div className="card-brand">{brand.name}</div>
      <div className="card-name">{p.name}</div>
      <div className="card-foot">
        <span className="card-price">{money(p.wp)} <span className="unit">/ {p.unit}</span></span>
        {low ? <span className="card-soon">Low stock</span> : <span className="card-moq">MOQ {p.moq}</span>}
      </div>
      <div className="card-hadd">
        <button type="button" className="btn-line sm" onClick={e => { e.preventDefault(); e.stopPropagation(); onQuickAdd(); }}><Ico name="bag" size={13} /> Add to order</button>
      </div>
    </Link>
  );
}

function Catalog() {
  const { layout, cat, setCat, sortI, setSortI, flash } = useOutletContext();
  const { search } = useLocation();
  const quickAdd = (p) => { actions.addToCart(p.id, p.moq); flash(`${p.name} added · ${p.moq} × ${p.unit}`); };

  let list = PRODUCTS.filter(p => cat === 'All' || p.cat === cat);
  const sort = SORTS[sortI].key;
  if (sort === 'price-asc') list = [...list].sort((a, b) => a.wp - b.wp);
  if (sort === 'price-desc') list = [...list].sort((a, b) => b.wp - a.wp);
  if (sort === 'margin') list = [...list].sort((a, b) => (1 - b.wp / b.rrp) - (1 - a.wp / a.rrp));

  return (
    <React.Fragment>
      <div className="rt-hero">
        <div className="rt-hero-tag"><span className="ln"></span><span className="mono-label">Wholesale · {BRANDS.length} {BRANDS.length === 1 ? 'brand' : 'brands'} · {PRODUCTS.length} {PRODUCTS.length === 1 ? 'product' : 'products'}</span></div>
        <h1>The wholesale floor for <em>independent</em> retail.</h1>
        <div className="rt-hero-lead">
          <p>Buy directly from the makers you want on your shelves — small-batch food, considered apparel, hand-made homeware. One trade account, one order, net-30 terms.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn-fill" to={{ pathname: '/console', search }}><Ico name="store" size={15} /> Open the console</Link>
            <button className="btn-line" onClick={() => document.querySelector('.rt-catalog').scrollIntoView({ behavior: 'smooth' })}>Browse the catalogue <Ico name="arrowR" size={14} /></button>
          </div>
        </div>
      </div>

      <div className="rt-cats">
        {['All', ...CATEGORIES].map(c => (
          <span key={c} className={'rt-cat ' + (cat === c ? 'active' : '')} onClick={() => setCat(c)}>{c}</span>
        ))}
        <span className="spacer"></span>
        <span className="rt-sort" onClick={() => setSortI(i => (i + 1) % SORTS.length)}>
          <Ico name="filter" size={13} /> {SORTS[sortI].label}
        </span>
      </div>

      <div className="rt-catalog">
        <div className="rt-catmeta">
          <span className="mono-label" style={{ fontSize: 12 }}>{cat === 'All' ? 'All products' : cat}</span>
          <span className="cm-count">{list.length} results · layout: {layout === 'index' ? 'feed' : layout}</span>
        </div>
        <div className={'rt-grid ' + layout}>
          {list.map(p => (
            <ProductCard key={p.id} p={p} layout={layout} search={search} onQuickAdd={() => quickAdd(p)} />
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}

function ProductRoute() {
  const { id } = useParams();
  const go = useGo();
  const { setCat, openCart } = useOutletContext();
  const product = productById(id);
  return (
    <ProductDetail key={id} id={id} onBack={() => go('/')}
      openBrand={() => { if (product) setCat(product.cat); go('/'); }}
      onAdded={openCart} />
  );
}

function OrdersRoute() {
  const go = useGo();
  return <RetailerOrders goCatalog={() => go('/')} />;
}

function ConfirmRoute() {
  const { id } = useParams();
  const go = useGo();
  return <Confirm orderId={id} goCatalog={() => go('/')} goOrders={() => go('/orders')} />;
}

function ConsoleRoute({ onSignOut }) {
  const go = useGo();
  return (
    <React.Suspense fallback={<Loading label="Opening the console…" />}>
      <ConsoleApp onExit={() => go('/')} onSignOut={onSignOut} />
    </React.Suspense>
  );
}

function ShopShell({ layout, onSignOut, cat, setCat, sortI, setSortI, cartOpen, setCartOpen, toast, flash }) {
  const s = useStore();
  const { pathname, search } = useLocation();
  const go = useGo();

  const cartCount = (s.ready ? Object.keys(s.cart).filter(id => productById(id)) : Object.keys(s.cart)).length;
  const shopOn = pathname === '/' || pathname.startsWith('/products/');

  return (
    <div className="rt role-stage">
      <div className="rt-nav">
        <div className="rt-navin">
          <div className="rt-navleft">
            <Link className={'rt-navlink ' + (shopOn ? 'active' : '')} to={{ pathname: '/', search }}>Shop</Link>
            <Link className="rt-navlink" to={{ pathname: '/console', search }}>Console</Link>
          </div>
          <Link className="rt-logo" to={{ pathname: '/', search }}>STOCKIST</Link>
          <div className="rt-navright">
            <span className="rt-trade">{s.retailer}</span>
            <button type="button" className="nav-logout" onClick={onSignOut}>Log out</button>
            <Link className="rt-icon" to={{ pathname: '/orders', search }} aria-label="Orders"><Ico name="clip" size={18} /></Link>
            <span className="rt-icon" onClick={() => setCartOpen(true)}>
              <Ico name="bag" size={19} />
              {cartCount > 0 && <span className="rt-cartcount">{cartCount}</span>}
            </span>
          </div>
        </div>
      </div>

      <Outlet context={{ layout, cat, setCat, sortI, setSortI, flash, openCart: () => setCartOpen(true) }} />

      <div className="rt-ftr">
        <div className="rt-ftrin">
          <div className="f-logo">STOCKIST</div>
          <div className="f-mono">WHOLESALE MARKETPLACE · BRANDS ↔ RETAILERS · NET-30</div>
        </div>
      </div>

      {cartOpen && (
        <CartDrawer onClose={() => setCartOpen(false)} goCatalog={() => go('/')}
          onPlaced={(oid) => { setCartOpen(false); go(`/orders/${oid}`); }} />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 750,
          background: 'var(--ink)', color: 'var(--paper)', padding: '12px 20px', borderRadius: 999,
          fontSize: 13, fontWeight: 500, boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 10,
          animation: 'roleIn 0.3s ease' }}>
          <Ico name="check" size={15} /> {toast}
        </div>
      )}
    </div>
  );
}

export function RetailerApp({ layout, onSignOut }) {
  const [cat, setCat] = React.useState('All');
  const [sortI, setSortI] = React.useState(0);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const flash = (msg) => { setToast(msg); clearTimeout(window.__rtToast); window.__rtToast = setTimeout(() => setToast(null), 1900); };
  const shell = { layout, onSignOut, cat, setCat, sortI, setSortI, cartOpen, setCartOpen, toast, flash };

  return (
    <Routes>
      <Route path="/console" element={<ConsoleRoute onSignOut={onSignOut} />} />
      <Route path="/" element={<ShopShell {...shell} />}>
        <Route index element={<Catalog />} />
        <Route path="products/:id" element={<ProductRoute />} />
        <Route path="orders" element={<OrdersRoute />} />
        <Route path="orders/:id" element={<ConfirmRoute />} />
      </Route>
      <Route path="*" element={<KeepSearch to="/" />} />
    </Routes>
  );
}
