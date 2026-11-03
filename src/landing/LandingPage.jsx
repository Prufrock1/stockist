/* Public homepage — unlocked entry. Buyer/seller CTAs go to auth. */
import React from 'react';
import { Link, useLocation } from 'react-router';
import './landing.css';

export function LandingPage() {
  const { search } = useLocation();
  const q = (as) => ({ pathname: '/signin', search: withAs(search, as) });
  const signup = (path) => ({ pathname: path, search });

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-brand">STOCKIST</div>
        <Link className="lp-nav-link" to={q('buyer')}>Sign in</Link>
      </header>

      <section className="lp-hero" aria-label="Welcome">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">Wholesale marketplace</p>
          <h1 className="lp-wordmark">STOCKIST</h1>
          <p className="lp-lead">
            Independent brands sell to independent shops — one floor, one order, clear fulfilment.
          </p>
          <div className="lp-ctas">
            <Link className="btn-fill lp-cta" to={q('buyer')}>
              Sign in as a buyer
            </Link>
            <Link className="btn-line lp-cta" to={q('seller')}>
              Sign in as a seller
            </Link>
          </div>
          <p className="lp-sublinks">
            New here?{' '}
            <Link to={signup('/signup/buyer')}>Create a buyer account</Link>
            {' · '}
            <Link to={signup('/signup/seller')}>Create a seller account</Link>
          </p>
        </div>
        <div className="lp-hero-visual" aria-hidden="true">
          <div className="lp-panel lp-panel-a">
            <span className="lp-panel-kicker">Buyer</span>
            <span className="lp-panel-title">Shop the floor</span>
            <span className="lp-panel-note">Catalogue · cart · orders</span>
          </div>
          <div className="lp-panel lp-panel-b">
            <span className="lp-panel-kicker">Seller</span>
            <span className="lp-panel-title">Run the studio</span>
            <span className="lp-panel-note">Products · queue · insights</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function withAs(search, as) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.set('as', as);
  const out = params.toString();
  return out ? `?${out}` : '';
}
