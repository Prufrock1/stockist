import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import { actions, useStore } from './data/store.js';
import { currentSession, logout } from './data/api.js';
import { AuthScreen } from './auth/AuthScreen.jsx';
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

function Boot({ error, onRetry }) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
      background: 'var(--paper)', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)',
      fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', padding: 24 }}>
      {error ? (
        <div>
          <div style={{ marginBottom: 16 }}>{error}</div>
          <button className="btn btn-pri btn-sm" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }} onClick={onRetry}>Retry</button>
        </div>
      ) : 'Loading catalogue'}
    </div>
  );
}

function Root() {
  const s = useStore();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [gate, setGate] = useState('boot');
  const [bootError, setBootError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const session = await currentSession();
        if (cancel) return;
        if (!session) {
          setGate('auth');
          return;
        }
        const ok = await actions.hydrate(session);
        if (!cancel) setGate(ok ? 'app' : 'boot');
      } catch (err) {
        if (cancel) return;
        setBootError(err.message);
        setGate('boot');
      }
    })();
    return () => { cancel = true; };
  }, [attempt]);
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--accent', t.accent);
    r.style.setProperty('--density', String(DENSITY[t.density] || 1));
  }, [t.accent, t.density]);

  const enter = async (session) => {
    const ok = await actions.hydrate(session);
    if (ok) setGate('app');
  };

  const signOut = async () => {
    await logout();
    setGate('auth');
  };

  const signedIn = gate === 'app' && s.sessionRole;

  return (
    <React.Fragment>
      {gate === 'auth' ? <AuthScreen onSuccess={enter} />
        : !signedIn ? <Boot error={s.error || bootError} onRetry={() => setAttempt(n => n + 1)} />
        : s.sessionRole === 'brand'
          ? <BrandApp key="bd" onSignOut={signOut} />
          : <RetailerApp key={'rt-' + t.catalogLayout} layout={t.catalogLayout} onSignOut={signOut} />}

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
