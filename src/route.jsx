import { useLocation, useNavigate, Navigate } from 'react-router';

export function homeFor(role) {
  return role === 'brand' ? '/studio' : '/';
}

export function isStudio(pathname) {
  return pathname === '/studio' || pathname.startsWith('/studio/');
}

export function isAuth(pathname) {
  return pathname === '/signin' || pathname.startsWith('/signup');
}

/** Console is hidden for 1.0; module kept under src/console/. */
export function isConsole(pathname) {
  return pathname === '/console' || pathname.startsWith('/console/');
}

/** Shop floor paths sellers may open to preview their public presence. */
export function isMarketplaceBrowse(pathname) {
  return pathname === '/'
    || pathname.startsWith('/products/')
    || pathname === '/brands'
    || pathname.startsWith('/brands/');
}

/** Catalogue browse is public; auth screens too. Orders/studio need a session. */
export function isPublicBrowse(pathname) {
  return isMarketplaceBrowse(pathname)
    || isAuth(pathname)
    || isConsole(pathname);
}

/** @deprecated use isPublicBrowse — kept for any leftover imports */
export function isPublic(pathname) {
  return isPublicBrowse(pathname);
}

/** Keep ?dev; drop one-shot auth hints like ?as=buyer. */
export function persistSearch(search) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  params.delete('as');
  const out = params.toString();
  return out ? `?${out}` : '';
}

/** Where a signed-in account should land, keeping ?dev and the page they asked for. */
export function destinationFor(role, from, search) {
  const path = from?.pathname || '';
  const nextSearch = persistSearch(from?.search || search || '');
  const ok = role === 'brand'
    ? isStudio(path) || isMarketplaceBrowse(path)
    : Boolean(path) && path !== '/' && !isStudio(path) && !isAuth(path) && !isConsole(path);
  if (ok) return { pathname: path, search: nextSearch };
  return { pathname: homeFor(role), search: nextSearch };
}

export function useGo() {
  const navigate = useNavigate();
  const { search } = useLocation();
  return (pathname, options) => navigate({ pathname, search }, options);
}

export function KeepSearch({ to }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
}
