/* ============================================================
   STOCKIST — trade-floor presentation switcher
   One directory, four viewpoints. Rendered by each floor view so
   it can be hidden while you're inside a booth.
   ============================================================ */
import React from 'react';
import { Ico } from '../components/ui.jsx';

export const FLOOR_MODES = [
  { id: 'map',    label: 'Map',          icon: 'map',   title: 'Overhead floor plan' },
  { id: 'aisles', label: 'Aisles',       icon: 'store', title: 'Walk the centre aisle' },
  { id: 'fps',    label: 'First person', icon: 'walk',  title: 'Free-roam the hall in 3D' },
  { id: 'wander', label: 'Wander',       icon: 'swatch',title: 'Top-down, walk anywhere' },
];

export function FloorSwitch({ mode, onChange, offset = 'nav' }) {
  return (
    <div className={'fl-switch fl-' + offset} role="tablist" aria-label="Trade floor view">
      {FLOOR_MODES.map(m => (
        <button key={m.id} role="tab" aria-selected={mode === m.id} title={m.title}
          className={'fl-seg' + (mode === m.id ? ' on' : '')}
          onClick={() => onChange(m.id)}>
          <Ico name={m.icon} size={14} />
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
