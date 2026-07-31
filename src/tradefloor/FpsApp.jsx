/* ============================================================
   STOCKIST — FPS shell (FpsApp.jsx)
   Mounts the Three.js world, overlays the HUD + minimap, and
   swaps to the existing 3D Showroom when you enter a booth.
   ============================================================ */
import React from 'react';
import { brandById, getBooth } from '../data/store.js';
import { Ico } from '../components/ui.jsx';
import { Showroom } from '../showroom/Showroom.jsx';
import { createFPSWorld } from './fps-world.js';
import './fps.css';

const { useState: useStateF, useEffect: useEffectF, useRef: useRefF } = React;

/* minimap drawn from world layout + live pose */
function FpsMinimap({ worldRef }) {
  const canvasRef = useRefF(null);
  useEffectF(() => {
    let raf;
    const cv = canvasRef.current; if (!cv) return;
    const g = cv.getContext('2d');
    const MW = 196, MH = 176;
    cv.width = MW * 2; cv.height = MH * 2; g.scale(2, 2);
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = worldRef.current; if (!w) return;
      const { bounds, booths } = w.getLayout();
      const bw = bounds.maxX - bounds.minX, bd = bounds.maxZ - bounds.minZ;
      const pad = 8, sx = (MW - pad * 2) / bw, sz = (MH - pad * 2) / bd;
      const X = (x) => pad + (x - bounds.minX) * sx;
      const Z = (z) => pad + (z - bounds.minZ) * sz;
      g.clearRect(0, 0, MW, MH);
      g.fillStyle = 'rgba(245,242,235,0.10)'; g.fillRect(X(bounds.minX), Z(bounds.minZ), bw * sx, bd * sz);
      booths.forEach(b => {
        g.fillStyle = b.brandId ? b.hex : 'rgba(180,174,160,0.55)';
        g.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), b.w * sx, b.d * sz);
      });
      // entrance marker
      g.fillStyle = 'rgba(94,147,173,0.6)'; g.fillRect(X(-10), Z(bounds.maxZ) - 4, 20 * sx, 4);
      // player
      const pose = w.__pose || { x: 0, z: 0, yaw: 0 };
      const px = X(pose.x), pz = Z(pose.z);
      g.save(); g.translate(px, pz); g.rotate(-pose.yaw);
      g.fillStyle = '#5b4eaa'; g.strokeStyle = '#faf9f4'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill(); g.stroke();
      g.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} style={{ width: 196, height: 176 }} />;
}

export function FpsApp({ onExit, toolbar = null }) {
  const canvasRef = useRefF(null);
  const worldRef = useRefF(null);
  const [ready, setReady] = useStateF(false);
  const [locked, setLocked] = useStateF(false);
  const [playing, setPlaying] = useStateF(false);
  const [started, setStarted] = useStateF(false);
  const [zone, setZone] = useStateF('Crystal Palace');
  const [near, setNear] = useStateF(null);     // {brandId,...}
  const [entered, setEntered] = useStateF(null);
  const enteredRef = useRefF(null);

  useEffectF(() => {
    const w = createFPSWorld(canvasRef.current, {
      onReady: () => setReady(true),
      onLockChange: (l) => setLocked(l),
      onZone: (z) => setZone(z),
      onNear: (b) => setNear(b),
      onPose: (p) => { if (worldRef.current) worldRef.current.__pose = p; },
      onEnter: (brandId) => {
        if (enteredRef.current) return;
        enteredRef.current = brandId; setEntered(brandId);
        worldRef.current.pause();
      },
    });
    worldRef.current = w;
    // debug hook the design ships for scripted verification
    if (import.meta.env.DEV) window.__fpsWorld = w;
    w.start();
    return () => w.stop();
  }, []);

  const begin = () => { setStarted(true); setPlaying(true); worldRef.current.lock(); };
  const exitBooth = () => {
    enteredRef.current = null; setEntered(null);
    worldRef.current.resume(); worldRef.current.resize();
    // stays "playing" so the floor is controllable immediately; click to recapture the mouse
  };

  const nearBrand = near ? brandById(near.brandId) : null;
  const nearCfg = near ? getBooth(near.brandId) : null;
  const showStart = !entered && !playing;        // overlay only before you've entered the hall
  const showLookHint = playing && !entered && !locked;

  return (
    <div className="fps">
      <canvas ref={canvasRef} className="fps-canvas" onClick={() => { if (!entered) { setPlaying(true); if (!locked) worldRef.current.lock(); } }} />

      {!ready && <div className="fps-loading">Building the hall…</div>}

      {/* back to the main shop shell */}
      {!entered && onExit && (
        <button className="fps-back" onClick={onExit}><Ico name="arrowL" size={15} /> Back to shop</button>
      )}
      {!entered && toolbar}

      {!entered && (
        <div className="fps-hud">
          <div className={'fps-cross' + (near ? ' near' : '')} />

          <div className="fps-loc" style={{ top: 66 }}>
            <div className="fl-brand"><span className="fl-glyph">S</span><span className="fl-word">STOCKIST</span></div>
            <div className="fl-here">You are in</div>
            <div className="fl-zone">{zone}</div>
          </div>

          <div className="fps-tr">
            <div className="fps-minimap">
              <div className="mm-cap">Hall map</div>
              <FpsMinimap worldRef={worldRef} />
            </div>
          </div>

          <div className="fps-controls">
            <div className="cl-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Walk</div>
            <div className="cl-row">{locked ? <span><kbd>Mouse</kbd> Look · <kbd>Shift</kbd> Run</span> : <span><kbd>Drag</kbd> Look · <kbd>Shift</kbd> Run</span>}</div>
            <div className="cl-row"><kbd>E</kbd> Enter booth{locked ? <span> · <kbd>Esc</kbd> Release</span> : null}</div>
          </div>

          {showLookHint && (
            <div className="fps-look-hint"><Ico name="walk" size={13} /> Drag to look around · click to capture the mouse</div>
          )}

          {nearBrand && (
            <div className="fps-prompt">
              <span className="pr-mk" style={{ background: nearCfg.accent }}>{nearBrand.name[0]}</span>
              <span>
                <div className="pr-mono">{nearCfg.kicker} · {nearBrand.loc}</div>
                <div className="pr-nm">{nearBrand.name}</div>
              </span>
              <button className="pr-go" onClick={() => { enteredRef.current = near.brandId; setEntered(near.brandId); worldRef.current.pause(); }}>
                Enter booth <kbd>E</kbd>
              </button>
            </div>
          )}
        </div>
      )}

      {ready && showStart && (
        <div className={'fps-start' + (started ? ' resume' : '')} onClick={begin}>
          <div className="st-eyebrow">The Floor · First-person walkthrough</div>
          <h1>{started ? 'Click to keep exploring' : 'Walk the trade floor.'}</h1>
          <p>{started ? 'Your place is saved. Click to take control again.' : 'A full convention hall in first person. Roam the aisles, read the signage, and step into any brand’s booth.'}</p>
          {!started && (
            <div className="st-keys">
              <div className="st-key"><div className="kk"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><span>Move</span></div>
              <div className="st-key"><div className="kk"><kbd>Mouse</kbd></div><span>Look</span></div>
              <div className="st-key"><div className="kk"><kbd>E</kbd></div><span>Enter booth</span></div>
            </div>
          )}
          <button className="st-go" onClick={begin}><Ico name="walk" size={18} /> {started ? 'Resume' : 'Enter the hall'}</button>
        </div>
      )}

      {entered && (
        <div className="fps-showroom">
          <Showroom mode="visit" initialBrandId={entered} onExit={exitBooth} exitLabel="Back to the hall" />
        </div>
      )}
    </div>
  );
}
