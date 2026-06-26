import { env } from '@/config/env';

/** Résout une URL média : les chemins /uploads/* sont servis par le backend. */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes('/uploads/')) {
    const path = url.substring(url.indexOf('/uploads/'));
    return `${env.apiBaseUrl}${path}`;
  }
  return url;
}
