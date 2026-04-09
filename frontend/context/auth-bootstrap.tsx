import React, { createContext, useContext, type ReactNode } from 'react';
import type { Href } from 'expo-router';

export type AuthBootstrapStatus = 'loading' | 'unauthenticated' | 'authenticated';

export type AuthBootstrapState = {
  status: AuthBootstrapStatus;
  targetHref: Href | null;
};

const AuthBootstrapContext = createContext<AuthBootstrapState>({
  status: 'loading',
  targetHref: null,
});

type AuthBootstrapProviderProps = {
  value: AuthBootstrapState;
  children: ReactNode;
};

export function AuthBootstrapProvider({
  value,
  children,
}: AuthBootstrapProviderProps) {
  return (
    <AuthBootstrapContext.Provider value={value}>
      {children}
    </AuthBootstrapContext.Provider>
  );
}

export function useAuthBootstrap() {
  return useContext(AuthBootstrapContext);
}