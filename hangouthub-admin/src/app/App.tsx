import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { ConfirmProvider } from '@/lib/confirm/ConfirmProvider';
import { queryClient } from '@/lib/query/queryClient';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { ToastProvider } from '@/lib/toast/ToastProvider';
import { AppRoutes } from './router';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
