import React from 'react';
import { BRANDS, PRODUCTS, CATEGORIES, money, useStore, actions, getBooth } from '../data/store.js';
import { Ico, Ph } from '../components/ui.jsx';
import './trade.css';

/* ============================================================
   TRADE FLOOR — the brand directory as a trade-show floor
   layout="isometric"  · pannable 3/4 floor map of booths
   layout="aisle"      · fast scroll list grouped by aisle
   Click a booth → walk into its 3D showroom.
   ============================================================ */

// shared per-booth derived data
function useBoothData() {
  const brands = BRANDS;
  return brands.map((b, i) => {
    const cfg = getBooth(b.id);
    const sk = PRODUCTS.filter(p => p.b === b.id);
    return { brand: b, cfg, sku: sk, n: i + 1 };
  });
}

// ============ ISOMETRIC FLOOR MAP ============
const TILT = 49;            // board tilt (deg)
const BOARD_W = 1300, BOARD_H = 700;

// 8 booths in 2 aisles of 4. board-space coordinates (px from top-left).
const PLOTS = (() => {
  const cols = [250, 517, 784, 1051];
  const rows = [185, 500];        // back aisle, front aisle
  const out = [];
  rows.forEach((ry, r) => cols.forEach(cx => out.push({ cx, cy: ry, row: r })));
  return out;
})();

function IsoBooth({ data, plot, faved, onEnter, onFav }) {
  const { brand, cfg, sku, n } = data;
  const PW = 196, PH = 132;     // plot
  const SW = 192, SH = 182;     // standee billboard
  return (
    <React.Fragment>
      {/* floor plot (lies flat on the board) */}
      <div className="tf-plot" style={{ left: plot.cx - PW / 2, top: plot.cy - PH / 2, width: PW, height: PH, '--baccent': cfg.accent }}>
        <span className="tf-plotnum">{String(n).padStart(2, '0')}</span>
        <span className="tf-plotcat">{cfg.kicker}</span>
      </div>
      {/* standing billboard — hinges up from the plot's back edge */}
      <div className="tf-stand" style={{ left: plot.cx - SW / 2, top: plot.cy - PH / 2 - SH, width: SW, height: SH, transform: `rotateX(-${TILT}deg)`, '--baccent': cfg.accent }}>
        <div className="tf-card" onClick={() => onEnter(brand.id)}>
          <div className="tf-cardtop">
            <span className="tf-booth-no">BOOTH {String(n).padStart(2, '0')}</span>
            <button className={'tf-heart' + (faved ? ' on' : '')} onClick={(e) => { e.stopPropagation(); onFav(brand.id); }}>
              <Ico name="heart" size={13} />
            </button>
          </div>
          <div className="tf-name">{brand.name}</div>
          <div className="tf-loc">{brand.loc}</div>
          <div className="tf-swatches">
            {sku.slice(0, 3).map(p => <span key={p.id} className="tf-sw" style={{ background: p.tint }} />)}
            <span className="tf-skucount">{sku.length} SKUs</span>
          </div>
          <div className="tf-visit">Visit booth <Ico name="arrowR" size={13} /></div>
        </div>
      </div>
    </React.Fragment>
  );
}

function IsoFloor({ booths, favs, onEnter, onFav }) {
  const stageRef = React.useRef(null);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(0.9);
  const drag = React.useRef(null);

  const down = (e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }; };
  const move = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    setPan({ x: drag.current.px + dx, y: drag.current.py + dy });
  };
  const up = () => { drag.current = null; };
  const reset = () => { setPan({ x: 0, y: 0 }); setZoom(0.9); };

  return (
    <div className="tf-iso" ref={stageRef}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
      <div className="tf-pan" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <div className="tf-board" style={{ width: BOARD_W, height: BOARD_H, transform: `translate(-50%, -50%) rotateX(${TILT}deg)` }}>
          <div className="tf-aislelabel" style={{ top: BOARD_H / 2 - 14 }}>
            <span>◂ AISLE A</span><span className="tf-entrance">ENTRANCE</span><span>AISLE B ▸</span>
          </div>
          {booths.map((d, i) => (
            <IsoBooth key={d.brand.id} data={d} plot={PLOTS[i]}
              faved={favs.includes(d.brand.id)} onEnter={(id) => { if (!drag.current || !drag.current.moved) onEnter(id); }} onFav={onFav} />
          ))}
        </div>
      </div>

      <div className="tf-zoom">
        <button onClick={() => setZoom(z => Math.min(1.15, z + 0.12))}><Ico name="plus" size={15} /></button>
        <button onClick={() => setZoom(z => Math.max(0.55, z - 0.12))}><Ico name="minus" size={15} /></button>
        <button onClick={reset} title="Reset view"><Ico name="map" size={15} /></button>
      </div>
      <div className="tf-floorhint"><Ico name="walk" size={14} /> Drag to pan the floor · click a booth to walk in</div>
    </div>
  );
}

// ============ AISLE SCROLL LIST ============
function AisleRow({ data, faved, onEnter, onFav }) {
  const { brand, cfg, sku, n } = data;
  return (
    <div className="tf-row" style={{ '--baccent': cfg.accent }}>
      <div className="tf-rowbanner" onClick={() => onEnter(brand.id)}>
        <span className="tf-rowno">{String(n).padStart(2, '0')}</span>
        <span className="tf-rowmark">{brand.name[0]}</span>
      </div>
      <div className="tf-rowmid">
        <div className="tf-rowcat">{cfg.kicker} · {brand.loc}</div>
        <div className="tf-rowname" onClick={() => onEnter(brand.id)}>{brand.name}</div>
        <div className="tf-rowtag">{cfg.tagline}</div>
      </div>
      <div className="tf-rowprods">
        {sku.slice(0, 4).map(p => (
          <Ph key={p.id} className="tf-rowph" tint={p.tint} marks={p.marks} showMark={false} cap="" />
        ))}
      </div>
      <div className="tf-rowactions">
        <button className={'tf-rowfav' + (faved ? ' on' : '')} onClick={() => onFav(brand.id)}>
          <Ico name="heart" size={14} /> {faved ? 'Saved' : 'Save'}
        </button>
        <button className="btn-fill tf-rowvisit" onClick={() => onEnter(brand.id)}>
          Visit booth <Ico name="arrowR" size={14} />
        </button>
      </div>
    </div>
  );
}

function AisleList({ booths, favs, onEnter, onFav }) {
  const cats = CATEGORIES;
  const groups = cats.map((c, i) => ({
    cat: c, letter: String.fromCharCode(65 + i),
    items: booths.filter(d => d.brand.category === c),
  })).filter(g => g.items.length);
  return (
    <div className="tf-aisles">
      {groups.map(g => (
        <div className="tf-group" key={g.cat}>
          <div className="tf-grouphead">
            <span className="tf-aisle-tag">AISLE {g.letter}</span>
            <span className="tf-aisle-name">{g.cat}</span>
            <span className="tf-aisle-count">{g.items.length} {g.items.length > 1 ? 'booths' : 'booth'}</span>
          </div>
          {g.items.map(d => (
            <AisleRow key={d.brand.id} data={d} faved={favs.includes(d.brand.id)} onEnter={onEnter} onFav={onFav} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============ CONCOURSE — first-person 3D aisle ============
// You stand in the hall and walk down the centre. Booths are real 3D
// structures lining both sides; dolly forward to approach, click to enter.
const CC = {
  FLOOR_Y: 300,     // world y of the floor (camera eye ~ y0)
  GAP: 1880,        // z between booth rows
  FRONT0: 1700,     // distance of first row from entrance
  STANDOFF: 2150,   // how far in front of a row the camera parks
  AISLE_X: 930,     // booth centre offset from aisle centre
  ANGLE: 23,        // booth turn toward the entrance (deg)
  BW: 900, BH: 1060, BD: 680, FH: 178, // booth front-w, height, depth, fascia-h
};
const rowZ = (k) => -(CC.FRONT0 + k * CC.GAP);
const ROWS = 4;
const camStations = [-960, ...Array.from({ length: ROWS }, (_, k) => CC.FRONT0 + k * CC.GAP - CC.STANDOFF)];
const CAM_MIN = camStations[0], CAM_MAX = camStations[camStations.length - 1] + 140;

function CFace({ w, h, t, cls, style, children, onClick }) {
  return (
    <div className={'cc-face ' + (cls || '')} onClick={onClick}
      style={{ width: w, height: h, transform: `translate(-50%,-50%) ${t}`, ...style }}>
      {children}
    </div>
  );
}

function ConcourseBooth({ data, side, k, near, faved, onEnter, onFav }) {
  const { brand, cfg, sku, n } = data;
  const { BW, BH, BD, FH, AISLE_X, ANGLE } = CC;
  const cx = side === 'L' ? -AISLE_X : AISLE_X;
  const cz = rowZ(k);
  const angle = side === 'L' ? ANGLE : -ANGLE;       // open mouth toward entrance
  const facings = sku.slice(0, 3);
  return (
    <div className={'cc-node cc-booth' + (near ? ' near' : '')}
      style={{ transform: `translate3d(${cx}px, ${CC.FLOOR_Y}px, ${cz}px) rotateY(${angle}deg)`, '--baccent': cfg.accent }}>
      {/* floor footprint */}
      <CFace cls="cc-foot" w={BW} h={BD} t={`translate3d(0px,-1px,${-BD / 2}px) rotateX(90deg)`}>
        <span className="cc-footnum">{String(n).padStart(2, '0')}</span>
      </CFace>
      {/* back wall (accent) */}
      <CFace cls="cc-back" w={BW} h={BH} t={`translate3d(0px,${-BH / 2}px,${-BD}px)`}>
        <div className="cc-backwash" />
        <div className="cc-backmark">{brand.name[0]}</div>
      </CFace>
      {/* side returns */}
      <CFace cls="cc-side" w={BD} h={BH} t={`translate3d(${-BW / 2}px,${-BH / 2}px,${-BD / 2}px) rotateY(90deg)`} />
      <CFace cls="cc-side cc-side-r" w={BD} h={BH} t={`translate3d(${BW / 2}px,${-BH / 2}px,${-BD / 2}px) rotateY(-90deg)`} />
      {/* product facings on a shelf against the back wall */}
      <div className="cc-node" style={{ transform: `translate3d(0px,${-BH * 0.46}px,${-BD + 26}px)` }}>
        {facings.map((p, i) => (
          <CFace key={p.id} cls="cc-fac" w={208} h={272}
            t={`translate3d(${(i - (facings.length - 1) / 2) * 248}px,0px,0px)`}
            onClick={(e) => { e.stopPropagation(); onEnter(brand.id); }}>
            <span className="cc-fac-im" style={{ background: p.tint }} />
            <span className="cc-fac-nm">{p.name}</span>
            <span className="cc-fac-pr">{money(p.wp)}</span>
          </CFace>
        ))}
      </div>
      {/* shelf ledge */}
      <CFace cls="cc-shelf" w={BW - 120} h={70} t={`translate3d(0px,${-BH * 0.30}px,${-BD + 92}px) rotateX(78deg)`} />
      {/* counter near the mouth */}
      <CFace cls="cc-counter" w={540} h={300} t={`translate3d(${side === 'L' ? 150 : -150}px,${-150}px,${-110}px)`}>
        <span className="cc-counter-mono">{cfg.kicker}</span>
      </CFace>
      <CFace cls="cc-counter-top" w={540} h={150} t={`translate3d(${side === 'L' ? 150 : -150}px,${-300}px,${-185}px) rotateX(90deg)`} />
      {/* fascia header sign — the readable storefront banner */}
      <CFace cls="cc-fascia" w={BW} h={FH} t={`translate3d(0px,${-(BH - FH / 2)}px,4px)`} onClick={() => onEnter(brand.id)}>
        <div className="cc-fascia-l">
          <span className="cc-booth-no">BOOTH {String(n).padStart(2, '0')}</span>
          <span className="cc-fascia-nm">{brand.name}</span>
        </div>
        <span className="cc-fascia-loc">{brand.loc}</span>
      </CFace>
      {/* placard standing at the booth mouth — billboarded toward the entrance */}
      <CFace cls="cc-plate" w={296} h={150} t={`translate3d(0px,-230px,210px) rotateY(${-angle}deg)`}>
        <div className="cc-plate-cat">{cfg.kicker}</div>
        <div className="cc-plate-nm">{brand.name}</div>
        <div className="cc-plate-row">
          <button className={'cc-plate-fav' + (faved ? ' on' : '')} onClick={(e) => { e.stopPropagation(); onFav(brand.id); }}>
            <Ico name="heart" size={13} />
          </button>
          <button className="cc-plate-enter" onClick={(e) => { e.stopPropagation(); onEnter(brand.id); }}>
            Enter <Ico name="arrowR" size={13} />
          </button>
        </div>
      </CFace>
      {/* invisible click catcher across the whole booth mouth */}
      <CFace cls="cc-hit" w={BW} h={BH} t={`translate3d(0px,${-BH / 2}px,2px)`} onClick={() => onEnter(brand.id)} />
    </div>
  );
}

function ConcourseFloor({ booths, favs, onEnter, onFav }) {
  const stageRef = React.useRef(null);
  const [camZ, setCamZ] = React.useState(camStations[0]);
  const [sway, setSway] = React.useState(0);          // lateral look (parallax)
  const target = React.useRef(camStations[1]);
  const raf = React.useRef(0);
  const drag = React.useRef(null);

  const clamp = (v) => Math.max(CAM_MIN, Math.min(CAM_MAX, v));
  const tick = React.useCallback(() => {
    setCamZ(z => {
      const nz = z + (target.current - z) * 0.1;
      if (Math.abs(target.current - z) > 0.4) raf.current = requestAnimationFrame(tick);
      else { raf.current = 0; return target.current; }
      return nz;
    });
  }, []);
  const kick = React.useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(tick); }, [tick]);
  const setTarget = (v) => { target.current = clamp(v); kick(); };

  // gentle push-in on mount
  React.useEffect(() => { const t = setTimeout(() => setTarget(camStations[1]), 350); return () => clearTimeout(t); }, []);

  // wheel → dolly
  React.useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const onWheel = (e) => { e.preventDefault(); setTarget(target.current + e.deltaY * 1.1); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); cancelAnimationFrame(raf.current); raf.current = 0; };
  }, [kick]);

  const down = (e) => { drag.current = { y: e.clientY, x: e.clientX, t: target.current, moved: false }; };
  const move = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    setSway((( e.clientX - r.left) / r.width - 0.5) * 14);
    if (drag.current) {
      const dy = e.clientY - drag.current.y;
      if (Math.abs(dy) + Math.abs(e.clientX - drag.current.x) > 4) drag.current.moved = true;
      setTarget(drag.current.t + dy * 1.7);
    }
  };
  const up = () => { drag.current = null; };
  const guardedEnter = (id) => { if (!drag.current || !drag.current.moved) onEnter(id); };

  // nearest station index for stepping + dots
  const nearestIdx = camStations.reduce((best, s, i) => Math.abs(s - camZ) < Math.abs(camStations[best] - camZ) ? i : best, 0);
  const step = (d) => setTarget(camStations[Math.max(0, Math.min(camStations.length - 1, nearestIdx + d))]);

  // which booths are "near" the camera (in front, readable)
  const isNear = (k) => { const rel = rowZ(k) + camZ; return rel > -2750 && rel < -1450; };
  const progress = (camZ - CAM_MIN) / (CAM_MAX - CAM_MIN);

  return (
    <div className="cc-stage" ref={stageRef} style={{ perspectiveOrigin: `${50 + sway}% 44%` }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
      <div className="cc-world" style={{ transform: `translate3d(0px,0px,${camZ}px)` }}>
          {/* floor */}
          <CFace cls="cc-floor" w={3200} h={CC.FRONT0 + ROWS * CC.GAP + 4200}
            t={`translate3d(0px,${CC.FLOOR_Y}px,${-(CC.FRONT0 + ROWS * CC.GAP) / 2}px) rotateX(90deg)`} />
          {/* aisle runner */}
          <CFace cls="cc-runner" w={760} h={CC.FRONT0 + ROWS * CC.GAP + 3600}
            t={`translate3d(0px,${CC.FLOOR_Y - 1}px,${-(CC.FRONT0 + ROWS * CC.GAP) / 2}px) rotateX(90deg)`} />
          {/* entrance arch */}
          <div className="cc-node" style={{ transform: `translate3d(0px,${CC.FLOOR_Y}px,250px)` }}>
            <CFace cls="cc-arch-beam" w={2080} h={188} t={`translate3d(0px,${-CC.BH - 150}px,0px)`}>
              <span className="cc-arch-mono">◂ AISLE A</span>
              <span className="cc-arch-title">THE TRADE FLOOR</span>
              <span className="cc-arch-mono">AISLE B ▸</span>
            </CFace>
            <CFace cls="cc-arch-leg" w={70} h={CC.BH + 60} t={`translate3d(${-1005}px,${-(CC.BH + 60) / 2}px,0px)`} />
            <CFace cls="cc-arch-leg" w={70} h={CC.BH + 60} t={`translate3d(${1005}px,${-(CC.BH + 60) / 2}px,0px)`} />
          </div>
          {/* booths */}
          {booths.map((d, i) => {
            const k = Math.floor(i / 2);
            const side = i % 2 === 0 ? 'L' : 'R';
            return (
              <ConcourseBooth key={d.brand.id} data={d} side={side} k={k} near={isNear(k)}
                faved={favs.includes(d.brand.id)} onEnter={guardedEnter} onFav={onFav} />
            );
          })}
        </div>

      {/* ---- overlay chrome ---- */}
      <div className="cc-walknav">
        <button onClick={() => step(-1)} disabled={nearestIdx === 0} title="Back"><Ico name="arrowL" size={17} /></button>
        <div className="cc-progress"><div className="cc-progress-fill" style={{ width: (progress * 100) + '%' }} /></div>
        <button onClick={() => step(1)} disabled={nearestIdx === camStations.length - 1} title="Walk forward"><Ico name="arrowR" size={17} /></button>
      </div>
      <div className="cc-stations">
        {camStations.map((s, i) => (
          <button key={i} className={'cc-stn' + (i === nearestIdx ? ' on' : '')}
            onClick={() => setTarget(s)} title={i === 0 ? 'Entrance' : 'Row ' + i} />
        ))}
      </div>
      <div className="cc-floorhint"><Ico name="walk" size={14} /> Scroll or drag to walk · click a booth to step inside</div>
    </div>
  );
}

// ============ TRADE FLOOR shell ============
export function TradeFloor({ layout = 'concourse', onEnter, toolbar = null }) {
  const s = useStore();
  const booths = useBoothData();
  const favs = s.favorites || [];
  const onFav = (id) => actions.toggleFav(id);
  const savedCount = favs.length;

  // concourse is full-bleed immersive with a slim overlay header
  if (layout === 'concourse') {
    return (
      <div className="tf tf-immersive role-stage">
        {toolbar}
        <div className="cc-topbar">
          <div className="cc-topbar-l">
            <span className="cc-topbar-eyebrow">THE TRADE FLOOR</span>
            <span className="cc-topbar-sub">{booths.length} brands exhibiting · walk the hall</span>
          </div>
          {savedCount > 0 && <div className="tf-saved"><Ico name="heart" size={14} /> {savedCount} saved</div>}
        </div>
        <ConcourseFloor booths={booths} favs={favs} onEnter={onEnter} onFav={onFav} />
      </div>
    );
  }

  return (
    <div className="tf role-stage">
      {toolbar}
      <div className="tf-header">
        <div className="tf-head-l">
          <div className="tf-eyebrow"><span className="ln" /> <span>The trade floor · {booths.length} brands exhibiting</span></div>
          <h1>Walk the floor.</h1>
          <p>Every brand has a booth. Browse the hall, step inside, and build your order — just like a trade show, without the flights.</p>
        </div>
        <div className="tf-head-r">
          {savedCount > 0 && <div className="tf-saved"><Ico name="heart" size={14} /> {savedCount} saved</div>}
        </div>
      </div>

      {layout === 'aisle'
        ? <AisleList booths={booths} favs={favs} onEnter={onEnter} onFav={onFav} />
        : <IsoFloor booths={booths} favs={favs} onEnter={onEnter} onFav={onFav} />}
    </div>
  );
}
