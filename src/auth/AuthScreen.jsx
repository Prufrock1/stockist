import React from 'react';
import { login, signup } from '../data/api.js';

const { useState } = React;

const fieldStyle = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12,
  border: '1px solid var(--line-2)', background: 'var(--card)', color: 'var(--ink)', font: 'inherit',
};

const KINDS = {
  retailer: {
    title: 'Open a buyer account',
    lead: 'Buy wholesale from the floor. Orders you place go to the sellers.',
    name: 'Shop name',
    submit: 'Create buyer account',
  },
  brand: {
    title: 'Open a seller account',
    lead: 'Run the studio. Incoming wholesale orders land in your queue.',
    name: 'Studio name',
    submit: 'Create seller account',
  },
};

function Field({ label, ...props }) {
  return (
    <label style={{ display: 'block', marginTop: 14 }}>
      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>{label}</span>
      <input {...props} style={fieldStyle} />
    </label>
  );
}

export function AuthScreen({ onSuccess }) {
  const [view, setView] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const reset = (next) => {
    setView(next);
    setError(null);
    setPassword('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const session = view === 'signin'
        ? await login({ email, password })
        : await signup({ role: view, name, email, password });
      await onSuccess(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  const kind = KINDS[view];

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--paper)', padding: 24 }}>
      <form onSubmit={submit} style={{ width: 420, maxWidth: '100%' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>STOCKIST</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.03em', fontSize: 36, margin: '10px 0 8px' }}>
          {view === 'signin' ? 'Sign in' : kind.title}
        </h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.5, marginTop: 0 }}>
          {view === 'signin'
            ? 'Buyers shop the floor. Sellers run the order queue.'
            : kind.lead}
        </p>

        {view !== 'signin' && (
          <Field label={kind.name} value={name} required autoComplete="organization"
            onChange={event => setName(event.target.value)} />
        )}
        <Field label="Email" type="email" value={email} required autoComplete="email"
          onChange={event => setEmail(event.target.value)} />
        <Field label="Password" type="password" value={password} required minLength={view === 'signin' ? 1 : 8}
          autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
          onChange={event => setPassword(event.target.value)} />

        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</div>}

        <button className="btn-fill" type="submit" disabled={pending} style={{ width: '100%', marginTop: 16 }}>
          {pending ? 'Please wait…' : view === 'signin' ? 'Sign in' : kind.submit}
        </button>

        {view === 'signin' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
            <button type="button" className="btn-line" onClick={() => reset('retailer')}>Create a buyer account</button>
            <button type="button" className="btn-line" onClick={() => reset('brand')}>Create a seller account</button>
          </div>
        ) : (
          <button type="button" onClick={() => reset('signin')}
            style={{ marginTop: 16, background: 'none', border: 0, color: 'var(--ink-2)', font: 'inherit', cursor: 'pointer' }}>
            Already have an account? Sign in
          </button>
        )}

        {import.meta.env.DEV && view === 'signin' && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 18, lineHeight: 1.6 }}>
            Sample buyer: maison@stockist.test / maison<br />
            Sample sellers: verre@stockist.test / verre · nord@stockist.test / nord
          </p>
        )}
      </form>
    </div>
  );
}
