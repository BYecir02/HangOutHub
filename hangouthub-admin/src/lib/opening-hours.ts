export type TimeRange = { open: string; close: string };

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Horaires structurés par jour. Tableau vide ou jour absent = fermé. */
export type WeeklyHours = Partial<Record<DayKey, TimeRange[]>>;

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Lundi' },
  { key: 'tue', label: 'Mardi' },
  { key: 'wed', label: 'Mercredi' },
  { key: 'thu', label: 'Jeudi' },
  { key: 'fri', label: 'Vendredi' },
  { key: 'sat', label: 'Samedi' },
  { key: 'sun', label: 'Dimanche' },
];

export const DEFAULT_RANGE: TimeRange = { open: '09:00', close: '18:00' };
