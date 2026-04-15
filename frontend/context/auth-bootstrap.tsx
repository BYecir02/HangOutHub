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

type AuthBootstrapResetListener = () => void;

const authBootstrapResetListeners = new Set<AuthBootstrapResetListener>();

export function subscribeAuthBootstrapReset(listener: AuthBootstrapResetListener) {
  authBootstrapResetListeners.add(listener);

  return () => {
    authBootstrapResetListeners.delete(listener);
  };
}

export function notifyAuthBootstrapReset() {
  for (const listener of authBootstrapResetListeners) {
    try {
      listener();
    } catch {
      // Ignore listener failures during auth teardown.
    }
  }
}

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