import React from 'react';
import { BRANDS, PRODUCTS, CATEGORIES, brandById, getBooth, useStore } from '../data/store.js';
import { Ico } from '../components/ui.jsx';
import { Showroom } from '../showroom/Showroom.jsx';
import './wander.css';

/* ============================================================
   STOCKIST — PAVILION map (PavilionApp.jsx)
   Top-down, wander-anywhere show floor. Steer with WASD / arrows /
   drag-joystick / click-to-walk. Camera follows; aisles twist
   around booths. Reach a brand booth → walk into its 3D showroom.
   ============================================================ */
const { useState: useStateW, useEffect: useEffectW, useRef: useRefW, useCallback: useCb } = React;

/* ---- world + plan geometry (plan px) ---- */
const WORLD = { w: 2600, h: 1720 };
const BUILDING = { x: 260, y: 360, w: 2080, h: 1080 };
const STEM = { x: 1200, y: 1440, w: 200, h: 232 };
const AV_R = 15;

/* zone tints by category (soft, from the viz ramp) */
const ZONES = [
  { cat: 'Apparel',      x: 420, y: 520, w: 600, h: 320, tint: 'oklch(0.62 0.13 165 / 0.12)', line: 'oklch(0.62 0.13 165 / 0.30)', ink: 'oklch(0.45 0.10 165)' },
  { cat: 'Food & Drink', x: 420, y: 910, w: 600, h: 380, tint: 'oklch(0.66 0.16 45 / 0.11)',  line: 'oklch(0.66 0.16 45 / 0.30)',  ink: 'oklch(0.50 0.12 45)' },
  { cat: 'Home',         x: 1040, y: 520, w: 540, h: 320, tint: 'oklch(0.45 0.16 280 / 0.10)', line: 'oklch(0.45 0.16 280 / 0.28)', ink: 'oklch(0.45 0.15 280)' },
  { cat: 'Beauty',       x: 1620, y: 520, w: 580, h: 320, tint: 'oklch(0.55 0.13 320 / 0.12)', line: 'oklch(0.55 0.13 320 / 0.30)', ink: 'oklch(0.46 0.12 320)' },
  { cat: 'Accessories',  x: 1620, y: 910, w: 580, h: 380, tint: 'oklch(0.78 0.14 85 / 0.14)',  line: 'oklch(0.70 0.13 85 / 0.34)',  ink: 'oklch(0.48 0.09 85)' },
];

/* brand booths — (x,y) top-left in plan px; mapped to a brand id */
const BOOTHS = [
  { id: 'b3', x: 460,  y: 590, w: 210, h: 170 },
  { id: 'b4', x: 780,  y: 590, w: 210, h: 170 },
  { id: 'b1', x: 460,  y: 985, w: 210, h: 170 },
  { id: 'b2', x: 780,  y: 985, w: 210, h: 170 },
  { id: 'b5', x: 1075, y: 590, w: 185, h: 170 },
  { id: 'b6', x: 1335, y: 590, w: 185, h: 170 },
  { id: 'b7', x: 1675, y: 590, w: 235, h: 170 },
  { id: 'b8', x: 1675, y: 985, w: 235, h: 170 },
];

/* non-interactive structural blocks (build aisles + twists) */
const BLOCKS = [
  { no: '209', x: 600,  y: 1195, w: 150, h: 95 },
  { no: '118', x: 1970, y: 600,  w: 150, h: 150 },
  { no: '124', x: 1970, y: 990,  w: 150, h: 160 },
  { no: '126', x: 1710, y: 1200, w: 150, h: 92 },
  { no: 'Info', x: 1250, y: 1150, w: 110, h: 110, kind: 'info' },
  { no: 'River Pavilion', x: 1080, y: 405, w: 440, h: 104, kind: 'lounge' },
];

const ALL_OBSTACLES = [...BOOTHS, ...BLOCKS];

/* ---- geometry helpers ---- */
const cx = (b) => b.x + b.w / 2;
const cy = (b) => b.y + b.h / 2;
function inRectInset(px, py, r, ins) { return px >= r.x + ins && px <= r.x + r.w - ins && py >= r.y + ins && py <= r.y + r.h - ins; }
function walkable(px, py) {
  const inBuild = inRectInset(px, py, BUILDING, AV_R);
  const inStem = px >= STEM.x + AV_R && px <= STEM.x + STEM.w - AV_R && py >= STEM.y - 36 && py <= STEM.y + STEM.h - AV_R;
  return inBuild || inStem;
}
function blocked(px, py) {
  for (const o of ALL_OBSTACLES) {
    if (px > o.x - AV_R && px < o.x + o.w + AV_R && py > o.y - AV_R && py < o.y + o.h + AV_R) return true;
  }
  return false;
}
const valid = (px, py) => walkable(px, py) && !blocked(px, py);

function zoneAt(px, py) {
  for (const z of ZONES) if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return z.cat;
  if (py < 510) return 'River Pavilion';
  if (py > 1290) return 'Crystal Palace';
  return 'The Concourse';
}

/* distance from point to (expanded) booth rect, for proximity */
function distToBooth(px, py, b) {
  const dx = Math.max(b.x - px, 0, px - (b.x + b.w));
  const dy = Math.max(b.y - py, 0, py - (b.y + b.h));
  return Math.hypot(dx, dy);
}

/* ---- a single booth tile ---- */
function BoothTile({ b, near }) {
  const brand = brandById(b.id);
  const cfg = getBooth(b.id);
  const sku = PRODUCTS.filter(p => p.b === b.id);
  const n = BRANDS.findIndex(x => x.id === b.id) + 1;
  return (
    <div className={'wd-booth' + (near ? ' near' : '')} data-booth={b.id}
      style={{ left: b.x, top: b.y, width: b.w, height: b.h, '--baccent': cfg.accent }}>
      <div className="bo-awning" />
      <div className="bo-in">
        <div className="bo-no">BOOTH {String(n).padStart(2, '0')}</div>
        <div className="bo-name">{brand.name}</div>
        <div className="bo-cat">{cfg.kicker}</div>
        <div className="bo-mono">{brand.name[0]}</div>
        <div className="bo-sw">
          {sku.slice(0, 3).map(p => <span key={p.id} style={{ background: p.tint }} />)}
        </div>
        <div className="bo-enter">Enter booth</div>
      </div>
    </div>
  );
}

/* ---- minimap ---- */
function Minimap({ posRef, onJump }) {
  const MW = 208, MH = MW * (WORLD.h / WORLD.w);
  const s = MW / WORLD.w;
  const dotRef = useRefW(null);
  const viewRef = useRefW(null);
  // keep the minimap dot synced via rAF-friendly external updates
  useEffectW(() => {
    let raf;
    const tick = () => {
      const p = posRef.current;
      if (dotRef.current) dotRef.current.setAttribute('transform', `translate(${p.x * s} ${p.y * s})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s]);
  const click = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    onJump((e.clientX - r.left) / s, (e.clientY - r.top) / s);
  };
  return (
    <div className="wd-minimap">
      <div className="mm-cap">Floor map · tap to walk</div>
      <svg width={MW} height={MH} onClick={click} viewBox={`0 0 ${MW} ${MH}`}>
        <rect x={BUILDING.x * s} y={BUILDING.y * s} width={BUILDING.w * s} height={BUILDING.h * s} rx="3"
          fill="oklch(0.96 0.008 85 / 0.5)" stroke="oklch(0.8 0.02 80 / 0.5)" />
        {ZONES.map(z => (
          <rect key={z.cat} x={z.x * s} y={z.y * s} width={z.w * s} height={z.h * s} rx="2" fill={z.tint} stroke={z.line} />
        ))}
        {BOOTHS.map(b => {
          const cfg = getBooth(b.id);
          return <rect key={b.id} x={b.x * s} y={b.y * s} width={b.w * s} height={b.h * s} rx="1.5" fill={cfg.accent} />;
        })}
        <rect x={STEM.x * s} y={STEM.y * s} width={STEM.w * s} height={STEM.h * s} fill="oklch(0.7 0.05 230 / 0.3)" />
        <g ref={dotRef}>
          <circle r="6" fill="oklch(0.42 0.15 280)" stroke="oklch(0.99 0.005 90)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

/* ---- directory panel ---- */
function Directory({ open, onClose, onGo }) {
  const groups = CATEGORIES.map(c => ({
    cat: c, zone: ZONES.find(z => z.cat === c),
    brands: BRANDS.filter(b => b.category === c),
  })).filter(g => g.brands.length);
  return (
    <div className={'wd-dir' + (open ? ' open' : '')}>
      <div className="wd-dir-head">
        <h3>Directory</h3>
        <button className="btn-reset" onClick={onClose}>Close</button>
      </div>
      <div className="wd-dir-body">
        {groups.map(g => (
          <div className="wd-dir-group" key={g.cat}>
            <div className="wd-dir-glabel"><span className="gd" style={{ background: g.zone.ink }} />{g.cat}</div>
            {g.brands.map(b => {
              const cfg = getBooth(b.id);
              const n = BRANDS.findIndex(x => x.id === b.id) + 1;
              return (
                <div className="wd-dir-item" key={b.id} onClick={() => onGo(b.id)}>
                  <span className="di-no">{String(n).padStart(2, '0')}</span>
                  <span className="di-mk" style={{ background: cfg.accent }}>{b.name[0]}</span>
                  <span><div className="di-nm">{b.name}</div><div className="di-loc">{b.loc}</div></span>
                  <span className="di-go"><Ico name="walk" size={17} /></span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ the wandering map ============ */
function PavilionMap({ onEnter, onExit, toolbar }) {
  const s = useStore();
  const stageRef = useRefW(null);
  const worldRef = useRefW(null);
  const avatarRef = useRefW(null);
  const arrowRef = useRefW(null);

  const posRef = useRefW({ x: STEM.x + STEM.w / 2, y: STEM.y + 40 });
  const camRef = useRefW({ tx: 0, ty: 0, z: 1.15 });
  const keysRef = useRefW({});
  const stickRef = useRefW({ x: 0, y: 0 });
  const targetRef = useRefW(null);
  const headingRef = useRefW(0);

  const [near, setNear] = useStateW(null);          // brand id of nearby booth
  const [zone, setZone] = useStateW('Crystal Palace');
  const [dirOpen, setDirOpen] = useStateW(false);
  const [intro, setIntro] = useStateW(true);
  const nearRef = useRefW(null);

  const cartN = Object.keys(s.cart).length;
  const savedN = (s.favorites || []).length;

  /* ----- movement + camera loop ----- */
  useEffectW(() => {
    let raf, last = performance.now();
    const SPEED = 0.42; // px per ms

    const step = (now) => {
      const dt = Math.min(40, now - last); last = now;
      const p = posRef.current;

      // desired direction
      let dx = 0, dy = 0;
      const k = keysRef.current;
      if (k.up) dy -= 1; if (k.down) dy += 1; if (k.left) dx -= 1; if (k.right) dx += 1;
      const st = stickRef.current;
      if (st.x || st.y) { dx = st.x; dy = st.y; targetRef.current = null; }
      else if (dx || dy) { targetRef.current = null; }
      else if (targetRef.current) {
        const tx = targetRef.current.x - p.x, ty = targetRef.current.y - p.y;
        const d = Math.hypot(tx, ty);
        if (d < 6) targetRef.current = null;
        else { dx = tx / d; dy = ty / d; }
      }

      const mag = Math.hypot(dx, dy);
      if (mag > 0.001) {
        dx /= mag; dy /= mag;
        headingRef.current = Math.atan2(dy, dx);
        const dist = SPEED * dt;
        let nx = p.x + dx * dist, ny = p.y + dy * dist;
        if (valid(nx, ny)) { p.x = nx; p.y = ny; }
        else {
          if (valid(nx, p.y)) p.x = nx;
          if (valid(p.x, ny)) p.y = ny;
        }
        if (arrowRef.current) arrowRef.current.style.transform = `rotate(${headingRef.current * 180 / Math.PI + 90}deg)`;
      }

      // camera: center on avatar, clamped to world
      const vp = stageRef.current;
      if (vp) {
        const vw = vp.clientWidth, vh = vp.clientHeight, z = camRef.current.z;
        let tx = vw / 2 - p.x * z, ty = vh / 2 - p.y * z;
        tx = Math.min(0, Math.max(vw - WORLD.w * z, tx));
        ty = Math.min(0, Math.max(vh - WORLD.h * z, ty));
        camRef.current.tx = tx; camRef.current.ty = ty;
        if (worldRef.current) worldRef.current.style.transform = `translate(${tx}px,${ty}px) scale(${z})`;
      }
      if (avatarRef.current) avatarRef.current.style.transform = `translate(${p.x}px,${p.y}px)`;

      // proximity → nearest brand booth within range
      let best = null, bestD = 9999;
      for (const b of BOOTHS) { const d = distToBooth(p.x, p.y, b); if (d < bestD) { bestD = d; best = b; } }
      const nb = bestD < 64 ? best.id : null;
      if (nb !== nearRef.current) { nearRef.current = nb; setNear(nb); }

      const zn = zoneAt(p.x, p.y);
      setZone(prev => prev === zn ? prev : zn);

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ----- keyboard ----- */
  useEffectW(() => {
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
    const down = (e) => {
      if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') { if (nearRef.current) { e.preventDefault(); onEnter(nearRef.current); } return; }
      const m = map[e.key]; if (m) { keysRef.current[m] = true; setIntro(false); e.preventDefault(); }
    };
    const up = (e) => { const m = map[e.key]; if (m) keysRef.current[m] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [onEnter]);

  /* ----- click-to-walk on the floor ----- */
  const onStageDown = (e) => {
    if (e.target.closest('.wd-hud') || e.target.closest('.wd-intro')) return;
    setIntro(false);
    const r = stageRef.current.getBoundingClientRect();
    const { tx, ty, z } = camRef.current;
    const wx = (e.clientX - r.left - tx) / z, wy = (e.clientY - r.top - ty) / z;
    // clicking a booth you're already near → enter
    if (nearRef.current) {
      const b = BOOTHS.find(x => x.id === nearRef.current);
      if (b && wx > b.x - 10 && wx < b.x + b.w + 10 && wy > b.y - 10 && wy < b.y + b.h + 10) { onEnter(b.id); return; }
    }
    targetRef.current = { x: wx, y: wy };
  };

  /* ----- joystick ----- */
  const knobRef = useRefW(null);
  const stickActive = useRefW(false);
  const onStickDown = (e) => { stickActive.current = true; setIntro(false); moveStick(e); e.currentTarget.setPointerCapture(e.pointerId); };
  const moveStick = (e) => {
    if (!stickActive.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = 36, d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    stickRef.current = { x: dx / max, y: dy / max };
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px,${dy}px)`;
  };
  const endStick = () => { stickActive.current = false; stickRef.current = { x: 0, y: 0 }; if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)'; };

  /* ----- directory: walk to a booth ----- */
  const goTo = (brandId) => {
    setDirOpen(false); setIntro(false);
    const b = BOOTHS.find(x => x.id === brandId); if (!b) return;
    const upper = cy(b) < 870;
    targetRef.current = { x: cx(b), y: upper ? b.y + b.h + 58 : b.y - 58 };
  };
  const jumpMini = (wx, wy) => { setIntro(false); targetRef.current = { x: wx, y: wy }; };

  const nearBrand = near ? brandById(near) : null;
  const nearCfg = near ? getBooth(near) : null;

  return (
    <div className="wander" ref={stageRef} onPointerDown={onStageDown}>
      <div className="wd-viewport">
        <div className="wd-world" ref={worldRef}>
          {/* building shell */}
          <div className="wd-building" style={{ left: BUILDING.x, top: BUILDING.y, width: BUILDING.w, height: BUILDING.h }}>
            <div className="wd-floorgrid" />
          </div>

          {/* zones */}
          {ZONES.map(z => (
            <div key={z.cat} className="wd-zone" style={{ left: z.x, top: z.y, width: z.w, height: z.h, '--ztint': z.tint, '--zline': z.line }}>
              <div className="wd-zone-label" style={{ '--zink': z.ink, color: z.ink }}><span className="zd" />{z.cat}</div>
            </div>
          ))}

          {/* edge geography labels */}
          <div className="wd-edge river" style={{ left: BUILDING.x - 6, top: BUILDING.y + BUILDING.h / 2, transform: 'rotate(-90deg)', transformOrigin: 'left center' }}>Hudson River ▸</div>
          <div className="wd-edge" style={{ left: BUILDING.x + BUILDING.w + 22, top: BUILDING.y + BUILDING.h / 2, transform: 'rotate(90deg)', transformOrigin: 'left center' }}>Eleventh Avenue</div>
          <div className="wd-edge" style={{ left: WORLD.w / 2 - 70, top: BUILDING.y - 30 }}>W 38th St</div>

          {/* structural blocks */}
          {BLOCKS.map(bl => (
            <div key={bl.no} className={'wd-block' + (bl.kind ? ' ' + bl.kind : '')} style={{ left: bl.x, top: bl.y, width: bl.w, height: bl.h }}>
              <span className="bl-no">{bl.kind === 'info' ? 'Info' : bl.no}</span>
            </div>
          ))}

          {/* brand booths */}
          {BOOTHS.map(b => <BoothTile key={b.id} b={b} near={near === b.id} />)}

          {/* Crystal Palace entry */}
          <div className="wd-entry" style={{ left: STEM.x, top: STEM.y, width: STEM.w, height: STEM.h }}>
            <div className="ce-l">Crystal Palace</div>
          </div>

          {/* avatar */}
          <div className="wd-avatar" ref={avatarRef}>
            <div className="av-ring" />
            <div className="av-dot" />
            <div className="av-face"><div className="av-arrow" ref={arrowRef} /></div>
            <div className="av-tag">You</div>
          </div>
        </div>
      </div>

      {/* back to the main shop shell */}
      {onExit && (
        <button className="wd-back" onClick={onExit}><Ico name="arrowL" size={15} /> Back to shop</button>
      )}
      {toolbar}

      {/* ============ HUD ============ */}
      <div className="wd-hud">
        <div className="wd-loc" style={{ top: 66 }}>
          <div className="wl-brand"><span className="wl-glyph">S</span><span className="wl-word">STOCKIST</span></div>
          <div className="wl-here">You are in</div>
          <div className="wl-zone">{zone}</div>
        </div>

        <div className="wd-tr">
          <div style={{ display: 'flex', gap: 10 }}>
            {cartN > 0 && <div className="wd-pill"><Ico name="bag" size={15} /> Order <span className="pn">{cartN}</span></div>}
            <div className="wd-pill ghost" onClick={() => setDirOpen(o => !o)}><Ico name="map" size={15} /> Directory</div>
          </div>
          <Minimap posRef={posRef} onJump={jumpMini} />
        </div>

        {/* joystick */}
        <div className="wd-stick" onPointerDown={onStickDown} onPointerMove={moveStick} onPointerUp={endStick} onPointerLeave={endStick} onPointerCancel={endStick}>
          <div className="st-knob" ref={knobRef}><Ico name="walk" size={20} /></div>
        </div>

        {/* enter prompt */}
        {nearBrand && (
          <div className="wd-prompt">
            <span className="pr-mk" style={{ background: nearCfg.accent }}>{nearBrand.name[0]}</span>
            <span className="pr-t">
              <div className="pr-mono">{nearCfg.kicker} · {nearBrand.loc}</div>
              <div className="pr-nm">{nearBrand.name}</div>
            </span>
            <button className="pr-go" onClick={() => onEnter(near)}>Enter booth <kbd>E</kbd></button>
          </div>
        )}

        <div className="wd-hint">
          <Ico name="walk" size={14} /> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or drag to walk · click the floor to go there
        </div>

        <Directory open={dirOpen} onClose={() => setDirOpen(false)} onGo={goTo} />
      </div>

      {/* intro splash */}
      {intro && (
        <div className="wd-intro" onPointerDown={() => setIntro(false)}>
          <div className="in-eyebrow">The Pavilion · Javits-style trade floor</div>
          <h1>Wander the show floor.</h1>
          <p>Steer through the halls, turn down the aisles, and walk right into any brand's booth. No straight lines — just explore.</p>
          <button className="in-go"><Ico name="walk" size={18} /> Start exploring</button>
        </div>
      )}
    </div>
  );
}

/* ============ Root: map ⇄ enter showroom ============ */
export function PavilionApp({ onExit, toolbar = null }) {
  const [entered, setEntered] = useStateW(null);
  if (entered) {
    return (
      <div className="wd-showroom">
        <Showroom mode="visit" initialBrandId={entered} onExit={() => setEntered(null)} exitLabel="Back to the pavilion" />
      </div>
    );
  }
  return <PavilionMap onEnter={setEntered} onExit={onExit} toolbar={toolbar} />;
}
