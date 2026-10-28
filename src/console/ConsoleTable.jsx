/* ============================================================
   STOCKIST — Console table (ConsoleTable.jsx)
   Max-density, sortable products grid + detail drawer.
   ============================================================ */
import React from 'react';
import { brandById, productById, money, actions } from '../data/store.js';
import { Ico, Ph } from '../components/ui.jsx';
import { C_MARGIN, C_DEMAND, C_NEW, C_IMG, CAT_COLOR } from './console-data.js';

const { useState: useStateT } = React;

/* tiny demand sparkline */
export function Spark({ data, w = 64, h = 18, color = 'var(--accent)' }) {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 3) - 1.5}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} className="c-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={up ? 'var(--ok)' : 'var(--danger)'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* product thumbnail — real photo with tonal fallback */
function ProdThumb({ p }) {
  const [err, setErr] = useStateT(false);
  if (err) return <span className="c-thumb" style={{ '--ph-tint': p.tint }}><span className="c-thumb-mk">{p.marks}</span></span>;
  return <span className="c-thumb" style={{ '--ph-tint': p.tint }}><img src={C_IMG(p)} alt="" loading="lazy" decoding="async" onError={() => setErr(true)} /></span>;
}

/* column model */
export const C_COLS = [
  { key: 'id', label: 'SKU', cls: 'c-mono c-dim', w: 52, get: p => p.id.toUpperCase() },
  { key: 'name', label: 'Product', cls: 'c-name', w: 240 },
  { key: 'b', label: 'Brand', cls: '', w: 132, get: p => brandById(p.b).name },
  { key: 'cat', label: 'Category', cls: '', w: 124 },
  { key: 'unit', label: 'Unit', cls: 'c-mono c-dim', w: 92 },
  { key: 'moq', label: 'MOQ', cls: 'c-num', w: 56, num: true },
  { key: 'stock', label: 'Stock', cls: 'c-num', w: 84, num: true },
  { key: 'wp', label: 'WS', cls: 'c-num', w: 72, num: true },
  { key: 'rrp', label: 'RRP', cls: 'c-num c-dim', w: 68, num: true },
  { key: 'margin', label: 'Margin', cls: 'c-num', w: 92, num: true },
  { key: 'demand', label: 'Demand · 12w', cls: '', w: 104 },
];

export function sortRows(rows, sort) {
  if (!sort) return rows;
  const { key, dir } = sort;
  const val = (p) => {
    if (key === 'margin') return C_MARGIN(p);
    if (key === 'demand') return C_DEMAND(p).total;
    if (key === 'b') return brandById(p.b).name;
    if (key === 'name' || key === 'cat' || key === 'unit' || key === 'id') return String(p[key] ?? p.name).toLowerCase();
    return p[key];
  };
  return [...rows].sort((a, a2) => {
    const va = val(a), vb = val(a2);
    if (va < vb) return -1 * dir; if (va > vb) return 1 * dir; return 0;
  });
}

export function ProductsTable({ rows, sort, onSort, selected, onToggle, onToggleAll, onOpen }) {
  const allSel = rows.length > 0 && rows.every(r => selected.has(r.id));
  const someSel = rows.some(r => selected.has(r.id));
  return (
    <div className="c-tablewrap">
      <table className="c-tbl">
        <thead>
          <tr>
            <th className="c-checkcol">
              <span className={'c-check' + (allSel ? ' on' : someSel ? ' part' : '')} onClick={onToggleAll}>
                {allSel ? <Ico name="check" size={12} stroke={2.6} /> : someSel ? <Ico name="minus" size={12} stroke={2.6} /> : null}
              </span>
            </th>
            {C_COLS.map(c => {
              const active = sort && sort.key === c.key;
              return (
                <th key={c.key} style={{ width: c.w }} className={(c.num ? 'c-th-num ' : '') + (active ? 'c-th-active' : '')}
                  onClick={() => onSort(c.key)}>
                  <span className="c-th-in">{c.label}{active && <Ico name="chev" size={12} style={{ transform: sort.dir < 0 ? 'rotate(180deg)' : 'none' }} />}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(p => {
            const sel = selected.has(p.id);
            const mg = C_MARGIN(p);
            const dem = C_DEMAND(p);
            const low = p.stock < 20;
            return (
              <tr key={p.id} className={sel ? 'sel' : ''} onClick={() => onOpen(p.id)}>
                <td className="c-checkcol" onClick={e => { e.stopPropagation(); onToggle(p.id); }}>
                  <span className={'c-check' + (sel ? ' on' : '')}>{sel && <Ico name="check" size={12} stroke={2.6} />}</span>
                </td>
                <td className="c-mono c-dim">{p.id.toUpperCase()}</td>
                <td className="c-name">
                  <div className="c-name-in">
                    <ProdThumb p={p} />
                    <span className="c-nm">{p.name}</span>
                    {C_NEW.has(p.id) && <span className="c-newdot" title="New this season">NEW</span>}
                  </div>
                </td>
                <td className="c-brand">{brandById(p.b).name}</td>
                <td><span className="c-cat" style={{ '--cc': CAT_COLOR[p.cat] }}>{p.cat}</span></td>
                <td className="c-mono c-dim">{p.unit}</td>
                <td className="c-num">{p.moq}</td>
                <td className="c-num">
                  <span className="c-stock">
                    <span className={'c-stockbar' + (low ? ' low' : '')}><i style={{ width: Math.min(100, p.stock / 2.4) + '%' }} /></span>
                    <b className={low ? 'c-low' : ''}>{p.stock}</b>
                  </span>
                </td>
                <td className="c-num c-strong">{money(p.wp)}</td>
                <td className="c-num c-dim">{money(p.rrp)}</td>
                <td className="c-num">
                  <span className="c-margin"><i style={{ width: mg + '%' }} />{mg}%</span>
                </td>
                <td className="c-demandcell">
                  <Spark data={dem.series} />
                  <span className={'c-trend ' + (dem.trend >= 0 ? 'up' : 'dn')}>{dem.trend >= 0 ? '▲' : '▼'}{Math.abs(dem.trend)}</span>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr className="c-empty"><td colSpan={C_COLS.length + 1}>No products match this view.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* row detail drawer */
export function DetailDrawer({ id, onClose, onAdded }) {
  const p = productById(id);
  const b = brandById(p.b);
  const mg = C_MARGIN(p);
  const dem = C_DEMAND(p);
  const low = p.stock < 20;
  const [qty, setQty] = useStateT(p.moq);
  return (
    <React.Fragment>
      <div className="c-scrim" onClick={onClose} />
      <aside className="c-drawer">
        <div className="c-dr-head">
          <span className="c-mono c-dim">{p.id.toUpperCase()}</span>
          <button className="c-iconbtn" onClick={onClose}><Ico name="x" size={16} /></button>
        </div>
        <div className="c-dr-hero" style={{ '--ph-tint': p.tint }}>
          <Ph tint={p.tint} marks={p.marks} cap="product shot" style={{ position: 'absolute', inset: 0 }} />
        </div>
        <div className="c-dr-body">
          <div className="c-dr-brand"><span className="c-sw" style={{ background: p.tint }} /> {b.name}{b.loc ? ` · ${b.loc}` : ''}</div>
          <h2 className="c-dr-name">{p.name}</h2>
          <p className="c-dr-blurb">{p.blurb}</p>

          <div className="c-dr-stats">
            <div className="c-stat"><div className="c-stat-k">Wholesale</div><div className="c-stat-v">{money(p.wp)}<small>/ {p.unit}</small></div></div>
            <div className="c-stat"><div className="c-stat-k">RRP</div><div className="c-stat-v">{money(p.rrp)}</div></div>
            <div className="c-stat"><div className="c-stat-k">Margin</div><div className="c-stat-v c-ok">{mg}%</div></div>
            <div className="c-stat"><div className="c-stat-k">MOQ</div><div className="c-stat-v">{p.moq} <small>{p.unit}</small></div></div>
            <div className="c-stat"><div className="c-stat-k">Stock</div><div className={'c-stat-v' + (low ? ' c-warn' : '')}>{p.stock}{low ? ' · low' : ''}</div></div>
            <div className="c-stat"><div className="c-stat-k">Category</div><div className="c-stat-v c-sm">{p.cat}</div></div>
          </div>

          <div className="c-dr-demand">
            <div className="c-stat-k">12-week demand</div>
            <Spark data={dem.series} w={236} h={40} />
          </div>
        </div>
        <div className="c-dr-foot">
          <div className="c-qty">
            <button onClick={() => setQty(q => Math.max(p.moq, q - 1))}><Ico name="minus" size={14} /></button>
            <span>{qty}</span>
            <button onClick={() => setQty(q => q + 1)}><Ico name="plus" size={14} /></button>
          </div>
          <button className="c-btn-primary" onClick={() => { actions.addToCart(p.id, qty); onAdded(p, qty); }}>
            <Ico name="bag" size={15} /> Add · {money(p.wp * qty)}
          </button>
        </div>
      </aside>
    </React.Fragment>
  );
}
