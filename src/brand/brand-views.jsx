import React from 'react';
import { PRODUCTS, CATEGORIES, brandById, money, useStore, actions, orderLines, orderSubtotal, orderUnits } from '../data/store.js';
import { Ico, Ph } from '../components/ui.jsx';
import { ProdImg } from '../components/ProductImage.jsx';
import { productImage } from '../data/images.js';
import { Sparkline, StackedChart, HBars, StatusPill, StockMeter, WEEK, CAT_COLORS } from './charts.jsx';

/* ============================================================
   BRAND — seller dashboard (Hex-style tool)
   sidebar · overview · orders · products · insights · drawer
   ============================================================ */

export const NAV = [
  { sec: 'Workspace', items: [
    { id: 'overview', label: 'Overview', icon: 'chart' },
    { id: 'orders', label: 'Orders', icon: 'pkg' },
    { id: 'products', label: 'Products', icon: 'tag' },
  ]},
  { sec: 'Grow', items: [
    { id: 'insights', label: 'Insights', icon: 'spark' },
    { id: 'retailers', label: 'Retailers', icon: 'users' },
  ]},
];

export const HEADERS = {
  overview: ['Overview', 'Your wholesale activity at a glance'],
  orders: ['Orders', 'Incoming orders from retailers'],
  products: ['Products', 'Your catalogue and stock levels'],
  'new-product': ['New product', 'Add a product to the wholesale floor'],
  insights: ['Insights', 'Sell-through, margin and demand'],
  retailers: ['Retailers', 'Stockists carrying your brands'],
};

export function FilterBar({ children }) {
  return <div className="bd-filters">{children}</div>;
}
export function Pill({ icon, children, active, onClick, caret = true }) {
  return (
    <button className={'pill ' + (active ? 'active' : '')} onClick={onClick}>
      {icon && <Ico name={icon} size={14} />}{children}{caret && <Ico name="chev" size={12} className="caret" />}
    </button>
  );
}

// ---------- Overview ----------
export function Overview({ openOrder }) {
  const s = useStore();
  const orders = s.orders;
  const openCount = orders.filter(o => o.status !== 'shipped').length;
  const newCount = orders.filter(o => o.status === 'new').length;
  const lowStock = PRODUCTS.filter(p => p.stock < 20).length;
  const weekUnits = WEEK.reduce((a, d) => a + d.segs.reduce((b, s) => b + s.v, 0), 0);
  const revenue = 48200 + orders.reduce((a, o) => a + orderSubtotal(o), 0);

  // top products by demand
  const tally = {};
  orders.forEach(o => o.items.forEach(it => { tally[it.id] = (tally[it.id] || 0) + it.qty; }));
  const top = PRODUCTS
    .map(p => ({ p, score: (tally[p.id] || 0) * 14 + (260 - p.stock) }))
    .sort((a, b) => b.score - a.score).slice(0, 6)
    .map(({ p, score }) => ({ name: p.name, value: score, color: CAT_COLORS[p.cat] }));

  const recent = orders.slice(0, 6);

  return (
    <div className="bd-content">
      <div className="kpi-row">
        <div className="kpi">
          <div className="k-label">Open orders <Ico name="pkg" size={15} style={{ opacity: 0.5 }} /></div>
          <div className="k-val">{openCount}</div>
          <div className="k-delta up">▲ {newCount} new today</div>
          <div className="k-spark"><Sparkline data={[3,4,3,5,4,6,openCount]} /></div>
        </div>
        <div className="kpi">
          <div className="k-label">Units this week <Ico name="box" size={15} style={{ opacity: 0.5 }} /></div>
          <div className="k-val">{weekUnits}</div>
          <div className="k-delta up">▲ 18% vs last wk</div>
          <div className="k-spark"><Sparkline data={WEEK.map(d => d.segs.reduce((a,x)=>a+x.v,0))} color="var(--viz-2)" /></div>
        </div>
        <div className="kpi">
          <div className="k-label">Wholesale revenue <Ico name="chart" size={15} style={{ opacity: 0.5 }} /></div>
          <div className="k-val" style={{ fontSize: 27 }}>{money(Math.round(revenue))}</div>
          <div className="k-delta up">▲ 12% vs last wk</div>
          <div className="k-spark"><Sparkline data={[31,34,33,38,40,44,49]} color="var(--viz-4)" /></div>
        </div>
        <div className="kpi">
          <div className="k-label">Low stock <Ico name="bolt" size={15} style={{ opacity: 0.5 }} /></div>
          <div className="k-val">{lowStock}</div>
          <div className="k-delta down">needs restock</div>
          <div className="k-spark"><Sparkline data={[1,2,2,3,3,4,lowStock]} color="var(--danger)" /></div>
        </div>
      </div>

      <div className="bd-grid-2">
        <div className="panel">
          <div className="panel-h"><span className="pt">Order volume</span><span className="ps">units · last 7 days</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
              {Object.entries(CAT_COLORS).slice(0,4).map(([c, col]) => (
                <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: col }}></span>{c.split(' ')[0]}</span>
              ))}
            </span>
          </div>
          <div className="panel-b"><StackedChart days={WEEK} maxY={70} /></div>
        </div>
        <div className="panel">
          <div className="panel-h"><span className="pt">Top products</span><span className="ps">by demand</span></div>
          <div className="panel-b"><HBars rows={top} /></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h"><span className="pt">Recent orders</span><span className="ps">{newCount} awaiting action</span>
          <span style={{ marginLeft: 'auto' }} className="mono-tag"><Ico name="cal" size={12} /> LAST 7 DAYS</span></div>
        <div className="table-wrap">
          <OrderTable orders={recent} openOrder={openOrder} />
        </div>
      </div>
    </div>
  );
}

export function OrderTable({ orders, openOrder }) {
  return (
    <table className="dt">
      <thead><tr>
        <th>Order</th><th>Retailer</th><th>Placed</th><th>Items</th><th>Value</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>
        {orders.map(o => {
          const lines = orderLines(o);
          return (
            <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => openOrder(o.id)}>
              <td className="t-mono">{o.id}</td>
              <td className="t-strong">{o.retailer}</td>
              <td>{timeAgo(o.placedAt)}</td>
              <td>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {lines.slice(0, 3).map(l => <Ph key={l.id} className="t-thumb" style={{ width: 26, height: 26 }} tint={l.product.tint} marks="" showMark={false} cap="" />)}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{orderUnits(o)}×</span>
                </span>
              </td>
              <td className="t-strong">{money(orderSubtotal(o))}</td>
              <td><StatusPill status={o.status} /></td>
              <td style={{ textAlign: 'right' }}><Ico name="chevR" size={15} style={{ color: 'var(--ink-3)' }} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function timeAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' hr ago';
  return Math.round(h / 24) + ' d ago';
}

// ---------- Orders view ----------
export function OrdersView({ openOrder }) {
  const s = useStore();
  const [f, setF] = React.useState('all');
  const counts = {
    all: s.orders.length,
    new: s.orders.filter(o => o.status === 'new').length,
    packing: s.orders.filter(o => o.status === 'packing').length,
    shipped: s.orders.filter(o => o.status === 'shipped').length,
  };
  const orders = f === 'all' ? s.orders : s.orders.filter(o => o.status === f);
  return (
    <React.Fragment>
      <FilterBar>
        {[['all','All'],['new','New'],['packing','Packing'],['shipped','Shipped']].map(([k, lbl]) => (
          <Pill key={k} caret={false} active={f === k} onClick={() => setF(k)}>{lbl} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.6 }}>{counts[k]}</span></Pill>
        ))}
        <Pill icon="users">All retailers</Pill>
        <Pill icon="tag">All categories</Pill>
        <div className="pill pill-search" style={{ marginLeft: 'auto' }}>
          <Ico name="search" size={14} /><input placeholder="Search orders…" />
        </div>
      </FilterBar>
      <div className="bd-content">
        <div className="panel">
          <div className="table-wrap">
            {orders.length ? <OrderTable orders={orders} openOrder={openOrder} />
              : <div className="bd-empty">No {f} orders.</div>}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ---------- Products view ----------
export function ProductsView({ onNew }) {
  const [cat, setCat] = React.useState('All');
  const list = PRODUCTS.filter(p => cat === 'All' || p.cat === cat);
  return (
    <React.Fragment>
      <FilterBar>
        <Pill icon="tag" active={cat === 'All'} onClick={() => setCat('All')} caret={false}>All categories</Pill>
        {CATEGORIES.map(c => <Pill key={c} caret={false} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>)}
        <button type="button" className="btn btn-pri btn-sm" style={{ marginLeft: 'auto' }} onClick={onNew}><Ico name="plus" size={14} /> New product</button>
      </FilterBar>
      <div className="bd-content">
        <div className="panel">
          <div className="table-wrap">
            <table className="dt">
              <thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Pack</th><th>Wholesale</th><th>RRP</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id}>
                    <td><div className="t-prod">{p.imageUrl
                      ? <ProdImg className="t-thumb" src={productImage(p)} p={p} />
                      : <Ph className="t-thumb" tint={p.tint} marks={p.marks} showMark={false} cap="" />}
                      <span className="t-strong">{p.name}</span></div></td>
                    <td>{brandById(p.b).name}</td>
                    <td><span className="mono-tag" style={{ fontSize: 10, padding: '2px 7px' }}>{p.cat}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.unit}</td>
                    <td className="t-strong">{money(p.wp)}</td>
                    <td>{money(p.rrp)}</td>
                    <td><StockMeter stock={p.stock} /></td>
                    <td>{p.stock < 20 ? <span className="status low"><span className="sd"></span>Low</span> : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ok)' }}>● Live</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

export function NewProductPage({ onDone }) {
  const [form, setForm] = React.useState({
    name: 'Yuzu Cordial',
    cat: CATEGORIES[0],
    unit: 'case of 12',
    wp: '30',
    rrp: '54',
    moq: '4',
    stock: '40',
    blurb: 'A shelf-stable cordial for the back bar. Ships in cases, ready for the wholesale floor.',
  });
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [pending, setPending] = React.useState(false);
  const set = (key) => (event) => setForm(current => ({ ...current, [key]: event.target.value }));

  React.useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chooseImage = (event) => {
    const next = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!next) return;
    if (!/^image\/(jpeg|png|webp)$/.test(next.type)) {
      setError('Use a JPEG, PNG, or WebP image.');
      return;
    }
    setError(null);
    setFile(next);
    setPreview(current => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
  };

  const clearImage = () => {
    setFile(null);
    setPreview(current => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const image = file ? await readProductImage(file) : undefined;
      await actions.createProduct({
        name: form.name,
        cat: form.cat,
        unit: form.unit,
        wp: Number(form.wp),
        rrp: Number(form.rrp),
        moq: Number(form.moq),
        stock: Number(form.stock),
        blurb: form.blurb,
        image,
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  };

  return (
    <div className="bd-content">
      <form className="bd-product-form panel" onSubmit={submit}>
        <div className="bd-upload">
          <div className="bd-upload-preview">
            {preview ? <img src={preview} alt="" /> : <span>No photo</span>}
          </div>
          <div>
            <div className="bd-upload-title">Product photo</div>
            <p className="bd-upload-note">JPEG, PNG, or WebP. Shown on the wholesale floor.</p>
            <div className="bd-upload-actions">
              <label className="btn btn-ghost btn-sm">
                {file ? 'Replace photo' : 'Upload photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} />
              </label>
              {file && <button type="button" className="btn btn-ghost btn-sm" onClick={clearImage}>Remove</button>}
            </div>
          </div>
        </div>
        <div className="bd-form-grid">
          <label className="span-2">Category
            <select value={form.cat} onChange={set('cat')}>
              {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="span-2">Product name
            <input value={form.name} onChange={set('name')} required maxLength={120} placeholder="Yuzu cordial" />
          </label>
          <label>Wholesale unit
            <input value={form.unit} onChange={set('unit')} required maxLength={40} placeholder="case of 12" />
          </label>
          <label>Minimum order
            <input value={form.moq} onChange={set('moq')} required inputMode="numeric" min="1" />
          </label>
          <label>Wholesale price
            <input value={form.wp} onChange={set('wp')} required inputMode="numeric" min="0" placeholder="30" />
          </label>
          <label>Retail price
            <input value={form.rrp} onChange={set('rrp')} required inputMode="numeric" min="1" placeholder="54" />
          </label>
          <label>Units in stock
            <input value={form.stock} onChange={set('stock')} required inputMode="numeric" min="0" placeholder="40" />
          </label>
          <label className="span-2">Description
            <textarea value={form.blurb} onChange={set('blurb')} required maxLength={800} rows={4} placeholder="What a buyer needs to know before ordering." />
          </label>
        </div>
        {error && <div className="bd-form-error">{error}</div>}
        <div className="bd-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
          <button type="submit" className="btn btn-pri" disabled={pending}>{pending ? 'Adding…' : 'Add product'}</button>
        </div>
      </form>
    </div>
  );
}

function readProductImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not read that image.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result);
          resolve({ type: 'image/jpeg', data: result.slice(result.indexOf(',') + 1) });
        };
        reader.onerror = () => reject(new Error('Could not read that image.'));
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Use a JPEG, PNG, or WebP image.'));
    };
    img.src = url;
  });
}
