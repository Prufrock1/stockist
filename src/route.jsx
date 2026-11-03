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

/** Where a signed-in account should land, keeping ?dev and the page they asked for. */
export function destinationFor(role, from, search) {
  const path = from?.pathname || '';
  const ok = role === 'brand'
    ? isStudio(path)
    : Boolean(path) && !isStudio(path) && !isAuth(path) && !isConsole(path);
  if (ok) return { pathname: path, search: from.search || search || '' };
  return { pathname: homeFor(role), search: search || '' };
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
