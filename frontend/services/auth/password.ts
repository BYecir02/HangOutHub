import api from '@/services/api';

// Changement de mot de passe pour l'utilisateur connecte (exige le mot de passe
// actuel cote serveur).
export async function changePassword(
  currentPassword: string,
  password: string,
): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, password });
}
