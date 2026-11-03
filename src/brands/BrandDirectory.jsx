/* Public brand directory + bio pages — marketplace preview for sellers too. */
import React from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { BRANDS, PRODUCTS, brandById, money } from '../data/store.js';
import { Ico } from '../components/ui.jsx';
import { ProdImg } from '../components/ProductImage.jsx';
import { productImage } from '../data/images.js';
import './brands.css';

export function BrandsIndex() {
  const { search } = useLocation();
  const rows = BRANDS.map(brand => {
    const skus = PRODUCTS.filter(p => p.b === brand.id);
    return { brand, count: skus.length };
  });

  return (
    <div className="br role-stage">
      <div className="br-hero">
        <div className="br-kicker mono-label">Brand directory</div>
        <h1>Independent makers on the floor</h1>
        <p>Browse studios, read their story, then order from their line.</p>
      </div>

      {rows.length === 0 ? (
        <div className="br-empty">No brands on the floor yet.</div>
      ) : (
        <div className="br-grid">
          {rows.map(({ brand, count }) => (
            <Link key={brand.id} className="br-card" to={{ pathname: `/brands/${brand.id}`, search }}>
              <div className="br-card-mark">{(brand.name || '?').slice(0, 1)}</div>
              <div className="br-card-body">
                <div className="br-card-name">{brand.name}</div>
                <div className="br-card-meta">
                  {[brand.category, brand.loc].filter(Boolean).join(' · ') || 'Wholesale brand'}
                </div>
                {brand.tagline ? <div className="br-card-tag">{brand.tagline}</div> : null}
                <div className="br-card-count">{count} {count === 1 ? 'product' : 'products'}</div>
              </div>
              <Ico name="arrowR" size={16} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function BrandBioPage() {
  const { id } = useParams();
  const { search } = useLocation();
  const brand = brandById(id);
  const products = PRODUCTS.filter(p => p.b === id);

  if (!brand) {
    return (
      <div className="br role-stage">
        <div className="br-missing">
          <h1>Brand not on the floor</h1>
          <Link className="btn-line" to={{ pathname: '/brands', search }}>Back to directory</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="br role-stage">
      <Link className="br-back" to={{ pathname: '/brands', search }}>
        <Ico name="arrowL" size={14} /> Brand directory
      </Link>

      <header className="br-bio-hero">
        <div className="br-bio-mark">{brand.name.slice(0, 1)}</div>
        <div>
          <div className="br-kicker mono-label">{[brand.category, brand.loc].filter(Boolean).join(' · ') || 'Wholesale brand'}</div>
          <h1>{brand.name}</h1>
          {brand.tagline ? <p className="br-bio-tag">{brand.tagline}</p> : null}
        </div>
      </header>

      {brand.bio ? (
        <div className="br-bio-copy">{brand.bio}</div>
      ) : (
        <div className="br-bio-copy muted">This studio has not added a bio yet.</div>
      )}

      <section className="br-line">
        <div className="br-line-h">
          <h2>On the floor</h2>
          <span className="mono-label">{products.length} {products.length === 1 ? 'SKU' : 'SKUs'}</span>
        </div>
        {products.length === 0 ? (
          <div className="br-empty">No products listed yet.</div>
        ) : (
          <div className="br-products">
            {products.map(p => (
              <Link key={p.id} className="br-product" to={{ pathname: `/products/${p.id}`, search }}>
                <ProdImg className="br-product-img" src={productImage(p)} p={p} />
                <div className="br-product-name">{p.name}</div>
                <div className="br-product-price">{money(p.wp)} <span>/ {p.unit}</span></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
