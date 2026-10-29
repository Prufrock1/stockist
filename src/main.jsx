import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import './styles/tokens.css';
import './retailer/retailer.css';
import { actions, useStore } from './data/store.js';
import { currentSession, logout } from './data/api.js';
import { AuthScreen } from './auth/AuthScreen.jsx';
import { destinationFor, isAuth, isStudio } from './route.jsx';
import {
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakButton,
} from './dev/tweaks.jsx';

const { useState, useEffect, Suspense } = React;

const RetailerApp = React.lazy(() => import('./retailer/RetailerApp.jsx').then(m => ({ default: m.RetailerApp })));
const BrandApp = React.lazy(() => import('./brand/BrandApp.jsx').then(m => ({ default: m.BrandApp })));

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

function Boot({ error, onRetry }) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
      background: 'var(--paper)', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)',
      fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', padding: 24 }}>
      {error ? (
        <div>
          <div style={{ marginBottom: 16 }}>{error}</div>
          <button className="btn-fill" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }} onClick={onRetry}>Retry</button>
        </div>
      ) : 'Loading catalogue'}
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AuthRoutes({ onSuccess }) {
  const location = useLocation();
  return (
    <Routes>
      <Route path="/signin" element={<AuthScreen view="signin" onSuccess={onSuccess} />} />
      <Route path="/signup/buyer" element={<AuthScreen view="retailer" onSuccess={onSuccess} />} />
      <Route path="/signup/seller" element={<AuthScreen view="brand" onSuccess={onSuccess} />} />
      <Route path="*" element={
        <Navigate to={{ pathname: '/signin', search: location.search }} state={{ from: location }} replace />
      } />
    </Routes>
  );
}

function SignedInRoutes({ role, layout, onSignOut }) {
  const location = useLocation();
  const { pathname, search } = location;

  if (isAuth(pathname)) {
    return <Navigate to={destinationFor(role, location.state?.from, search)} replace />;
  }
  if (role === 'brand') {
    if (!isStudio(pathname)) return <Navigate to={{ pathname: '/studio', search }} replace />;
    return (
      <Suspense fallback={<Boot />}>
        <BrandApp onSignOut={onSignOut} />
      </Suspense>
    );
  }
  if (isStudio(pathname)) return <Navigate to={{ pathname: '/', search }} replace />;
  return (
    <Suspense fallback={<Boot />}>
      <RetailerApp key={layout} layout={layout} onSignOut={onSignOut} />
    </Suspense>
  );
}

function Root() {
  const s = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const dev = new URLSearchParams(location.search).has('dev');
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
    navigate({ pathname: '/signin', search: location.search }, { replace: true });
  };

  const signedIn = gate === 'app' && s.sessionRole;

  return (
    <React.Fragment>
      <ScrollToTop />
      {gate === 'auth'
        ? <AuthRoutes onSuccess={enter} />
        : !signedIn
          ? <Boot error={s.error || bootError} onRetry={() => setAttempt(n => n + 1)} />
          : <SignedInRoutes role={s.sessionRole} layout={t.catalogLayout} onSignOut={signOut} />}

      {dev && (
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

ReactDOM.createRoot(document.getElementById('app')).render(
  <BrowserRouter>
    <Root />
  </BrowserRouter>,
);
