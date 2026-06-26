import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value?: string | Date | null): string {
  const date = toDate(value);
  return date ? format(date, 'dd MMM yyyy', { locale: fr }) : '—';
}

export function formatDateTime(value?: string | Date | null): string {
  const date = toDate(value);
  return date ? format(date, 'dd MMM yyyy · HH:mm', { locale: fr }) : '—';
}

export function formatRelative(value?: string | Date | null): string {
  const date = toDate(value);
  return date
    ? formatDistanceToNow(date, { addSuffix: true, locale: fr })
    : '—';
}

/** Convertit une date ISO en valeur pour <input type="datetime-local"> (heure locale). */
export function toDateTimeLocalValue(value?: string | Date | null): string {
  const date = toDate(value);
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Convertit une valeur datetime-local (heure locale) en ISO, ou undefined si vide/invalide. */
export function fromDateTimeLocalValue(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
