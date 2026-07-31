/* ============================================================
   BOOTH EDITOR — brand customizes its showroom (live preview)
   Docks left inside the showroom when mode="edit".
   ============================================================ */
import React from 'react';
import { PRODUCTS, brandById, useStore, actions, store, getBooth, BOOTH_ACCENTS, FLOOR_FINISHES, WALL_FINISHES, BOOTH_LAYOUTS, FINISH_LABELS } from '../data/store.js';
import { Ico } from '../components/ui.jsx';

function BeSeg({ label, value, options, labels, onChange, swatches }) {
  return (
    <div className="be-field">
      <div className="be-label">{label}</div>
      <div className="be-seg">
        {options.map(o => (
          <button key={o} className={'be-segb' + (value === o ? ' on' : '')} onClick={() => onChange(o)}>
            {swatches && <span className="be-dot" style={{ background: o }} />}
            {labels ? labels(o) : o}
          </button>
        ))}
      </div>
    </div>
  );
}

function BeSwatches({ value, options, onChange }) {
  return (
    <div className="be-field">
      <div className="be-label">Booth accent</div>
      <div className="be-swatches">
        {options.map(o => (
          <button key={o} className={'be-sw' + (value === o ? ' on' : '')} style={{ background: o }}
            onClick={() => onChange(o)} title={o}>
            {value === o && <Ico name="check" size={13} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function BeSelect({ value, options, onChange }) {
  return (
    <select className="be-select" value={value || ''} onChange={e => onChange(e.target.value)}>
      {options.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}

export function BoothEditor({ brandId }) {
  useStore(); // re-render on store changes
  const cfg = getBooth(brandId);
  const brand = brandById(brandId);
  const skus = PRODUCTS.filter(p => p.b === brandId);
  const FINISH = FINISH_LABELS;
  const set = (patch) => actions.updateBooth(brandId, patch);

  const isDefault = !(store.getState().booths || {})[brandId];

  const setPlinth = (i, id) => {
    const arr = [...(cfg.plinthIds || [])];
    arr[i] = id;
    set({ plinthIds: arr });
  };

  return (
    <div className="be-panel">
      <div className="be-head">
        <div>
          <div className="be-eyebrow"><span className="be-live" /> Live booth editor</div>
          <div className="be-title">{brand.name}</div>
        </div>
        <button className="be-reset" disabled={isDefault} onClick={() => actions.resetBooth(brandId)}>Reset</button>
      </div>

      <div className="be-body">
        <BeSwatches value={cfg.accent} options={BOOTH_ACCENTS} onChange={v => set({ accent: v })} />

        <div className="be-sec">Finishes</div>
        <BeSeg label="Floor" value={cfg.floor} options={FLOOR_FINISHES}
          labels={o => FINISH[o]} onChange={v => set({ floor: v })} />
        <BeSeg label="Walls" value={cfg.wall} options={WALL_FINISHES}
          labels={o => FINISH[o]} onChange={v => set({ wall: v })} />

        <div className="be-sec">Layout</div>
        <BeSeg label="Floor plan" value={cfg.layout} options={BOOTH_LAYOUTS}
          labels={o => FINISH[o]} onChange={v => set({ layout: v })} />

        <div className="be-sec">Signage</div>
        <div className="be-field">
          <div className="be-label">Kicker</div>
          <input className="be-input" value={cfg.kicker} maxLength={28}
            onChange={e => set({ kicker: e.target.value })} placeholder="e.g. Food & Drink" />
        </div>
        <div className="be-field">
          <div className="be-label">Tagline</div>
          <textarea className="be-input be-ta" value={cfg.tagline} maxLength={90} rows={2}
            onChange={e => set({ tagline: e.target.value })} placeholder="One line about the brand" />
        </div>

        <div className="be-sec">Featured product (back wall)</div>
        <div className="be-field">
          <BeSelect value={cfg.heroId} options={skus} onChange={v => set({ heroId: v })} />
        </div>

        <div className="be-sec">Hero plinths</div>
        {[0, 1, 2].map(i => (
          <div className="be-field be-plinth" key={i}>
            <div className="be-label">No. 0{i + 1}</div>
            <BeSelect value={(cfg.plinthIds || [])[i]} options={skus} onChange={id => setPlinth(i, id)} />
          </div>
        ))}
      </div>

      <div className="be-foot">
        <Ico name="check" size={13} /> Saved automatically · retailers see this on the trade floor
      </div>
    </div>
  );
}
