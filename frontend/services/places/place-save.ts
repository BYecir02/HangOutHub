import api from '@/services/api';

// Bascule l'etat "sauvegarde" d'un lieu cote serveur. Renvoie l'etat resultant.
export async function togglePlaceSave(placeId: string): Promise<{ saved: boolean }> {
  const response = await api.post<{ saved: boolean }>(`/places/${placeId}/save`);
  return { saved: Boolean(response.data?.saved) };
}
