/* ============================================================
   STOCKIST — shared UI primitives (icons, image placeholder)
   ============================================================ */
import React from 'react';

const ICONS = {
  cart:    'M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L21 8H6 M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
  search:  'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M21 21l-4.3-4.3',
  bag:     'M6 8V6a4 4 0 0 1 8 0v2 M4 8h12l1 12H3L4 8',
  box:     'M3 7.5 12 3l9 4.5v9L12 21 3 16.5v-9 M3 7.5 12 12l9-4.5 M12 12v9',
  truck:   'M3 6h11v9H3z M14 9h4l3 3v3h-7 M7 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M18 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  check:   'M5 12.5l4.5 4.5L19 7',
  chev:    'M5 8l5 5 5-5',
  chevR:   'M8 5l5 5-5 5',
  arrowL:  'M19 12H5 M11 18l-6-6 6-6',
  arrowR:  'M5 12h14 M13 6l6 6-6 6',
  plus:    'M12 5v14 M5 12h14',
  minus:   'M5 12h14',
  x:       'M6 6l12 12 M18 6L6 18',
  grid:    'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  rows:    'M4 6h16 M4 12h16 M4 18h16',
  gallery: 'M4 4h7v16H4z M13 4h7v16h-7z',
  layers:  'M12 3 3 8l9 5 9-5-9-5 M3 13l9 5 9-5 M3 18l9 5 9-5',
  pkg:     'M16 3H8L4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8l-4-5 M4 8h16 M10 12h4',
  clip:    'M9 4h6v2H9z M7 5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1 M9 11h6 M9 15h4',
  chart:   'M4 20V4 M4 20h16 M8 17v-5 M12 17V9 M16 17v-8',
  users:   'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M3 20a6 6 0 0 1 12 0 M16 6a3 3 0 0 1 0 6 M18 20a6 6 0 0 0-3-5.2',
  store:   'M4 9l1-5h14l1 5 M4 9v10h16V9 M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 M9 19v-5h6v5',
  tag:     'M3 12V4h8l9 9-8 8-9-9 M7 8a1 1 0 1 0 0-.01',
  gear:    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1A2 2 0 1 1 6.9 4.6l.1.1A1.6 1.6 0 0 0 9 4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8',
  spark:   'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  filter:  'M3 5h18l-7 8v5l-4 2v-7z',
  cal:     'M4 6h16v15H4z M4 10h16 M8 3v4 M16 3v4',
  sun:     'M12 4v2 M12 18v2 M4 12h2 M18 12h2 M6 6l1.5 1.5 M16.5 16.5 18 18 M6 18l1.5-1.5 M16.5 7.5 18 6 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  heart:   'M12 20s-7-4.5-9.5-9A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z',
  bolt:    'M13 2 4 14h7l-1 8 9-12h-7z',
  dot:     'M12 12a1 1 0 1 0 0-.01',
  external:'M14 4h6v6 M20 4l-9 9 M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5',
  chat:    'M4 5h16v11H9l-4 4V5z',
  map:     'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14',
  walk:    'M13 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M11 8l3-1 2 4 3 1 M11 8l-2 6 3 2 1 5 M9 14l-3 6',
  swatch:  'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M14.5 17.5a3 3 0 1 0 6 0 3 3 0 0 0-6 0',
};

export function Ico({ name, size = 18, stroke = 1.7, className = '', style }) {
  const d = ICONS[name] || '';
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {d.split(' M').map((seg, i) => <path key={i} d={(i ? 'M' : '') + seg} />)}
    </svg>
  );
}

// refined image placeholder
export function Ph({ tint, marks, cap, className = '', style = {}, showMark = true, onClick }) {
  return (
    <div className={'ph ' + className} onClick={onClick} style={{ '--ph-tint': tint, ...style }}>
      {showMark && marks && <div className="ph-mark" style={{ fontSize: 'clamp(28px, 5vw, 56px)' }}>{marks}</div>}
      {cap && <div className="ph-cap">{cap}</div>}
    </div>
  );
}
