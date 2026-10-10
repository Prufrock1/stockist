import React from 'react';
import { PRODUCTS, CATEGORIES, brandById, money, useStore, orderLines, orderSubtotal, orderUnits } from '../data/store.js';
import { Ico, Ph } from '../components/ui.jsx';
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
export function ProductsView() {
  const [cat, setCat] = React.useState('All');
  const list = PRODUCTS.filter(p => cat === 'All' || p.cat === cat);
  return (
    <React.Fragment>
      <FilterBar>
        <Pill icon="tag" active={cat === 'All'} onClick={() => setCat('All')} caret={false}>All categories</Pill>
        {CATEGORIES.map(c => <Pill key={c} caret={false} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>)}
        <button className="btn btn-pri btn-sm" style={{ marginLeft: 'auto' }}><Ico name="plus" size={14} /> New product</button>
      </FilterBar>
      <div className="bd-content">
        <div className="panel">
          <div className="table-wrap">
            <table className="dt">
              <thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>Pack</th><th>Wholesale</th><th>RRP</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id}>
                    <td><div className="t-prod"><Ph className="t-thumb" tint={p.tint} marks={p.marks} showMark={false} cap="" /><span className="t-strong">{p.name}</span></div></td>
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
