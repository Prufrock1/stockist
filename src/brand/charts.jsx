/* ============================================================
   BRAND — chart primitives (Hex-style data viz)
   ============================================================ */
import React from 'react';

export function Sparkline({ data, color = 'var(--accent)', w = 110, h = 30, fill = true }) {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [ (i / (data.length - 1)) * w, h - 3 - ((v - min) / rng) * (h - 6) ]);
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `${pts[0][0]},${h} ${line} ${pts[pts.length-1][0]},${h}`;
  const gid = 'sg' + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.18" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      {fill && <polygon points={area} fill={`url(#${gid})`} />}
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// stacked vertical bars
export function StackedChart({ days, maxY, ticks = [0, 1, 2, 3, 4] }) {
  return (
    <div className="chart-wrap">
      <div className="chart-y">
        {[...ticks].reverse().map((t, i) => <div key={i}>{Math.round(maxY * t / (ticks.length - 1))}</div>)}
      </div>
      <div className="chart" style={{ flex: 1 }}>
        {days.map((d, i) => (
          <div className="col" key={i}>
            <div className="stack" title={`${d.x}: ${d.segs.reduce((a, s) => a + s.v, 0)} units`}>
              {d.segs.map((s, j) => (
                <div key={j} style={{ height: `${(s.v / maxY) * 160}px`, background: s.color }}></div>
              ))}
            </div>
            <div className="x">{d.x}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBars({ rows }) {
  const max = Math.max(...rows.map(r => r.value));
  return (
    <div className="hbars">
      {rows.map((r, i) => (
        <div className="hbar" key={i}>
          <span className="hb-name" title={r.name}>{r.name}</span>
          <div className="hb-track"><div className="hb-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color || 'var(--viz-1)' }}></div></div>
          <span className="hb-val">{r.fmt ? r.fmt(r.value) : r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function StockMeter({ stock, max = 250 }) {
  const pct = Math.min(100, (stock / max) * 100);
  const color = stock < 20 ? 'var(--danger)' : stock < 60 ? 'var(--warn)' : 'var(--ok)';
  return (
    <div className="stock-meter">
      <div className="sm-track"><div className="sm-fill" style={{ width: pct + '%', background: color }}></div></div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>{stock}</span>
    </div>
  );
}

// status label helper
export function StatusPill({ status }) {
  const label = status === 'new' ? 'New' : status;
  return <span className={'status ' + status}><span className="sd"></span>{label}</span>;
}

// ---- synthetic weekly series for the dashboard ----
export const CAT_COLORS = {
  'Food & Drink': 'var(--viz-1)', 'Apparel': 'var(--viz-2)',
  'Home': 'var(--viz-3)', 'Beauty': 'var(--viz-4)', 'Accessories': 'var(--viz-5)',
};
export const WEEK = [
  { x: '06/04', segs: [{ v: 18, c: 'Food & Drink' }, { v: 12, c: 'Apparel' }, { v: 8, c: 'Home' }, { v: 4, c: 'Beauty' }] },
  { x: '06/05', segs: [{ v: 22, c: 'Food & Drink' }, { v: 16, c: 'Apparel' }, { v: 6, c: 'Home' }, { v: 7, c: 'Accessories' }] },
  { x: '06/06', segs: [{ v: 14, c: 'Food & Drink' }, { v: 20, c: 'Apparel' }, { v: 11, c: 'Home' }, { v: 5, c: 'Beauty' }] },
  { x: '06/07', segs: [{ v: 26, c: 'Food & Drink' }, { v: 18, c: 'Apparel' }, { v: 14, c: 'Home' }, { v: 9, c: 'Accessories' }] },
  { x: '06/08', segs: [{ v: 20, c: 'Food & Drink' }, { v: 24, c: 'Apparel' }, { v: 10, c: 'Home' }, { v: 8, c: 'Beauty' }] },
  { x: '06/09', segs: [{ v: 30, c: 'Food & Drink' }, { v: 22, c: 'Apparel' }, { v: 16, c: 'Home' }, { v: 11, c: 'Accessories' }] },
  { x: '06/10', segs: [{ v: 34, c: 'Food & Drink' }, { v: 26, c: 'Apparel' }, { v: 18, c: 'Home' }, { v: 12, c: 'Beauty' }] },
].map(d => ({ x: d.x, segs: d.segs.map(s => ({ v: s.v, color: CAT_COLORS[s.c] })) }));
