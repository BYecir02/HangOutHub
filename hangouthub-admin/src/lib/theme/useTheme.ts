import { useContext } from 'react';

import { ThemeContext } from './context';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme doit être utilisé dans <ThemeProvider>.');
  }
  return ctx;
}
