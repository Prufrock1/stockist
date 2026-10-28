/* ============================================================
   RETAILER — luxury shopping shell
   nav · hero · category rail · catalog grid · footer
   ============================================================ */
import React from 'react';
import { BRANDS, PRODUCTS, CATEGORIES, brandById, productById, money, useStore, actions } from '../data/store.js';
import { Ico, Ph } from '../components/ui.jsx';
import { ProdImg } from '../components/ProductImage.jsx';
import { productImages } from '../data/images.js';
import { ProductDetail, CartDrawer, Confirm, RetailerOrders } from './retailer-flow.jsx';
import './retailer.css';

// The Console is a full-viewport destination, lazily loaded so its weight
// stays off the first paint.
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

function ProductCard({ p, layout, onOpen, onQuickAdd }) {
  const brand = brandById(p.b);
  const low = p.stock < 20;
  if (layout === 'index') {
    const mg = Math.round((1 - p.wp / p.rrp) * 100);
    return (
      <div className="card feed" onClick={onOpen}>
        <div className="fc-media">
          {productImages(p).map((src, i) => (
            <div className="fc-shot" key={i}><ProdImg src={src} p={p} className="pi-img" /></div>
          ))}
        </div>
        <div className="fc-body">
          <div className="fc-brand">{brand.name}</div>
          <h3 className="fc-name">{p.name}</h3>
          <div className="fc-price">{money(p.wp)} <span>/ {p.unit}</span></div>
          <div className="fc-sub">{mg}% margin · MOQ {p.moq}{low && <span className="fc-low"> · Low stock</span>}</div>
          <button className="btn-fill sm" onClick={e => { e.stopPropagation(); onQuickAdd(); }}><Ico name="bag" size={14} /> Add to order</button>
        </div>
      </div>
    );
  }
  return (
    <div className="card" onClick={onOpen}>
      <ProdImg className="card-img" src={productImages(p)[0]} p={p} />
      <div className="card-brand">{brand.name}</div>
      <div className="card-name">{p.name}</div>
      <div className="card-foot">
        <span className="card-price">{money(p.wp)} <span className="unit">/ {p.unit}</span></span>
        {low ? <span className="card-soon">Low stock</span> : <span className="card-moq">MOQ {p.moq}</span>}
      </div>
      <div className="card-hadd">
        <button className="btn-line sm" onClick={e => { e.stopPropagation(); onQuickAdd(); }}><Ico name="bag" size={13} /> Add to order</button>
      </div>
    </div>
  );
}

export function RetailerApp({ layout, onSignOut }) {
  const s = useStore();
  const [view, setView] = React.useState('catalog');
  const [activeId, setActiveId] = React.useState(null);
  const [cat, setCat] = React.useState('All');
  const [sortI, setSortI] = React.useState(0);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [lastOrder, setLastOrder] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const cartCount = Object.keys(s.cart).length;

  const flash = (msg) => { setToast(msg); clearTimeout(window.__rtToast); window.__rtToast = setTimeout(() => setToast(null), 1900); };

  const open = (id) => { setActiveId(id); setView('product'); window.scrollTo(0, 0); };
  const goCatalog = () => { setView('catalog'); window.scrollTo(0, 0); };
  const goConsole = () => { setView('console'); window.scrollTo(0, 0); };
  const quickAdd = (p) => { actions.addToCart(p.id, p.moq); flash(`${p.name} added · ${p.moq} × ${p.unit}`); };

  let list = PRODUCTS.filter(p => cat === 'All' || p.cat === cat);
  const sort = SORTS[sortI].key;
  if (sort === 'price-asc') list = [...list].sort((a, b) => a.wp - b.wp);
  if (sort === 'price-desc') list = [...list].sort((a, b) => b.wp - a.wp);
  if (sort === 'margin') list = [...list].sort((a, b) => (1 - b.wp / b.rrp) - (1 - a.wp / a.rrp));

  const NavLink = ({ id, children }) => (
    <span className={'rt-navlink ' + (view === id ? 'active' : '')} onClick={() => { setView(id); window.scrollTo(0, 0); }}>{children}</span>
  );

  // The Console ships its own shell (sidebar + chat), so it replaces the
  // retailer chrome entirely and offers its own way back.
  if (view === 'console') return (
    <React.Suspense fallback={<Loading label="Opening the console…" />}>
      <ConsoleApp onExit={goCatalog} onSignOut={onSignOut} />
    </React.Suspense>
  );

  return (
    <div className="rt role-stage">
      {/* nav */}
      <div className="rt-nav">
        <div className="rt-navin">
          <div className="rt-navleft">
            <span className={'rt-navlink ' + (view === 'catalog' || view === 'product' ? 'active' : '')} onClick={goCatalog}>Shop</span>
            <span className={'rt-navlink ' + (view === 'console' ? 'active' : '')} onClick={goConsole}>Console</span>
          </div>
          <div className="rt-logo" onClick={goCatalog}>STOCKIST</div>
          <div className="rt-navright">
            <span className="rt-trade">{s.retailer}</span>
            <button type="button" className="nav-logout" onClick={onSignOut}>Log out</button>
            <span className="rt-icon" onClick={() => { setView('orders'); window.scrollTo(0, 0); }}><Ico name="clip" size={18} /></span>
            <span className="rt-icon" onClick={() => setCartOpen(true)}>
              <Ico name="bag" size={19} />
              {cartCount > 0 && <span className="rt-cartcount">{cartCount}</span>}
            </span>
          </div>
        </div>
      </div>

      {view === 'catalog' && (
        <React.Fragment>
          <div className="rt-hero">
            <div className="rt-hero-tag"><span className="ln"></span><span className="mono-label">Wholesale · {BRANDS.length} brands · {PRODUCTS.length} products</span></div>
            <h1>The wholesale floor for <em>independent</em> retail.</h1>
            <div className="rt-hero-lead">
              <p>Buy directly from the makers you want on your shelves — small-batch food, considered apparel, hand-made homeware. One trade account, one order, net-30 terms.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn-fill" onClick={goConsole}><Ico name="store" size={15} /> Open the console</button>
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
                <ProductCard key={p.id} p={p} layout={layout} onOpen={() => open(p.id)} onQuickAdd={() => quickAdd(p)} />
              ))}
            </div>
          </div>
        </React.Fragment>
      )}

      {view === 'product' && (
        <ProductDetail id={activeId} onBack={goCatalog} openBrand={() => { setCat(productById(activeId).cat); goCatalog(); }}
          onAdded={() => { setCartOpen(true); }} />
      )}

      {view === 'orders' && <RetailerOrders goCatalog={goCatalog} />}

      {view === 'confirm' && <Confirm orderId={lastOrder} goCatalog={goCatalog} goOrders={() => { setView('orders'); window.scrollTo(0, 0); }} />}

      {/* footer */}
      <div className="rt-ftr">
        <div className="rt-ftrin">
          <div className="f-logo">STOCKIST</div>
          <div className="f-mono">WHOLESALE MARKETPLACE · BRANDS ↔ RETAILERS · NET-30</div>
        </div>
      </div>

      {cartOpen && (
        <CartDrawer onClose={() => setCartOpen(false)} goCatalog={goCatalog}
          onPlaced={(oid) => { setCartOpen(false); setLastOrder(oid); setView('confirm'); window.scrollTo(0, 0); }} />
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
