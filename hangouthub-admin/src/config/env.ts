/**
 * Configuration d'environnement centralisée et typée.
 * Toute lecture de `import.meta.env` passe par ici.
 */
const rawApiUrl = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000';

export const env = {
  /** URL de base du backend, sans slash final ni suffixe /api/v1. */
  apiBaseUrl: rawApiUrl.replace(/\/+$/, ''),
  /** Préfixe d'API du backend NestJS. */
  apiPrefix: '/api/v1',
} as const;

/** URL complète de l'API (base + préfixe). */
export const API_URL = `${env.apiBaseUrl}${env.apiPrefix}`;
