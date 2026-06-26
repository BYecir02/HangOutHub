import { isAxiosError } from 'axios';

/** Message d'erreur lisible à partir d'une erreur d'API/réseau. */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Une erreur inattendue est survenue.',
): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) return 'Connexion impossible. Vérifie le réseau ou l’URL de l’API.';

  const message = (error.response.data as { message?: string | string[] } | undefined)
    ?.message;

  if (Array.isArray(message)) return message[0] || fallback;
  if (typeof message === 'string') return message;
  return fallback;
}
