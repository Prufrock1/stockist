import React from 'react';
import { productById, brandById, money, useStore, actions, orderLines, orderSubtotal, orderUnits } from '../data/store.js';
import { productImage } from '../data/images.js';
import { ProdImg } from '../components/ProductImage.jsx';
import { Ico, Ph } from '../components/ui.jsx';

/* ============================================================
   RETAILER — flow views: PDP · cart drawer · confirm · orders
   ============================================================ */

const TRACK = ['Placed', 'Packing', 'Shipped', 'Delivered'];

function trackIndex(status) {
  if (status === 'packing') return 1;
  if (status === 'shipped') return 2;
  return 0;
}

// ---------- Product detail ----------
export function ProductDetail({ id, onBack, onAdded, openBrand }) {
  const p = productById(id);
  const [qty, setQty] = React.useState(p ? p.moq : 1);
  const [shot, setShot] = React.useState(0);
  if (!p) {
    return (
      <div className="rt-pdp role-stage" style={{ padding: '48px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.03em' }}>Product not on the floor</h1>
        <button className="btn-line" onClick={onBack}>Back to the shop</button>
      </div>
    );
  }
  const brand = brandById(p.b);
  const margin = Math.round((1 - p.wp / p.rrp) * 100);

  const commit = () => { actions.addToCart(id, qty); onAdded(); };

  return (
    <div className="rt-pdp role-stage">
      <div className="rt-back" onClick={onBack}><Ico name="arrowL" size={14} /> Back to catalogue</div>
      <div className="rt-pdp-grid">
        <div className="rt-gallery">
          <Ph className="g-main" tint={p.tint} marks={p.marks} cap={`product shot · ${shot + 1}/4`} />
          <div className="g-thumbs">
            {[0,1,2,3].map(i => (
              <Ph key={i} tint={p.tint} marks="" showMark={false} cap="" onClick={() => setShot(i)}
                style={{ outline: i === shot ? '1.5px solid var(--ink)' : '1px solid var(--line)' }} />
            ))}
          </div>
        </div>

        <div className="rt-pdp-info">
          <div className="rt-pdp-brand" onClick={openBrand} style={{ cursor: 'pointer' }}>
            <Ico name="store" size={13} /> {brand.name}{brand.loc ? ` · ${brand.loc}` : ''}
          </div>
          <h1>{p.name}</h1>
          <p className="rt-pdp-desc">{p.blurb}</p>

          <div className="rt-priceblock">
            <div className="wp">{money(p.wp)} <span className="pu">/ {p.unit}</span></div>
            <div className="rrp">RRP {money(p.rrp)}</div>
          </div>
          <div className="rt-margin">▲ {margin}% margin at recommended retail</div>

          <div className="rt-specs">
            <div className="rt-spec"><span className="sk">Category</span><span className="sv">{p.cat}</span></div>
            <div className="rt-spec"><span className="sk">Pack</span><span className="sv">{p.unit}</span></div>
            <div className="rt-spec"><span className="sk">Min. order</span><span className="sv">{p.moq} × {p.unit}</span></div>
            <div className="rt-spec"><span className="sk">Availability</span>
              <span className="sv">{p.stock < 20 ? <span style={{ color: 'var(--danger)' }}>Low — {p.stock} in stock</span> : `${p.stock} in stock`}</span></div>
            <div className="rt-spec"><span className="sk">Lead time</span><span className="sv">Ships in 3–5 days</span></div>
          </div>

          <div className="rt-qtyrow">
            <div className="qty">
              <button onClick={() => setQty(q => Math.max(p.moq, q - 1))}><Ico name="minus" size={16} /></button>
              <input value={qty} onChange={e => setQty(Math.max(p.moq, parseInt(e.target.value) || p.moq))} />
              <button onClick={() => setQty(q => q + 1)}><Ico name="plus" size={16} /></button>
            </div>
            <button className="btn-fill" onClick={commit}><Ico name="bag" size={16} /> Add to order · {money(p.wp * qty)}</button>
          </div>
          <div className="rt-moqnote"><Ico name="box" size={13} /> Minimum {p.moq} {p.unit}{p.moq > 1 ? 's' : ''} · {qty} selected = {qty * (parseInt(p.unit.replace(/\D/g, '')) || 1)} units</div>
        </div>
      </div>
    </div>
  );
}

// ---------- Cart drawer ----------
export function CartDrawer({ onClose, onPlaced, goCatalog }) {
  const s = useStore();
  React.useEffect(() => { document.body.classList.add('modal-open'); return () => document.body.classList.remove('modal-open'); }, []);
  const entries = Object.entries(s.cart);
  const lines = entries.map(([id, qty]) => ({ p: productById(id), qty })).filter(line => line.p);
  const subtotal = lines.reduce((a, l) => a + l.p.wp * l.qty, 0);
  const units = lines.reduce((a, l) => a + l.qty, 0);

  const [pending, setPending] = React.useState(false);
  const [orderError, setOrderError] = React.useState(null);
  const place = async () => {
    setOrderError(null);
    setPending(true);
    try {
      const oid = await actions.placeOrder();
      if (oid) onPlaced(oid);
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <React.Fragment>
      <div className="cart-scrim" onClick={onClose} />
      <div className="cart-drawer" role="dialog" aria-label="Your order">
        <div className="cart-h">
          <div className="ct">Your order</div>
          <button className="x-btn" onClick={onClose}><Ico name="x" size={16} /></button>
        </div>

        {lines.length === 0 ? (
          <div className="cart-empty">
            <div className="ce-mark">◍</div>
            <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Your order is empty</div>
            <div style={{ fontSize: 13.5, marginBottom: 22 }}>Add products from the catalogue to build a wholesale order.</div>
            <button className="btn-line" onClick={() => { onClose(); goCatalog(); }}>Browse catalogue</button>
          </div>
        ) : (
          <React.Fragment>
            <div className="cart-b">
              {lines.map(({ p, qty }) => (
                <div className="cart-line" key={p.id}>
                  <ProdImg className="cl-img" src={productImage(p)} p={p} />
                  <div className="cl-mid">
                    <div className="cl-brand">{brandById(p.b).name}</div>
                    <div className="cl-name">{p.name}</div>
                    <div className="cl-ctrls">
                      <div className="qty-sm">
                        <button onClick={() => actions.setQty(p.id, Math.max(p.moq, qty - 1))}><Ico name="minus" size={13} /></button>
                        <span>{qty}</span>
                        <button onClick={() => actions.setQty(p.id, qty + 1)}><Ico name="plus" size={13} /></button>
                      </div>
                      <span className="cl-remove" onClick={() => actions.removeFromCart(p.id)}>Remove</span>
                    </div>
                  </div>
                  <div className="cl-price">{money(p.wp * qty)}<div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', fontWeight: 400, marginTop: 4 }}>{qty} × {money(p.wp)}</div></div>
                </div>
              ))}
            </div>
            <div className="cart-f">
              <div className="cart-totals">
                <div className="tr"><span>{lines.length} product line{lines.length === 1 ? '' : 's'} · {units} units</span><span></span></div>
                <div className="tr"><span>Subtotal (wholesale)</span><span>{money(subtotal)}</span></div>
                <div className="tr"><span>Freight</span><span style={{ color: 'var(--ink-3)' }}>Billed at dispatch</span></div>
                <div className="tr grand"><span>Est. total</span><span>{money(subtotal)}</span></div>
              </div>
              {orderError && (
                <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{orderError}</div>
              )}
              <button className="btn-fill" style={{ width: '100%' }} onClick={place} disabled={pending}>
                {pending ? 'Placing order…' : 'Place order'} {!pending && <Ico name="arrowR" size={16} />}
              </button>
              <div style={{ textAlign: 'center', marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                NET-30 TERMS · APPROVED TRADE ACCOUNT
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </React.Fragment>
  );
}

// ---------- Confirmation ----------
export function Confirm({ orderId, goCatalog, goOrders }) {
  const s = useStore();
  const order = s.orders.find(o => o.id === orderId);
  if (!order) {
    return (
      <div className="rt-confirm role-stage">
        <h1>Order not found</h1>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-fill" onClick={goOrders}>View orders</button>
          <button className="btn-line" onClick={goCatalog}>Continue browsing</button>
        </div>
      </div>
    );
  }
  const subtotal = orderSubtotal(order);
  return (
    <div className="rt-confirm role-stage">
      <div className="cf-mark"><Ico name="check" size={30} /></div>
      <h1>Order placed</h1>
      <p>Thank you. Your wholesale order has been sent to the brands and is now in their fulfilment queue. You’ll be notified as each shipment is packed and dispatched.</p>
      <div className="cf-id">{order.id} · {orderUnits(order)} line items · {money(subtotal)}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn-fill" onClick={goOrders}>Track this order</button>
        <button className="btn-line" onClick={goCatalog}>Continue browsing</button>
      </div>
      <div className="cf-card">
        {(order.shipments || []).map(shipment => (
          <div key={shipment.id}>
            <div className="oc-ship-h" style={{ paddingTop: 12 }}>
              <span>{shipment.brandName}</span>
              <span className={'status ' + shipment.status}><span className="sd"></span>{shipment.status === 'new' ? 'Confirmed' : shipment.status}</span>
            </div>
            {orderLines({ items: shipment.items }).map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <Ph tint={l.product.tint} marks={l.product.marks} showMark={false} cap="" style={{ width: 40, height: 48, borderRadius: 'var(--r-sm)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{l.product.name}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{l.qty} × {money(l.product.wp)}</div>
                <div style={{ fontWeight: 600, width: 80, textAlign: 'right' }}>{money(l.lineTotal)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Orders (retailer) ----------
export function RetailerOrders({ goCatalog }) {
  const s = useStore();
  const orders = s.orders.filter(o => o.retailer === s.retailer);
  return (
    <div className="rt-orders role-stage">
      <h1>Orders</h1>
      <div style={{ color: 'var(--ink-2)', fontSize: 15, marginBottom: 8 }}>Track every wholesale order placed through your trade account.</div>
      {orders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--ink-3)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--line-2)', marginBottom: 12 }}>◍</div>
          <div style={{ marginBottom: 20 }}>No orders yet.</div>
          <button className="btn-line" onClick={goCatalog}>Browse catalogue</button>
        </div>
      )}
      {orders.map(o => {
        const lines = orderLines(o);
        const shipments = o.shipments || [];
        const shipped = shipments.filter(shipment => shipment.status === 'shipped').length;
        return (
          <div className="rt-ordercard" key={o.id}>
            <div className="oc-top">
              <div>
                <div className="oc-id">{o.id}</div>
                <div className="oc-meta">{new Date(o.placedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · {orderUnits(o)} line items · {money(orderSubtotal(o))}</div>
              </div>
              {shipments.length > 1 && <span className="oc-meta">{shipped} of {shipments.length} shipped</span>}
            </div>
            {shipments.map(shipment => {
              const idx = trackIndex(shipment.status);
              const shipmentLines = lines.filter(line => shipment.items.some(item => item.id === line.id));
              return (
                <div className="oc-ship" key={shipment.id}>
                  <div className="oc-ship-h">
                    <span>{shipment.brandName}</span>
                    <span className={'status ' + shipment.status}><span className="sd"></span>{shipment.status === 'new' ? 'Confirmed' : shipment.status}</span>
                  </div>
                  <div className="oc-items">
                    {shipmentLines.map(l => <ProdImg key={l.id} className="oc-thumb" src={productImage(l.product)} p={l.product} />)}
                  </div>
                  <div className="rt-track">
                    {TRACK.map((t, i) => (
                      <div key={t} className={'flowstep ' + (i < idx ? 'done' : i === idx ? 'current' : '')}>
                        <div className="fdot">{i < idx ? <Ico name="check" size={13} /> : i + 1}</div>
                        <div className="fl">{t}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
