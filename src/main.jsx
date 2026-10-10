import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import { actions } from './data/store.js';
import { RetailerApp } from './retailer/RetailerApp.jsx';
import { BrandApp } from './brand/BrandApp.jsx';
import {
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakButton,
} from './dev/tweaks.jsx';

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = {
  accent: 'oklch(0.42 0.15 280)',
  catalogLayout: 'index',   // image-forward feed — the default shopping view
  density: 'regular',
};

const ACCENTS = [
  'oklch(0.42 0.15 280)', // indigo
  'oklch(0.40 0.13 25)',  // oxblood
  'oklch(0.42 0.10 155)', // forest
  'oklch(0.32 0.025 270)', // ink
];
const DENSITY = { compact: 0.72, regular: 1, comfy: 1.35 };

// Design-exploration panel; enable with ?dev in the URL.
const DEV = new URLSearchParams(window.location.search).has('dev');

function Root() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // Demo device: in production this comes from the authenticated session
  // (a retailer login sees RetailerApp, a brand login sees BrandApp).
  const [role, setRole] = useState(() => localStorage.getItem('stockist:role') || 'retailer');

  useEffect(() => { localStorage.setItem('stockist:role', role); }, [role]);
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--accent', t.accent);
    r.style.setProperty('--density', String(DENSITY[t.density] || 1));
  }, [t.accent, t.density]);

  return (
    <React.Fragment>
      {role === 'retailer'
        ? <RetailerApp key={'rt-' + t.catalogLayout} layout={t.catalogLayout} />
        : <BrandApp key="bd" />}

      {/* role switcher */}
      <div className="role-switch">
        <span className="rs-label">Viewing as</span>
        <button className={role === 'retailer' ? 'active' : ''} onClick={() => setRole('retailer')}>
          <span className="dot"></span>Retailer
        </button>
        <button className={role === 'brand' ? 'active' : ''} onClick={() => setRole('brand')}>
          <span className="dot"></span>Brand
        </button>
      </div>

      {DEV && (
        <TweaksPanel>
          <TweakSection label="Brand" />
          <TweakColor label="Accent" value={t.accent} options={ACCENTS}
            onChange={v => setTweak('accent', v)} />
          <TweakSection label="Retailer catalogue" />
          <TweakRadio label="Layout" value={t.catalogLayout}
            options={['index', 'editorial', 'gallery']}
            onChange={v => setTweak('catalogLayout', v)} />
          <TweakSection label="Brand dashboard" />
          <TweakRadio label="Density" value={t.density}
            options={['compact', 'regular', 'comfy']}
            onChange={v => setTweak('density', v)} />
          <TweakSection label="Demo data" />
          <TweakButton label="Reset orders & cart" onClick={() => actions.resetAll()} />
        </TweaksPanel>
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<Root />);
