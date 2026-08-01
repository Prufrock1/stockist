import React from 'react';
import { CATEGORIES, brandById, money, useStore, actions, STATUS_FLOW, orderLines, orderSubtotal, orderUnits } from '../data/store.js';
import { Ico, Ph } from '../components/ui.jsx';
import { HBars, StackedChart, WEEK, CAT_COLORS } from './charts.jsx';
import { Overview, OrdersView, ProductsView, NAV, HEADERS, timeAgo } from './brand-views.jsx';
import { Showroom } from '../showroom/Showroom.jsx';
import './brand.css';

/* ============================================================
   BRAND — insights, retailers, order drawer, app shell
   ============================================================ */

// The signed-in brand. A brand only ever edits its own booth, so this is the
// single point that decides whose booth the Showroom editor loads.
// PRODUCTION: comes from the authenticated session, not a constant.
const SESSION_BRAND_ID = 'b1';   // Maison Verre

const RETAILERS = [
  { name: 'Maison Bleu',     loc: 'Paris, FR',     orders: 24, spend: 38400, since: '2023' },
  { name: 'The Larder',      loc: 'London, UK',    orders: 18, spend: 29100, since: '2022' },
  { name: 'Form & Field',    loc: 'Brooklyn, US',  orders: 31, spend: 51200, since: '2021' },
  { name: 'Nord Provisions', loc: 'Oslo, NO',      orders: 12, spend: 17600, since: '2024' },
  { name: 'Saison',          loc: 'Melbourne, AU', orders: 9,  spend: 14200, since: '2024' },
];

// ---------- Insights ----------
function InsightsView() {
  const s = useStore();
  const byCat = {};
  CATEGORIES.forEach(c => byCat[c] = 0);
  s.orders.forEach(o => orderLines(o).forEach(l => { byCat[l.product.cat] += l.lineTotal; }));
  const base = { 'Food & Drink': 14200, 'Apparel': 22800, 'Home': 9600, 'Beauty': 7400, 'Accessories': 6100 };
  const catRows = CATEGORIES.map(c => ({ name: c, value: base[c] + byCat[c], color: CAT_COLORS[c], fmt: money }));
  const retRows = [...RETAILERS].sort((a, b) => b.spend - a.spend).map(r => ({ name: r.name, value: r.spend, fmt: money, color: 'var(--viz-2)' }));

  return (
    <div className="bd-content">
      <div className="kpi-row">
        <div className="kpi"><div className="k-label">Avg order value</div><div className="k-val" style={{ fontSize: 27 }}>{money(1840)}</div><div className="k-delta up">▲ 6%</div></div>
        <div className="kpi"><div className="k-label">Reorder rate</div><div className="k-val">68%</div><div className="k-delta up">▲ 4 pts</div></div>
        <div className="kpi"><div className="k-label">Avg margin offered</div><div className="k-val">46%</div><div className="k-delta">stable</div></div>
        <div className="kpi"><div className="k-label">Sell-through</div><div className="k-val">81%</div><div className="k-delta up">▲ 9 pts</div></div>
      </div>
      <div className="bd-grid-2">
        <div className="panel">
          <div className="panel-h"><span className="pt">Revenue by category</span><span className="ps">trailing 30 days</span></div>
          <div className="panel-b"><HBars rows={catRows} /></div>
        </div>
        <div className="panel">
          <div className="panel-h"><span className="pt">Top retailers</span><span className="ps">by spend</span></div>
          <div className="panel-b"><HBars rows={retRows} /></div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-h"><span className="pt">Order volume</span><span className="ps">units · last 7 days</span></div>
        <div className="panel-b"><StackedChart days={WEEK} maxY={70} /></div>
      </div>
    </div>
  );
}

// ---------- Retailers ----------
function RetailersView() {
  return (
    <div className="bd-content">
      <div className="panel">
        <div className="panel-h"><span className="pt">Stockists</span><span className="ps">{RETAILERS.length} active accounts</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}><Ico name="plus" size={14} /> Invite retailer</button></div>
        <div className="table-wrap">
          <table className="dt">
            <thead><tr><th>Retailer</th><th>Location</th><th>Orders</th><th>Lifetime spend</th><th>Since</th><th>Status</th></tr></thead>
            <tbody>
              {RETAILERS.map(r => (
                <tr key={r.name}>
                  <td><div className="t-prod"><span className="bd-avatar" style={{ width: 30, height: 30 }}>{r.name[0]}</span><span className="t-strong">{r.name}</span></div></td>
                  <td>{r.loc}</td>
                  <td className="t-mono">{r.orders}</td>
                  <td className="t-strong">{money(r.spend)}</td>
                  <td style={{ color: 'var(--ink-3)' }}>{r.since}</td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ok)' }}>● Approved</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- Order drawer ----------
const FLOW_LABELS = { new: 'Received', packing: 'Packing', shipped: 'Shipped' };
function OrderDrawer({ id, onClose }) {
  const s = useStore();
  React.useEffect(() => { document.body.classList.add('modal-open'); return () => document.body.classList.remove('modal-open'); }, []);
  const o = s.orders.find(x => x.id === id);
  if (!o) return null;
  const lines = orderLines(o);
  const idx = STATUS_FLOW.indexOf(o.status);
  const subtotal = orderSubtotal(o);
  const next = STATUS_FLOW[idx + 1];

  return (
    <React.Fragment>
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-h">
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>{o.id}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>{o.retailer}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Placed {timeAgo(o.placedAt)}</div>
          </div>
          <button className="x-btn" onClick={onClose}><Ico name="x" size={16} /></button>
        </div>
        <div className="drawer-b">
          <div className="mono-label" style={{ marginBottom: 12 }}>Fulfilment status</div>
          <div className="flowsteps">
            {STATUS_FLOW.map((st, i) => (
              <div key={st} className={'flowstep ' + (i < idx ? 'done' : i === idx ? 'current' : '')}>
                <div className="fdot">{i < idx ? <Ico name="check" size={13} /> : i + 1}</div>
                <div className="fl">{FLOW_LABELS[st]}</div>
              </div>
            ))}
          </div>

          <div className="mono-label" style={{ margin: '24px 0 12px' }}>Line items · {orderUnits(o)}</div>
          {lines.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
              <Ph tint={l.product.tint} marks={l.product.marks} showMark={false} cap="" style={{ width: 42, height: 50, borderRadius: 'var(--r-sm)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{brandById(l.product.b).name}</div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{l.product.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{l.product.unit}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{l.qty} × {money(l.product.wp)}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{money(l.lineTotal)}</div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 18, padding: '16px', background: 'var(--paper-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, color: 'var(--ink-2)', marginBottom: 9 }}><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, color: 'var(--ink-2)', marginBottom: 11 }}><span>Freight</span><span style={{ color: 'var(--ink-3)' }}>Billed at dispatch</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, paddingTop: 10, borderTop: '1px solid var(--line)' }}><span>Order total</span><span>{money(subtotal)}</span></div>
          </div>
        </div>
        <div className="drawer-f">
          {next ? (
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => actions.advanceOrder(o.id)}>
              <Ico name={next === 'shipped' ? 'truck' : 'box'} size={15} />
              {next === 'packing' ? 'Start packing' : 'Mark as shipped'}
            </button>
          ) : (
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} disabled>
              <Ico name="check" size={15} /> Order shipped
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </React.Fragment>
  );
}

// ---------- Brand app shell ----------
export function BrandApp() {
  const s = useStore();
  const [nav, setNav] = React.useState(() => localStorage.getItem('stockist:bdNav') || 'overview');
  const [drawer, setDrawer] = React.useState(null);
  React.useEffect(() => { localStorage.setItem('stockist:bdNav', nav); }, [nav]);
  const newCount = s.orders.filter(o => o.status === 'new').length;
  const [title, sub] = HEADERS[nav];

  const openOrder = (id) => setDrawer(id);

  return (
    <div className="bd role-stage">
      <aside className="bd-side">
        <div className="bd-brandrow">
          <div>
            <div className="bd-logo"><span className="sq"></span>STOCKIST</div>
            <div className="bd-studio">seller studio</div>
          </div>
        </div>
        <nav className="bd-nav">
          {NAV.map(group => (
            <div key={group.sec}>
              <div className="bd-navsec">{group.sec}</div>
              {group.items.map(it => (
                <div key={it.id} className={'bd-navitem ' + (nav === it.id ? 'active' : '')} onClick={() => setNav(it.id)}>
                  <Ico name={it.icon} size={16} />{it.label}
                  {it.id === 'orders' && newCount > 0 && <span className="badge">{newCount}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="bd-sideftr">
          <div className="bd-avatar">V</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Verre Group</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>8 brands</div>
          </div>
          <Ico name="gear" size={16} style={{ color: 'var(--ink-3)' }} />
        </div>
      </aside>

      <main className="bd-main">
        <div className="bd-topbar">
          <div>
            <div className="bd-h1">{title}</div>
            <div className="bd-sub">{sub}</div>
          </div>
          <div className="spacer"></div>
          <div className="pill" style={{ cursor: 'default' }}><Ico name="search" size={14} /><span style={{ color: 'var(--ink-3)' }}>Search</span></div>
          <button className="btn btn-ghost btn-sm"><Ico name="external" size={14} /> Export</button>
          <button className="btn btn-pri btn-sm"><Ico name="plus" size={14} /> New product</button>
        </div>

        {nav === 'overview' && <Overview openOrder={openOrder} />}
        {nav === 'orders' && <OrdersView openOrder={openOrder} />}
        {nav === 'products' && <ProductsView />}
        {nav === 'insights' && <InsightsView />}
        {nav === 'retailers' && <RetailersView />}
        {nav === 'showroom' && <Showroom mode="edit" initialBrandId={SESSION_BRAND_ID} />}
      </main>

      {drawer && <OrderDrawer id={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}
