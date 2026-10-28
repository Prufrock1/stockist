import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import { actions, useStore } from './data/store.js';
import { currentSession, demoLogin, login, logout } from './data/api.js';
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

function LoginScreen({ initialRole, serverError, onSubmit }) {
  const [picked, setPicked] = useState(initialRole);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(serverError || null);
  const [pending, setPending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try { await onSubmit(picked, password); }
    catch (err) { setError(err.message); }
    finally { setPending(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--paper)', padding: 24 }}>
      <form onSubmit={submit} style={{ width: 380, maxWidth: '100%' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>STOCKIST</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.03em', fontSize: 36, margin: '10px 0 8px' }}>Sign in</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.5, marginTop: 0 }}>
          Trade account for the wholesale floor.
        </p>
        <div style={{ display: 'flex', gap: 8, margin: '18px 0' }}>
          {[['retailer', 'Retailer'], ['brand', 'Brand']].map(([id, label]) => (
            <button type="button" key={id} onClick={() => setPicked(id)}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 999, cursor: 'pointer',
                border: '1px solid ' + (picked === id ? 'var(--ink)' : 'var(--line)'),
                background: picked === id ? 'var(--ink)' : 'transparent',
                color: picked === id ? 'var(--paper)' : 'var(--ink)', font: 'inherit', fontWeight: 600 }}>
              {label}
            </button>
          ))}
        </div>
        <input type="password" value={password} required placeholder="Password" autoComplete="current-password"
          onChange={event => setPassword(event.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
            border: '1px solid var(--line-2)', background: 'var(--card)', color: 'var(--ink)', font: 'inherit' }} />
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</div>}
        <button className="btn-fill" type="submit" disabled={pending} style={{ width: '100%', marginTop: 16 }}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
        {import.meta.env.DEV && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 14 }}>
            Dev passwords: maison for the retailer, verre for the brand.
          </p>
        )}
      </form>
    </div>
  );
}

function Root() {
  const s = useStore();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [role, setRole] = useState(() => localStorage.getItem('stockist:role') || 'retailer');
  const [gate, setGate] = useState('boot');
  const [loginError, setLoginError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { localStorage.setItem('stockist:role', role); }, [role]);
  useEffect(() => {
    let cancel = false;
    setGate('boot');
    (async () => {
      try {
        let session = await currentSession();
        if (cancel) return;
        if (demoLogin && (!session || session.role !== role)) session = await login({ role });
        if (cancel) return;
        if (!session || session.role !== role) {
          setGate('login');
          return;
        }
        const ok = await actions.hydrate(session);
        if (!cancel) setGate(ok ? 'app' : 'boot');
      } catch (err) {
        if (cancel) return;
        setLoginError(err.message);
        setGate(demoLogin ? 'boot' : 'login');
      }
    })();
    return () => { cancel = true; };
  }, [role, attempt]);
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--accent', t.accent);
    r.style.setProperty('--density', String(DENSITY[t.density] || 1));
  }, [t.accent, t.density]);

  const signIn = async (nextRole, password) => {
    const session = await login({ role: nextRole, password });
    if (nextRole !== role) setRole(nextRole);
    else {
      const ok = await actions.hydrate(session);
      if (ok) setGate('app');
    }
  };

  const signOut = async () => {
    await logout();
    setGate('login');
  };

  return (
    <React.Fragment>
      {gate === 'login' ? <LoginScreen initialRole={role} serverError={loginError} onSubmit={signIn} />
        : gate !== 'app' ? <Boot error={s.error || loginError} onRetry={() => setAttempt(n => n + 1)} />
        : role === 'retailer'
          ? <RetailerApp key={'rt-' + t.catalogLayout} layout={t.catalogLayout} />
          : <BrandApp key="bd" />}

      {gate === 'app' && demoLogin && (
        <div className="role-switch">
          <span className="rs-label">Viewing as</span>
          <button className={role === 'retailer' ? 'active' : ''} onClick={() => setRole('retailer')}>
            <span className="dot"></span>Retailer
          </button>
          <button className={role === 'brand' ? 'active' : ''} onClick={() => setRole('brand')}>
            <span className="dot"></span>Brand
          </button>
        </div>
      )}
      {gate === 'app' && !demoLogin && (
        <div className="role-switch">
          <span className="rs-label">{s.retailer}</span>
          <button onClick={signOut}>Log out</button>
        </div>
      )}

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
