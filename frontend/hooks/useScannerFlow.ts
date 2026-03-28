import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getApiErrorMessage, isApiNetworkError } from '@/services/api';
import {
  enqueueOfflineScan,
  listOfflineScans,
  type ScannerVerificationResult,
  syncOfflineScans,
  verifyOrganizerScan,
} from '@/services/organizer-scanner';
import { getOrganizerEventPhase } from '@/services/organizer-ui';
import {
  scannerStatusMessageKey,
  scannerStatusToneClass,
} from '@/services/scanner-status';

const SCAN_THROTTLE_MS = 1000;
const SCAN_FREEZE_MS = 1500;
const RECENT_SCANS_LIMIT = 8;
const OFFLINE_SYNC_INTERVAL_MS = 15000;

export interface ScannerFlowRecentScan {
  id: string;
  attendeeName: string;
  ticketName: string;
  status: ScannerVerificationResult['status'];
  scannedAt: string;
}

export function useScannerFlow() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const {
    loading,
    user,
    organizerEvents,
    error,
    refetch,
  } = useUserProfile();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [isScanFrozen, setIsScanFrozen] = useState(false);
  const [lastScanAt, setLastScanAt] = useState(0);
  const [scanResult, setScanResult] = useState<ScannerVerificationResult | null>(
    null,
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [recentScans, setRecentScans] = useState<ScannerFlowRecentScan[]>([]);
  const [cameraMountError, setCameraMountError] = useState<string | null>(null);
  const [cameraInstanceKey, setCameraInstanceKey] = useState(0);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [offlineSyncing, setOfflineSyncing] = useState(false);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState<string | null>(
    null,
  );
  const freezeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanEligibleEvents = useMemo(() => {
    const now = Date.now();

    return organizerEvents.filter((event) => {
      const boundaryRaw = event.endTime || event.startTime;
      const boundary = new Date(boundaryRaw).getTime();

      if (!Number.isFinite(boundary)) {
        return false;
      }

      return boundary >= now;
    });
  }, [organizerEvents]);

  const isAllowed = useOrganizerGuard({
    user,
    loading,
    suspend: Boolean(error),
  });

  useEffect(() => {
    return () => {
      if (freezeTimeoutRef.current) {
        clearTimeout(freezeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (scanEligibleEvents.length === 0) {
      setSelectedEventId('');
      return;
    }

    const hasSelection = scanEligibleEvents.some(
      (event) => event.id === selectedEventId,
    );
    if (!hasSelection) {
      setSelectedEventId(scanEligibleEvents[0].id);
    }
  }, [scanEligibleEvents, selectedEventId]);

  const refreshOfflineQueueCount = useCallback(async () => {
    const items = await listOfflineScans(selectedEventId || undefined);
    setOfflineQueueCount(items.length);
  }, [selectedEventId]);

  useEffect(() => {
    void refreshOfflineQueueCount();
  }, [refreshOfflineQueueCount]);

  const releaseScan = useCallback(() => {
    if (freezeTimeoutRef.current) {
      clearTimeout(freezeTimeoutRef.current);
    }

    freezeTimeoutRef.current = setTimeout(() => {
      setIsScanFrozen(false);
    }, SCAN_FREEZE_MS);
  }, []);

  const triggerHaptic = useCallback(async (isSuccess: boolean) => {
    if (Platform.OS === 'web') {
      return;
    }

    await Haptics.notificationAsync(
      isSuccess
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  }, []);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      const now = Date.now();

      if (isProcessingScan || isScanFrozen || now - lastScanAt < SCAN_THROTTLE_MS) {
        return;
      }

      if (!selectedEventId) {
        setScanError(t('scannerSelectEventRequired'));
        await triggerHaptic(false);
        return;
      }

      setLastScanAt(now);
      setIsProcessingScan(true);
      setIsScanFrozen(true);
      setScanError(null);

      try {
        const source =
          Platform.OS === 'ios' || Platform.OS === 'android'
            ? Platform.OS
            : 'web';
        const result = await verifyOrganizerScan({
          code: data,
          eventId: selectedEventId,
          source,
        });
        setScanResult(result);
        if (result.attendee) {
          const attendeeName =
            result.attendee.displayName || result.attendee.username || '-';
          const ticketName = result.ticket?.ticketTypeName || '-';
          const scannedAt = result.checkedInAt || new Date().toISOString();

          setRecentScans((current) => [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              attendeeName,
              ticketName,
              status: result.status,
              scannedAt,
            },
            ...current,
          ].slice(0, RECENT_SCANS_LIMIT));
        }
        await triggerHaptic(result.status === 'VALID_CHECKED_IN_NOW');
      } catch (scanRequestError) {
        setScanResult(null);
        if (isApiNetworkError(scanRequestError) && selectedEventId) {
          const source =
            Platform.OS === 'ios' || Platform.OS === 'android'
              ? Platform.OS
              : 'web';

          await enqueueOfflineScan({
            code: data,
            eventId: selectedEventId,
            source,
          });

          setScanError(t('scannerOfflineQueued'));
          setOfflineSyncMessage(null);
          await refreshOfflineQueueCount();
        } else {
          setScanError(
            getApiErrorMessage(scanRequestError, t('scannerUnexpectedError')),
          );
        }
        await triggerHaptic(false);
      } finally {
        setIsProcessingScan(false);
        releaseScan();
      }
    },
    [
      isProcessingScan,
      isScanFrozen,
      lastScanAt,
      releaseScan,
      selectedEventId,
      t,
      triggerHaptic,
      refreshOfflineQueueCount,
    ],
  );

  const resetScanState = useCallback(() => {
    setScanResult(null);
    setScanError(null);
    setIsScanFrozen(false);
    setCameraMountError(null);
    setCameraInstanceKey((current) => current + 1);
  }, []);

  const selectedEvent = scanEligibleEvents.find(
    (event) => event.id === selectedEventId,
  );
  const selectedEventPhase = selectedEvent
    ? getOrganizerEventPhase(selectedEvent.startTime, selectedEvent.endTime)
    : null;

  const formatRecentScanTime = useCallback(
    (value: string) => {
      const parsed = new Date(value);

      if (Number.isNaN(parsed.getTime())) {
        return '--:--';
      }

      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(parsed);
    },
    [locale],
  );

  const formatScannerBoundaryMoment = useCallback(
    (value: string) => {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return '--:--';
      }

      const now = new Date();
      const isSameDay =
        parsed.getFullYear() === now.getFullYear() &&
        parsed.getMonth() === now.getMonth() &&
        parsed.getDate() === now.getDate();

      if (isSameDay) {
        return new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit',
        }).format(parsed);
      }

      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(parsed);
    },
    [locale],
  );

  const getScanStatusMessage = useCallback(
    (result: ScannerVerificationResult) => {
      if (result.status === 'EVENT_EXPIRED' && result.checkInWindow) {
        const windowDate =
          result.checkInWindow.reason === 'TOO_EARLY'
            ? result.checkInWindow.opensAt
            : result.checkInWindow.closesAt;

        const formattedTime = formatScannerBoundaryMoment(windowDate);

        if (result.checkInWindow.reason === 'TOO_EARLY') {
          return t('scannerStatusMessageExpiredTooEarly', { time: formattedTime });
        }

        return t('scannerStatusMessageExpiredTooLate', { time: formattedTime });
      }

      return t(scannerStatusMessageKey[result.status]);
    },
    [formatScannerBoundaryMoment, t],
  );

  const openSelectedEventScans = useCallback(() => {
    if (!selectedEventId) {
      return;
    }

    router.push({
      pathname: '/event-scans/[id]',
      params: { id: selectedEventId },
    });
  }, [router, selectedEventId]);

  const syncQueuedScans = useCallback(async (options?: { silent?: boolean }) => {
    if (!selectedEventId || offlineSyncing || offlineQueueCount === 0) {
      return;
    }

    const silent = options?.silent ?? false;

    setOfflineSyncing(true);

    if (!silent) {
      setOfflineSyncMessage(null);
    }

    try {
      const result = await syncOfflineScans(selectedEventId);

      if (!silent && result.synced > 0 && result.failed === 0) {
        setOfflineSyncMessage(
          t('scannerOfflineSyncSuccess', { count: result.synced }),
        );
      } else if (!silent && result.synced > 0 && result.failed > 0) {
        setOfflineSyncMessage(
          t('scannerOfflineSyncPartial', {
            synced: result.synced,
            failed: result.failed,
          }),
        );
      } else if (!silent && result.remaining === 0) {
        setOfflineSyncMessage(t('scannerOfflineSyncNoPending'));
      } else if (!silent) {
        setOfflineSyncMessage(t('scannerOfflineSyncFailed'));
      }

      await refreshOfflineQueueCount();
    } catch {
      if (!silent) {
        setOfflineSyncMessage(t('scannerOfflineSyncFailed'));
      }
    } finally {
      setOfflineSyncing(false);
    }
  }, [
    offlineQueueCount,
    offlineSyncing,
    refreshOfflineQueueCount,
    selectedEventId,
    t,
  ]);

  useEffect(() => {
    if (!selectedEventId || offlineQueueCount === 0) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncQueuedScans({ silent: true });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [offlineQueueCount, selectedEventId, syncQueuedScans]);

  useEffect(() => {
    if (!selectedEventId || offlineQueueCount === 0) {
      return;
    }

    const timer = setInterval(() => {
      void syncQueuedScans({ silent: true });
    }, OFFLINE_SYNC_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [offlineQueueCount, selectedEventId, syncQueuedScans]);

  const handleCameraMountError = useCallback(
    (mountError: { message?: string }) => {
      setCameraMountError(
        mountError.message || t('scannerCameraUnavailableMessage'),
      );
    },
    [t],
  );

  return {
    user,
    loading,
    error,
    refetch,
    isAllowed,
    permission,
    requestPermission,
    isProcessingScan,
    scanResult,
    scanError,
    selectedEventId,
    setSelectedEventId,
    scanEligibleEvents,
    selectedEvent,
    selectedEventPhase,
    recentScans,
    cameraMountError,
    cameraInstanceKey,
    offlineQueueCount,
    offlineSyncing,
    offlineSyncMessage,
    handleBarcodeScanned,
    resetScanState,
    getScanStatusMessage,
    openSelectedEventScans,
    syncQueuedScans,
    formatRecentScanTime,
    handleCameraMountError,
    statusTone:
      scanResult
        ? scannerStatusToneClass[scanResult.status]
        : null,
  };
}
