import React from 'react';
import { BRANDS, PRODUCTS, productById, brandById, money, useStore, actions, getBooth } from '../data/store.js';
import { Ico, Ph } from '../components/ui.jsx';
import { BoothEditor } from './BoothEditor.jsx';
import './showroom.css';

/* ============================================================
   SHOWROOM — CSS-3D booth scene + dolly navigation
   mode="visit"  · retailer walks the booth, adds to order
   mode="edit"   · brand customizes the space (live preview)
   ============================================================ */

// ---- world constants (px) ----
const FLOOR_Y = 430;      // +y is down; floor plane sits here (eye above floor)
const PLINTH_H = 250;
const BACK_Z = -4300;
const WALL_H = 1700;
const MAXZ = 3650;        // dolly travel

// fixture arrangement per layout preset
function layoutFixtures(layout) {
  if (layout === 'market') {
    return {
      plinths: [
        { x: -300, z: -1780 },
        { x: 30,   z: -1640 },
        { x: 350,  z: -1820 },
      ],
      displayWall: { x: -1010, z: -3140, rotY: 20 },
      counter: { x: 880, z: -2380, rotY: -22 },
    };
  }
  // gallery (default)
  return {
    plinths: [
      { x: -360, z: -2000 },
      { x: 320,  z: -2680 },
      { x: -120, z: -3340 },
    ],
    displayWall: { x: -1080, z: -3160, rotY: 25 },
    counter: { x: 740, z: -1520, rotY: -17 },
  };
}

// ---------- low-level 3D box ----------
function Box({ x, y, z, w, h, d, rotY = 0, topCls, frontCls, sideCls, children, style }) {
  const wrap = { transform: `translate3d(${x}px,${y}px,${z}px) rotateY(${rotY}deg)`, ...style };
  const F = (cls, fw, fh, t) => (
    <div className={'sr-face ' + cls} style={{ width: fw, height: fh, transform: `translate(-50%,-50%) ${t}` }} />
  );
  return (
    <div className="sr-node" style={wrap}>
      {F(frontCls, w, h, `translateZ(${d/2}px)`)}
      {F(sideCls, w, h, `rotateY(180deg) translateZ(${d/2}px)`)}
      {F(sideCls, d, h, `rotateY(-90deg) translateZ(${w/2}px)`)}
      {F(sideCls, d, h, `rotateY(90deg) translateZ(${w/2}px)`)}
      {F(topCls, w, d, `rotateX(90deg) translateZ(${h/2}px)`)}
      {children}
    </div>
  );
}

// flat plane (floor / wall / banner / sign) — faces +Z then oriented
function Plane({ x, y, z, w, h, orient = '', className, style, children }) {
  return (
    <div className="sr-node" style={{ transform: `translate3d(${x}px,${y}px,${z}px)` }}>
      <div className={'sr-face ' + (className || '')}
        style={{ width: w, height: h, transform: `translate(-50%,-50%) ${orient}`, ...style }}>
        {children}
      </div>
    </div>
  );
}

// ---------- floor lighting ----------
function Spot({ x, z, size, kind = 'spot' }) {
  return (
    <div className="sr-node" style={{ transform: `translate3d(${x}px,${FLOOR_Y - (kind === 'spot' ? 2 : 1)}px,${z}px)` }}>
      <div className={kind === 'spot' ? 'sr-spot' : 'sr-shadow'}
        style={{ width: size, height: size * 0.62, transform: `translate(-50%,-50%) rotateX(90deg)` }} />
    </div>
  );
}

// ---------- hero product on a plinth ----------
function HeroProduct({ p, x, z, onClick }) {
  const topY = FLOOR_Y - PLINTH_H; // 20
  return (
    <div className="sr-node" style={{ transform: `translate3d(${x}px,${topY}px,${z}px)` }}>
      <div className="sr-bill">
        <div className="sr-card" onClick={onClick}>
          <Ph className="sc-img" tint={p.tint} marks={p.marks} cap="product shot" />
          <div className="sc-body">
            <div className="sc-brand">{brandById(p.b).name}</div>
            <div className="sc-name">{p.name}</div>
            <div className="sc-foot">
              <span className="sc-price">{money(p.wp)}</span>
              <span className="sc-view">View</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Plinth({ p, x, z, label, onClick }) {
  const cy = FLOOR_Y - PLINTH_H / 2; // center y
  return (
    <React.Fragment>
      <Spot x={x} z={z} size={640} kind="spot" />
      <Spot x={x} z={z + 60} size={430} kind="shadow" />
      <Box x={x} y={cy} z={z} w={264} h={PLINTH_H} d={264}
        topCls="sr-plinth-top" frontCls="sr-plinth-front" sideCls="sr-plinth-side">
        {/* accent skirt + plate live on the front face */}
        <div className="sr-face" style={{ width: 264, height: PLINTH_H, transform: `translate(-50%,-50%) translateZ(133px)`, pointerEvents: 'none' }}>
          <div className="sr-plinth-base" />
          <div className="sr-plinth-plate">{label}</div>
        </div>
      </Box>
      <HeroProduct p={p} x={x} z={z} onClick={onClick} />
    </React.Fragment>
  );
}

// ---------- merchandised display wall ----------
function DisplayWall({ brand, products, pos, onPick }) {
  const { x, z, rotY } = pos;
  const PW = 560, PH = 720;
  const panelCY = FLOOR_Y - PH / 2 - 60; // lift off floor a touch
  // 2 rows x 3 facings using brand SKUs (cycled)
  const facings = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    facings.push({ p: products[(r * 3 + c) % products.length], col: c, row: r });
  }
  const ledgeYs = [panelCY + 70, panelCY + 270];
  return (
    <div className="sr-node" style={{ transform: `translate3d(${x}px,0px,${z}px) rotateY(${rotY}deg)` }}>
      {/* back panel */}
      <div className="sr-face sr-dpanel" style={{ width: PW, height: PH, transform: `translate(-50%,-50%) translate3d(0px,${panelCY}px,-30px)` }}>
        <div className="sr-dhead">
          <div className="dh-mono">In stock · ships in 3–5 days</div>
          <div className="dh-title">The {brand.name} range</div>
        </div>
      </div>
      {/* ledges */}
      {ledgeYs.map((ly, i) => (
        <div key={i} className="sr-face sr-dledge" style={{ width: PW - 30, height: 90, transform: `translate(-50%,-50%) translate3d(0px,${ly + 80}px,30px) rotateX(82deg)` }} />
      ))}
      {/* facings */}
      {facings.map((f, i) => {
        const fx = (f.col - 1) * 175;
        const fy = ledgeYs[f.row] + 80;
        return (
          <div key={i} className="sr-node" style={{ transform: `translate3d(${fx}px,${fy}px,40px)` }}>
            <div className="sr-fac">
              <div className="sr-faccard" onClick={() => onPick && onPick(f.p.id)}>
                <Ph className="fc-img" tint={f.p.tint} marks={f.p.marks} cap="" showMark={false} />
                <div className="fc-b">
                  <div className="fc-name">{f.p.name}</div>
                  <div className="fc-price">{money(f.p.wp)} · {f.p.unit}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- counter / desk ----------
function Counter({ brand, pos, mode, onMessage }) {
  const { x, z, rotY } = pos;
  const w = 540, h = 250, d = 230;
  const cy = FLOOR_Y - h / 2;
  const topY = FLOOR_Y - h;
  const canMsg = mode === 'visit';
  return (
    <div className="sr-node" style={{ transform: `translate3d(${x}px,0,${z}px) rotateY(${rotY}deg)` }}>
      <Spot x={0} z={0} size={620} kind="shadow" />
      <Box x={0} y={cy} z={0} w={w} h={h} d={d}
        topCls="sr-counter-top" frontCls="sr-counter-front" sideCls="sr-counter-side">
        <div className="sr-face sr-counter-front" style={{ width: w, height: h, transform: `translate(-50%,-50%) translateZ(${d/2 + 1}px)`, pointerEvents: 'none' }}>
          <div className="cf-in">
            <div className="cf-mono">Talk to the brand</div>
            <div className="cf-name">{brand.name}</div>
          </div>
        </div>
      </Box>
      {/* standee on the counter top */}
      <div className="sr-node" style={{ transform: `translate3d(${-w/2 + 120}px,${topY}px,${10}px)` }}>
        <div className={'sr-counter-sign' + (canMsg ? ' clickable' : '')} onClick={canMsg ? onMessage : undefined}>
          <div className="cs-av">{brand.name[0]}</div>
          <div className="cs-l">{brand.loc}</div>
          {canMsg && <div className="cs-cta"><Ico name="chat" size={12} /> Message</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- back wall signage ----------
function Signage({ brand, hero, cfg }) {
  const cy = FLOOR_Y - WALL_H / 2;
  return (
    <Plane x={0} y={cy} z={BACK_Z} w={2300} h={WALL_H} className="sr-sign">
      <div className="sg-left">
        <div className="sg-kicker"><span className="ln" /><span>{cfg.kicker}</span></div>
        <h2>{brand.name}</h2>
        <p className="sg-tag">{cfg.tagline}</p>
        <div className="sg-meta">
          <span className="sg-chip">EST. {brand.loc}</span>
          <span className="sg-chip">{PRODUCTS.filter(p => p.b === brand.id).length} SKUs</span>
          <span className="sg-chip">NET-30 TRADE</span>
        </div>
      </div>
      <div className="sg-hero">
        <Ph tint={hero.tint} marks={hero.marks} cap="brand hero shot" />
        <div className="sg-herocap">{hero.name}</div>
      </div>
    </Plane>
  );
}

// ---------- the booth ----------
function Booth({ brand, products, cfg, mode, onPick, onMessage }) {
  const fx = layoutFixtures(cfg.layout);
  const hero = productById(cfg.heroId) || products[0];
  const plinthProducts = (cfg.plinthIds || []).map(id => productById(id)).filter(Boolean);
  const pick = mode === 'edit' ? null : onPick;
  return (
    <React.Fragment>
      {/* floor */}
      <Plane x={0} y={FLOOR_Y} z={-2300} w={3000} h={6600} orient="rotateX(90deg)" className="sr-floor" />
      {/* side banners */}
      <Plane x={-1340} y={FLOOR_Y - 600} z={-3200} w={560} h={1200} orient="rotateY(90deg)" className="sr-banner">
        <div className="bnr-sq" /><div className="bnr-mark">{brand.name}</div><div className="bnr-mono">{cfg.kicker}</div>
      </Plane>
      <Plane x={1340} y={FLOOR_Y - 600} z={-3700} w={560} h={1200} orient="rotateY(-90deg)" className="sr-banner">
        <div className="bnr-sq" /><div className="bnr-mark">Trade</div><div className="bnr-mono">{brand.loc}</div>
      </Plane>
      {/* back wall */}
      <Signage brand={brand} hero={hero} cfg={cfg} />
      {/* display wall */}
      <DisplayWall brand={brand} products={products} pos={fx.displayWall} onPick={pick} />
      {/* counter */}
      <Counter brand={brand} pos={fx.counter} mode={mode} onMessage={onMessage} />
      {/* plinths */}
      {fx.plinths.map((pos, i) => plinthProducts[i] && (
        <Plinth key={i} p={plinthProducts[i]} x={pos.x} z={pos.z} label={`No. 0${i + 1}`} onClick={() => pick && pick(plinthProducts[i].id)} />
      ))}
    </React.Fragment>
  );
}

// ---------- product popup ----------
function ShowroomPopup({ id, onClose, onAdded }) {
  const p = productById(id);
  const brand = brandById(p.b);
  const [qty, setQty] = React.useState(p.moq);
  const margin = Math.round((1 - p.wp / p.rrp) * 100);
  return (
    <React.Fragment>
      <div className="sr-pop-scrim" onClick={onClose} />
      <div className="sr-pop" role="dialog">
        <div className="pp-img"><Ph style={{ position: 'absolute', inset: 0 }} tint={p.tint} marks={p.marks} cap="product shot" />
          <button className="pp-x" onClick={onClose}><Ico name="x" size={15} /></button>
        </div>
        <div className="pp-b">
          <div className="pp-brand">{brand.name} · {brand.loc}</div>
          <h3>{p.name}</h3>
          <p className="pp-desc">{p.blurb}</p>
          <div className="pp-price">
            <span className="wp">{money(p.wp)} <span className="u">/ {p.unit}</span></span>
            <span className="rrp">RRP {money(p.rrp)}</span>
          </div>
          <div className="pp-margin">▲ {margin}% margin · MOQ {p.moq} · {p.stock < 20 ? 'low stock' : `${p.stock} in stock`}</div>
          <div className="pp-row">
            <div className="pp-qty">
              <button onClick={() => setQty(q => Math.max(p.moq, q - 1))}><Ico name="minus" size={15} /></button>
              <span>{qty}</span>
              <button onClick={() => setQty(q => q + 1)}><Ico name="plus" size={15} /></button>
            </div>
            <button className="btn-fill pp-add" onClick={() => { actions.addToCart(id, qty); onAdded(p); onClose(); }}>
              <Ico name="bag" size={15} /> Add to order
            </button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ---------- message the brand ----------
function BoothMessage({ brand, onClose, onSent }) {
  const [val, setVal] = React.useState('');
  return (
    <React.Fragment>
      <div className="sr-pop-scrim" onClick={onClose} />
      <div className="sr-msg" role="dialog">
        <button className="pp-x" onClick={onClose}><Ico name="x" size={15} /></button>
        <div className="sm-head">
          <div className="sm-av">{brand.name[0]}</div>
          <div>
            <div className="sm-mono">Message the brand</div>
            <div className="sm-name">{brand.name}</div>
            <div className="sm-loc">{brand.loc} · usually replies in 1 business day</div>
          </div>
        </div>
        <textarea className="sm-area" autoFocus value={val} onChange={e => setVal(e.target.value)}
          placeholder={`Hi ${brand.name.split(' ')[0]} — we'd love to learn about lead times, sample availability and your reorder terms…`} />
        <div className="sm-chips">
          {['Request a line sheet', 'Ask about samples', 'Minimums & lead time'].map(c => (
            <button key={c} className="sm-chip" onClick={() => setVal(v => (v ? v + ' ' : '') + c + '.')}>{c}</button>
          ))}
        </div>
        <button className="btn-fill" style={{ width: '100%' }} onClick={() => onSent(brand)}>
          <Ico name="arrowR" size={15} /> Send to {brand.name}
        </button>
      </div>
    </React.Fragment>
  );
}

// ---------- main Showroom view ----------
export function Showroom({ mode = 'visit', initialBrandId = null, onExit = null, exitLabel = 'Back to floor' }) {
  const s = useStore();
  const brands = BRANDS;
  const idxOf = (id) => Math.max(0, brands.findIndex(b => b.id === id));
  // In edit mode this is fixed to the signed-in brand's own booth and never
  // changes — a brand has no business browsing anyone else's booth.
  const [bi, setBi] = React.useState(() => (initialBrandId ? idxOf(initialBrandId) : 0));
  const [depth, setDepth] = React.useState(0);
  const [popup, setPopup] = React.useState(null);
  const [msg, setMsg] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [po, setPo] = React.useState('50% 38%');

  const stageRef = React.useRef(null);
  const target = React.useRef(0);
  const raf = React.useRef(0);
  const drag = React.useRef(null);

  const brand = brands[bi];
  const cfg = getBooth(brand.id);
  const products = PRODUCTS.filter(p => p.b === brand.id);
  const cartN = Object.keys(s.cart).length;
  const faved = (s.favorites || []).includes(brand.id);

  // jump to a brand when entering from the trade floor
  React.useEffect(() => { if (initialBrandId) setBi(idxOf(initialBrandId)); }, [initialBrandId]);

  // cinematic intro push-in on first mount
  React.useEffect(() => { const t = setTimeout(() => setTarget(0.12), 450); return () => clearTimeout(t); }, []);

  // ease current depth toward target
  const tick = React.useCallback(() => {
    setDepth(d => {
      const nd = d + (target.current - d) * 0.12;
      if (Math.abs(target.current - d) > 0.0006) raf.current = requestAnimationFrame(tick);
      else { raf.current = 0; return target.current; }
      return nd;
    });
  }, []);
  const kick = React.useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(tick); }, [tick]);
  const setTarget = (v) => { target.current = Math.max(0, Math.min(1, v)); kick(); };

  // wheel → dolly
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e) => { e.preventDefault(); setTarget(target.current + e.deltaY * 0.00085); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); cancelAnimationFrame(raf.current); raf.current = 0; };
  }, [kick]);

  // pointer drag → dolly (drag up = walk in) + parallax look
  const onPointerDown = (e) => { drag.current = { y: e.clientY, t: target.current, moved: false }; };
  const onPointerMove = (e) => {
    if (!stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width - 0.5;
    const my = (e.clientY - r.top) / r.height - 0.5;
    setPo(`${50 - mx * 6}% ${38 - my * 5}%`);
    if (drag.current) {
      const dy = e.clientY - drag.current.y;
      if (Math.abs(dy) > 3) drag.current.moved = true;
      setTarget(drag.current.t + (-dy) * 0.0011);
    }
  };
  const endDrag = () => { drag.current = null; };

  const trackRef = React.useRef(null);
  const railFromEvent = (e) => {
    const r = trackRef.current.getBoundingClientRect();
    setTarget((e.clientY - r.top) / r.height);
  };
  const railDrag = React.useRef(false);

  const flash = (txt) => { setToast(txt); clearTimeout(window.__srT); window.__srT = setTimeout(() => setToast(null), 2200); };
  const added = (p) => flash(`${p.name} added to order`);

  const depthZ = depth * MAXZ;

  return (
    <div className={'sr-host mode-' + mode} ref={stageRef}
      data-floor={cfg.floor} data-wall={cfg.wall} data-layout={cfg.layout}
      style={{ '--accent': cfg.accent,
        '--accent-soft': `color-mix(in oklch, ${cfg.accent} 14%, var(--paper))`,
        '--accent-ink': `color-mix(in oklch, ${cfg.accent} 78%, black)` }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}>
      <div className="sr-scene" style={{ '--po': po }}>
        <div className="sr-world" style={{ '--depthZ': depthZ + 'px' }}>
          <Booth key={brand.id + cfg.layout} brand={brand} products={products} cfg={cfg}
            mode={mode} onPick={setPopup} onMessage={() => setMsg(true)} />
        </div>
      </div>

      {/* ---- overlay UI ---- */}
      <div className="sr-ui">
        {/* top-left: identity + back/walk controls */}
        <div className="sr-top">
          {mode === 'visit' && onExit && (
            <button className="st-arrow st-back" onClick={onExit} title={exitLabel}><Ico name="arrowL" size={16} /><span>{exitLabel}</span></button>
          )}
          <div className="st-mid">
            {/* Edit mode is your own booth, so there is no position-in-a-set to
                report — the booth number only means something while browsing. */}
            <div className="st-mono">{mode === 'edit'
              ? 'Editing · your booth'
              : `Showroom · booth ${String(bi + 1).padStart(2, '0')}/${String(brands.length).padStart(2, '0')}`}</div>
            <div className="st-name">{brand.name}</div>
            <div className="st-sub">{cfg.kicker} · {brand.loc}</div>
          </div>
        </div>

        {/* visit-only: favorite the booth */}
        {mode === 'visit' && (
          <button className={'sr-fav' + (faved ? ' on' : '')} onClick={() => { actions.toggleFav(brand.id); flash(faved ? 'Removed from saved booths' : 'Booth saved'); }}>
            <Ico name="heart" size={15} /> {faved ? 'Saved' : 'Save booth'}
          </button>
        )}

        <div className="sr-rail">
          <div className="sr-jump"><button title="To hero wall" onClick={() => setTarget(0.96)}><Ico name="chev" size={15} /></button></div>
          <div className="sr-track" ref={trackRef}
            onPointerDown={(e) => { railDrag.current = true; railFromEvent(e); e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { if (railDrag.current) railFromEvent(e); }}
            onPointerUp={() => { railDrag.current = false; }}>
            <div className="rl-fill" style={{ height: (depth * 100) + '%' }} />
            <div className="rl-thumb" style={{ top: (depth * 100) + '%' }} />
          </div>
          <div className="sr-jump"><button title="To entrance" onClick={() => setTarget(0)}><Ico name="chev" size={15} style={{ transform: 'rotate(180deg)' }} /></button></div>
          <div className="rl-cap">Walk in</div>
        </div>

        {mode === 'visit' && (
          <div className="sr-hint">
            <span className="hp"><i /></span>
            <span>Scroll or drag to walk · click a product</span>
          </div>
        )}

        {mode === 'visit' && cartN > 0 && (
          <div className="sr-orderchip" onClick={() => flash('Open your order from the bag icon up top to review & place it')}>
            <Ico name="bag" size={15} /> In order <span className="oc-n">{cartN}</span>
          </div>
        )}

        {mode === 'edit' && <BoothEditor brandId={brand.id} />}
      </div>

      {popup && <ShowroomPopup id={popup} onClose={() => setPopup(null)} onAdded={added} />}
      {msg && <BoothMessage brand={brand} onClose={() => setMsg(false)}
        onSent={(b) => { setMsg(false); flash(`Message sent to ${b.name}`); }} />}
      {toast && <div className="sr-toast"><Ico name="check" size={15} /> {toast}</div>}
    </div>
  );
}
