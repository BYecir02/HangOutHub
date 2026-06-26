import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { authBus, tokenStore } from '@/lib/api/tokens';
import { loginRequest } from './auth.api';
import { AuthContext, type AuthStatus } from './context';
import type { AdminUser } from './types';

const ADMIN_ROLE = 'ADMIN';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() =>
    tokenStore.getUser<AdminUser>(),
  );
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.getAccess() && tokenStore.getUser<AdminUser>()
      ? 'authenticated'
      : 'unauthenticated',
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);

    // Garde-fou : seul un compte ADMIN peut accéder au back-office.
    if (data.user.role !== ADMIN_ROLE) {
      throw new Error('Accès réservé aux administrateurs.');
    }

    tokenStore.setSession(data.access_token, data.refresh_token, data.user);
    setUser(data.user);
    setStatus('authenticated');
  }, []);

  // Déconnexion forcée déclenchée par l'intercepteur (refresh échoué).
  useEffect(() => {
    return authBus.onForcedLogout(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
