/* ============================================================
   STOCKIST — Operator's Console (ConsoleApp.jsx)
   Claude-style chat shell whose answer canvas is a dense,
   sortable products spreadsheet. Retailer buying console.
   ============================================================ */
import React from 'react';
import {
  BRANDS, PRODUCTS, CATEGORIES, brandById, productById, money, useStore, actions,
} from '../data/store.js';
import { Ico } from '../components/ui.jsx';
import { SAVED_VIEWS, RECENT_QUERIES, SUGGESTED, CAT_COLOR } from './console-data.js';
import { ProductsTable, DetailDrawer, sortRows } from './ConsoleTable.jsx';
import './console.css';

const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

let toastTimer;

export function ConsoleApp({ onExit, onSignOut }) {
  const s = useStore();
  const [view, setView] = useStateC('all');
  const [cat, setCat] = useStateC('All');
  const [brand, setBrand] = useStateC(null);
  const [search, setSearch] = useStateC('');
  const [sort, setSort] = useStateC(null);
  const [selected, setSelected] = useStateC(() => new Set());
  const [openId, setOpenId] = useStateC(null);
  const [orderOpen, setOrderOpen] = useStateC(false);
  const [toast, setToast] = useStateC(null);
  const [msgs, setMsgs] = useStateC([{ role: 'assistant', text: 'Here’s the full catalogue — 24 products across 8 brands. Ask me to filter, or pick a saved view.' }]);
  const [composer, setComposer] = useStateC('');
  const scrollRef = useRefC(null);

  const viewDef = SAVED_VIEWS.find(v => v.id === view) || SAVED_VIEWS[0];
  const cartCount = Object.values(s.cart).reduce((a, n) => a + n, 0);

  // derive rows
  let rows = PRODUCTS.slice();
  if (viewDef.pred) rows = rows.filter(viewDef.pred);
  if (cat !== 'All') rows = rows.filter(p => p.cat === cat);
  if (brand) rows = rows.filter(p => p.b === brand);
  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter(p => (p.name + ' ' + brandById(p.b).name + ' ' + p.cat + ' ' + p.id).toLowerCase().includes(q));
  }
  const effSort = sort || viewDef.sort || null;
  rows = sortRows(rows, effSort);

  const flash = (t) => { setToast(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => setToast(null), 2200); };

  const onSort = (key) => setSort(prev => prev && prev.key === key ? (prev.dir === -1 ? null : { key, dir: -1 }) : { key, dir: 1 });

  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => {
    const all = rows.every(r => prev.has(r.id));
    if (all) return new Set();
    return new Set(rows.map(r => r.id));
  });

  const pushMsg = (userText, assistantText) => {
    setMsgs(m => [...m, { role: 'user', text: userText }, { role: 'assistant', text: assistantText }]);
  };

  const applyView = (vid, userText) => {
    const v = SAVED_VIEWS.find(x => x.id === vid);
    setView(vid); setSort(null); setBrand(null); setCat('All');
    const n = PRODUCTS.filter(p => !v.pred || v.pred(p)).length;
    if (userText) pushMsg(userText, v.summary(n));
  };
  const pickCategory = (c) => {
    setCat(c);
    if (c !== 'All') { const n = PRODUCTS.filter(p => p.cat === c && (!viewDef.pred || viewDef.pred(p))).length; pushMsg(`Show ${c}`, `Filtered to ${c} — ${n} products.`); }
  };
  const pickBrand = (bid) => {
    setBrand(bid); const b = brandById(bid);
    const n = PRODUCTS.filter(p => p.b === bid).length;
    pushMsg(`Show ${b.name}`, `${b.name}${b.loc ? ` (${b.loc})` : ''} — ${n} SKUs in their line.`);
  };

  const submitComposer = (e) => {
    e && e.preventDefault();
    const t = composer.trim(); if (!t) return;
    setSearch(t);
    const matches = PRODUCTS.filter(p => (p.name + ' ' + brandById(p.b).name + ' ' + p.cat).toLowerCase().includes(t.toLowerCase())).length;
    pushMsg(t, `Searching “${t}” — ${matches} match${matches === 1 ? '' : 'es'}. (Conversational search is a preview; results are keyword-matched for now.)`);
    setComposer('');
  };

  const suggested = (sg) => { applyView(sg.view, sg.text); };

  // bulk add
  const bulkAdd = () => {
    let units = 0;
    selected.forEach(id => { const p = productById(id); actions.addToCart(id, p.moq); units += p.moq; });
    flash(`Added ${selected.size} SKUs (${units} units) to your order`);
    setSelected(new Set());
  };

  useEffectC(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs]);

  // order drawer lines
  const orderLines = Object.entries(s.cart).flatMap(([id, qty]) => {
    const p = productById(id);
    return p ? [{ p, qty, total: p.wp * qty }] : [];
  });
  const orderSub = orderLines.reduce((a, l) => a + l.total, 0);

  const title = brand ? brandById(brand).name : (cat !== 'All' ? cat : viewDef.label);

  return (
    <div className="console">
      {/* ===== sidebar ===== */}
      <aside className="c-side">
        <div className="c-side-top">
          {onExit && (
            <button className="c-back" onClick={onExit}><Ico name="arrowL" size={13} /> Back to shop</button>
          )}
          <div className="c-wordmark"><span className="c-glyph">S</span> STOCKIST <span className="c-wm-sub">Console</span></div>
          <button className="c-newq" onClick={() => { applyView('all'); setSearch(''); setMsgs([{ role: 'assistant', text: 'Fresh query. Here’s the full catalogue — ask me anything or pick a view.' }]); }}>
            <Ico name="plus" size={15} /> New query
          </button>
        </div>

        <div className="c-side-scroll">
          <div className="c-side-sec">
            <div className="c-side-label">Saved views</div>
            {SAVED_VIEWS.map(v => (
              <div key={v.id} className={'c-side-item' + (view === v.id && !brand && cat === 'All' ? ' on' : '')} onClick={() => applyView(v.id, v.label)}>
                <Ico name={v.ico} size={15} className="c-si-ico" /><span>{v.label}</span>
              </div>
            ))}
          </div>

          <div className="c-side-sec">
            <div className="c-side-label">Categories</div>
            {['All', ...CATEGORIES].map(c => (
              <div key={c} className={'c-side-item' + (cat === c && !brand ? ' on' : '')} onClick={() => { setBrand(null); c === 'All' ? (setCat('All')) : pickCategory(c); if (c === 'All') setCat('All'); }}>
                <span className="c-si-dot" style={{ background: c === 'All' ? 'var(--ink-3)' : CAT_COLOR[c] }} /><span>{c}</span>
                <span className="c-si-n">{c === 'All' ? PRODUCTS.length : PRODUCTS.filter(p => p.cat === c).length}</span>
              </div>
            ))}
          </div>

          <div className="c-side-sec">
            <div className="c-side-label">Brands</div>
            {BRANDS.map(b => (
              <div key={b.id} className={'c-side-item' + (brand === b.id ? ' on' : '')} onClick={() => pickBrand(b.id)}>
                <span className="c-si-mk">{b.name[0]}</span><span>{b.name}</span>
                <span className="c-si-n">{PRODUCTS.filter(p => p.b === b.id).length}</span>
              </div>
            ))}
          </div>

          <div className="c-side-sec">
            <div className="c-side-label">Recent</div>
            {RECENT_QUERIES.map((q, i) => (
              <div key={i} className="c-side-item c-recent" onClick={() => { setComposer(q); }}>
                <Ico name="search" size={14} className="c-si-ico" /><span>{q}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="c-side-foot">
          <span className="c-acct-ava">MB</span>
          <div className="c-acct-meta"><b>{s.retailer}</b><span>Retailer · Net-30</span></div>
        </div>
      </aside>

      {/* ===== main ===== */}
      <main className="c-main">
        <header className="c-head">
          <div className="c-head-l">
            <div className="c-head-title">{title}</div>
            <div className="c-head-sub">{rows.length} {rows.length === 1 ? 'product' : 'products'}{cat !== 'All' && !brand ? ' · ' + cat : ''}{search ? ' · “' + search + '”' : ''}</div>
          </div>
          <div className="c-head-r">
            {(search || brand || cat !== 'All' || view !== 'all' || sort) && (
              <button className="c-chip-clear" onClick={() => { setView('all'); setCat('All'); setBrand(null); setSearch(''); setSort(null); }}>
                <Ico name="x" size={13} /> Clear
              </button>
            )}
            <button type="button" className="nav-logout" onClick={onSignOut}>Log out</button>
            <button className="c-orderpill" onClick={() => setOrderOpen(true)}>
              <Ico name="bag" size={15} /> Order {cartCount > 0 && <span className="c-op-n">{cartCount}</span>}
            </button>
          </div>
        </header>

        <div className="c-assistant">
          <span className="c-as-ava">S</span>
          <div className="c-as-text">{msgs[msgs.length - 1].text}</div>
        </div>

        <ProductsTable rows={rows} sort={effSort} onSort={onSort} selected={selected}
          onToggle={toggle} onToggleAll={toggleAll} onOpen={setOpenId} />

        {/* bulk action bar */}
        {selected.size > 0 && (
          <div className="c-bulk">
            <span className="c-bulk-n">{selected.size} selected</span>
            <span className="c-bulk-sub">{[...selected].reduce((a, id) => a + productById(id).moq, 0)} units at MOQ</span>
            <div className="c-bulk-actions">
              <button className="c-btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
              <button className="c-btn-primary" onClick={bulkAdd}><Ico name="bag" size={14} /> Add to order</button>
            </div>
          </div>
        )}

        {/* composer */}
        <div className="c-composer-wrap">
          <div className="c-suggest">
            {SUGGESTED.map((sg, i) => (
              <button key={i} className="c-sg" onClick={() => suggested(sg)}>{sg.text}</button>
            ))}
          </div>
          <form className="c-composer" onSubmit={submitComposer}>
            <Ico name="search" size={17} className="c-comp-ico" />
            <input value={composer} onChange={e => setComposer(e.target.value)}
              placeholder="Ask about products, brands, margins, stock… (e.g. “low stock apparel under $200”)" />
            <button type="submit" className="c-comp-send" disabled={!composer.trim()}><Ico name="arrowR" size={16} /></button>
          </form>
          <div className="c-comp-note">Conversational search is a visual preview — typed queries keyword-match for now.</div>
        </div>
      </main>

      {openId && <DetailDrawer id={openId} onClose={() => setOpenId(null)} onAdded={(p, q) => { flash(`${p.name} × ${q} added to your order`); setOpenId(null); }} />}

      {orderOpen && (
        <React.Fragment>
          <div className="c-scrim" onClick={() => setOrderOpen(false)} />
          <aside className="c-drawer c-order">
            <div className="c-dr-head"><b className="c-order-title">Your order</b><button className="c-iconbtn" onClick={() => setOrderOpen(false)}><Ico name="x" size={16} /></button></div>
            <div className="c-order-body">
              {orderLines.length === 0 && <div className="c-order-empty"><Ico name="bag" size={26} /><div>No items yet. Select rows or open a product to add.</div></div>}
              {orderLines.map(({ p, qty, total }) => (
                <div className="c-order-line" key={p.id}>
                  <span className="c-sw" style={{ background: p.tint }} />
                  <div className="c-ol-mid"><div className="c-ol-name">{p.name}</div><div className="c-ol-sub">{brandById(p.b).name} · {qty} × {p.unit}</div></div>
                  <div className="c-ol-tot">{money(total)}</div>
                </div>
              ))}
            </div>
            {orderLines.length > 0 && (
              <div className="c-order-foot">
                <div className="c-order-row"><span>{Object.values(s.cart).reduce((a, n) => a + n, 0)} units</span><span>Net-30</span></div>
                <div className="c-order-row c-order-total"><span>Total</span><span>{money(orderSub)}</span></div>
                <button className="c-btn-primary c-block" onClick={async () => {
                  try {
                    const id = await actions.placeOrder();
                    if (!id) return;
                    setOrderOpen(false);
                    flash('Order ' + id + ' placed');
                  } catch (err) {
                    flash(err.message);
                  }
                }}>
                  <Ico name="check" size={15} /> Place wholesale order
                </button>
              </div>
            )}
          </aside>
        </React.Fragment>
      )}

      {toast && <div className="c-toast"><Ico name="check" size={15} /> {toast}</div>}
    </div>
  );
}
