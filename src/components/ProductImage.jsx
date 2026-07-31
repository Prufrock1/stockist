/* ============================================================
   STOCKIST — product image
   Renders a product shot, falling back to the tonal `Ph` block if
   the fetch fails — so a missing photo degrades to exactly the
   placeholder the design ships.
   ============================================================ */
import React from 'react';
import { Ph } from './ui.jsx';

export function ProdImg({ src, p, className, alt }) {
  const [err, setErr] = React.useState(false);
  React.useEffect(() => { setErr(false); }, [src]);
  if (err || !src) return <Ph className={className} tint={p.tint} marks={p.marks} showMark={false} cap="" />;
  return <img className={className} src={src} alt={alt || p.name} loading="lazy" onError={() => setErr(true)} />;
}
