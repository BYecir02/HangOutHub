import { createContext } from 'react';

import type { AdminUser } from './types';

export type AuthStatus = 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AdminUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
