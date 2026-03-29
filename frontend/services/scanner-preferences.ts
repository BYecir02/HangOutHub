import { storage } from '@/services/api';

export type ScannerCameraFacing = 'back' | 'front';
export type ScannerTicketInfoMode = 'detailed' | 'compact';

export interface ScannerPreferences {
  continuousScan: boolean;
  defaultTorchEnabled: boolean;
  defaultCameraFacing: ScannerCameraFacing;
  ticketInfoMode: ScannerTicketInfoMode;
}

const SCANNER_PREFERENCES_KEY = 'organizer_scanner_preferences_v1';

const DEFAULT_SCANNER_PREFERENCES: ScannerPreferences = {
  continuousScan: false,
  defaultTorchEnabled: false,
  defaultCameraFacing: 'back',
  ticketInfoMode: 'detailed',
};

function normalizePreferences(
  value: Partial<ScannerPreferences> | null | undefined,
): ScannerPreferences {
  return {
    continuousScan:
      typeof value?.continuousScan === 'boolean'
        ? value.continuousScan
        : DEFAULT_SCANNER_PREFERENCES.continuousScan,
    defaultTorchEnabled:
      typeof value?.defaultTorchEnabled === 'boolean'
        ? value.defaultTorchEnabled
        : DEFAULT_SCANNER_PREFERENCES.defaultTorchEnabled,
    defaultCameraFacing:
      value?.defaultCameraFacing === 'front'
        ? 'front'
        : DEFAULT_SCANNER_PREFERENCES.defaultCameraFacing,
    ticketInfoMode:
      value?.ticketInfoMode === 'compact'
        ? 'compact'
        : DEFAULT_SCANNER_PREFERENCES.ticketInfoMode,
  };
}

export async function getScannerPreferences(): Promise<ScannerPreferences> {
  const raw = await storage.getItem(SCANNER_PREFERENCES_KEY);

  if (!raw) {
    return DEFAULT_SCANNER_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ScannerPreferences>;
    return normalizePreferences(parsed);
  } catch {
    return DEFAULT_SCANNER_PREFERENCES;
  }
}

export async function patchScannerPreferences(
  patch: Partial<ScannerPreferences>,
): Promise<ScannerPreferences> {
  const current = await getScannerPreferences();
  const merged = normalizePreferences({
    ...current,
    ...patch,
  });
  await storage.setItem(SCANNER_PREFERENCES_KEY, JSON.stringify(merged));
  return merged;
}

export async function resetScannerPreferences(): Promise<ScannerPreferences> {
  await storage.setItem(
    SCANNER_PREFERENCES_KEY,
    JSON.stringify(DEFAULT_SCANNER_PREFERENCES),
  );
  return DEFAULT_SCANNER_PREFERENCES;
}
