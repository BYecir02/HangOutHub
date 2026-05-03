import React, { createContext, useContext, type ReactNode } from 'react';

export type AuthBootstrapStatus = 'loading' | 'unauthenticated' | 'authenticated';

export type AuthBootstrapState = {
  status: AuthBootstrapStatus;
  targetHref: string | null;
};

const AuthBootstrapContext = createContext<AuthBootstrapState>({
  status: 'loading',
  targetHref: null,
});

export function AuthBootstrapProvider({
  value,
  children,
}: {
  value: AuthBootstrapState;
  children: ReactNode;
}) {
  return (
    <AuthBootstrapContext.Provider value={value}>
      {children}
    </AuthBootstrapContext.Provider>
  );
}

export function useAuthBootstrap() {
  return useContext(AuthBootstrapContext);
}
