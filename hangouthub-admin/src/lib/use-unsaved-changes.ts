import { useEffect } from 'react';

/**
 * Avertit avant de fermer/recharger l'onglet quand `when` est vrai
 * (modifications de formulaire non enregistrées).
 */
export function useUnsavedChanges(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
}
