import { isApiNetworkError, storage } from '@/services/api';
import api from '@/services/api';

export type ScannerVerificationStatus =
  | 'VALID_CHECKED_IN_NOW'
  | 'VALID_ALREADY_CHECKED_IN'
  | 'INVALID_CODE'
  | 'BOOKING_NOT_FOUND'
  | 'NOT_FOR_THIS_EVENT'
  | 'BOOKING_NOT_CONFIRMED'
  | 'EVENT_EXPIRED'
  | 'UNAUTHORIZED_SCANNER';

export interface ScannerVerificationResult {
  status: ScannerVerificationStatus;
  bookingId: string | null;
  eventId: string | null;
  attendee: {
    id: string;
    displayName: string | null;
    username: string | null;
  } | null;
  ticket: {
    ticketTypeId: string | null;
    ticketTypeName: string | null;
  } | null;
  checkedInAt: string | null;
  message: string;
}

interface VerifyScanPayload {
  code: string;
  eventId?: string;
  source?: 'ios' | 'android' | 'web';
}

export interface OfflineScanQueueItem {
  id: string;
  code: string;
  eventId: string;
  source: 'ios' | 'android' | 'web';
  scannedAt: string;
  retryCount: number;
}

interface EnqueueOfflineScanPayload {
  code: string;
  eventId: string;
  source: 'ios' | 'android' | 'web';
}

interface SyncOfflineScansResult {
  synced: number;
  failed: number;
  remaining: number;
}

const OFFLINE_SCANNER_QUEUE_KEY = 'organizer_scanner_offline_queue_v1';

const readOfflineQueue = async (): Promise<OfflineScanQueueItem[]> => {
  const raw = await storage.getItem(OFFLINE_SCANNER_QUEUE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OfflineScanQueueItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
};

const writeOfflineQueue = async (items: OfflineScanQueueItem[]) => {
  await storage.setItem(OFFLINE_SCANNER_QUEUE_KEY, JSON.stringify(items));
};

export const enqueueOfflineScan = async (
  payload: EnqueueOfflineScanPayload,
): Promise<OfflineScanQueueItem> => {
  const current = await readOfflineQueue();
  const nextItem: OfflineScanQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code: payload.code,
    eventId: payload.eventId,
    source: payload.source,
    scannedAt: new Date().toISOString(),
    retryCount: 0,
  };

  await writeOfflineQueue([nextItem, ...current]);
  return nextItem;
};

export const listOfflineScans = async (
  eventId?: string,
): Promise<OfflineScanQueueItem[]> => {
  const current = await readOfflineQueue();
  if (!eventId) {
    return current;
  }

  return current.filter((item) => item.eventId === eventId);
};

export const syncOfflineScans = async (
  eventId?: string,
): Promise<SyncOfflineScansResult> => {
  const current = await readOfflineQueue();

  if (current.length === 0) {
    return {
      synced: 0,
      failed: 0,
      remaining: 0,
    };
  }

  let synced = 0;
  let failed = 0;

  const targetIds = new Set(
    current
      .filter((item) => (eventId ? item.eventId === eventId : true))
      .map((item) => item.id),
  );

  if (targetIds.size === 0) {
    return {
      synced: 0,
      failed: 0,
      remaining: current.length,
    };
  }

  const remaining: OfflineScanQueueItem[] = [];

  for (const item of current) {
    if (!targetIds.has(item.id)) {
      remaining.push(item);
      continue;
    }

    try {
      await verifyOrganizerScan({
        code: item.code,
        eventId: item.eventId,
        source: item.source,
      });

      synced += 1;
    } catch (error) {
      failed += 1;

      if (isApiNetworkError(error)) {
        remaining.push({
          ...item,
          retryCount: item.retryCount + 1,
        });
      }
    }
  }

  await writeOfflineQueue(remaining);

  return {
    synced,
    failed,
    remaining: remaining.length,
  };
};

export const verifyOrganizerScan = async (
  payload: VerifyScanPayload,
): Promise<ScannerVerificationResult> => {
  const response = await api.post<ScannerVerificationResult>(
    '/organizer/scanner/verify',
    payload,
  );

  return response.data;
};
