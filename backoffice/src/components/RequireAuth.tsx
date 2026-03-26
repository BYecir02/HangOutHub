import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getSession } from '../lib/auth';

export default function RequireAuth() {
  const location = useLocation();
  const session = getSession();

  if (!session?.accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
