import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // Désactivé : dans un back-office plein de formulaires, un refetch au
      // retour de focus (ex. après le sélecteur de fichier) casse l'édition
      // en cours (éditeur d'images réinitialisé, form re-synchronisé).
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Pas de retry sur les erreurs d'auth/permission.
        if (isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 401 || status === 403 || status === 404) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
