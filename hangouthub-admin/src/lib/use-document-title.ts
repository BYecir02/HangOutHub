import { useEffect } from 'react';

const BASE = 'HangOutHub Admin';

/** Met à jour le titre de l'onglet : « <title> · HangOutHub Admin ». */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : BASE;
  }, [title]);
}
