import { useContext } from 'react';

import { ToastContext } from './context';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé dans <ToastProvider>.');
  }
  return ctx;
}
