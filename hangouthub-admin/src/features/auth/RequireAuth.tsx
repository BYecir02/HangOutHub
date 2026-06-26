import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './useAuth';

/** Garde de route : redirige vers /login si non authentifié. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
