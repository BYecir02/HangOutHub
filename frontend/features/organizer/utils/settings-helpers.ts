import type { ScannerPreferences } from '@/services/organizer/scanner-preferences';

export const REMINDER_PRESETS = [1440, 180, 60] as const;

export const DEFAULT_SCANNER_PREFERENCES: ScannerPreferences = {
  continuousScan: false,
  defaultTorchEnabled: false,
  defaultCameraFacing: 'back',
  ticketInfoMode: 'detailed',
};

export function formatReminderOffset(offsetMin: number): string {
  if (offsetMin % 1440 === 0) {
    const days = offsetMin / 1440;
    return days === 1 ? '1 jour' : `${days} jours`;
  }

  if (offsetMin % 60 === 0) {
    const hours = offsetMin / 60;
    return hours === 1 ? '1 heure' : `${hours} heures`;
  }

  return `${offsetMin} min`;
}

export function normalizeReminderOffsets(offsets: number[]): number[] {
  return Array.from(
    new Set(offsets.filter((offset) => Number.isInteger(offset))),
  )
    .filter((offset) => offset >= 15 && offset <= 10080)
    .sort((a, b) => b - a)
    .slice(0, 3);
}
