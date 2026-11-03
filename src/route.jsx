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

/** Unauthenticated surfaces (landing + auth). Everything else needs a session. */
export function isPublic(pathname) {
  return pathname === '/' || isAuth(pathname);
}

/** Console is hidden for 1.0; module kept under src/console/. */
export function isConsole(pathname) {
  return pathname === '/console' || pathname.startsWith('/console/');
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
    ? isStudio(path)
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
