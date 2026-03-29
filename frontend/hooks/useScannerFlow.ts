import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getApiErrorMessage, isApiNetworkError } from '@/services/api';
import { getMySettings } from '@/services/settings';
import {
  enqueueOfflineScan,
  listOfflineScans,
  type ScannerVerificationResult,
  syncOfflineScans,
  verifyOrganizerScan,
} from '@/services/organizer-scanner';
import { getScannerPreferences } from '@/services/scanner-preferences';
import { getOrganizerEventPhase } from '@/services/organizer-ui';
import {
  scannerStatusMessageKey,
  scannerStatusToneClass,
} from '@/services/scanner-status';

const SCAN_THROTTLE_MS = 1000;
const SCAN_FREEZE_STANDARD_MS = 1500;
const SCAN_FREEZE_CONTINUOUS_MS = 450;
const RECENT_SCANS_LIMIT = 8;
const OFFLINE_SYNC_INTERVAL_MS = 15000;

interface ScannerRuntimeSettings {
  offlineAutoEnabled: boolean;
  autoSyncEnabled: boolean;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  strictWindowEnabled: boolean;
  continuousScan: boolean;
  defaultTorchEnabled: boolean;
  defaultCameraFacing: 'back' | 'front';
  ticketInfoMode: 'detailed' | 'compact';
}

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
  const [scannerRuntimeSettings, setScannerRuntimeSettings] =
    useState<ScannerRuntimeSettings>({
      offlineAutoEnabled: true,
      autoSyncEnabled: true,
      hapticsEnabled: true,
      soundEnabled: true,
      strictWindowEnabled: true,
      continuousScan: false,
      defaultTorchEnabled: false,
      defaultCameraFacing: 'back',
      ticketInfoMode: 'detailed',
    });
  const freezeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    const hydrateScannerRuntimeSettings = async () => {
      const [serverSettings, localPreferences] = await Promise.all([
        getMySettings().catch(() => null),
        getScannerPreferences(),
      ]);

      if (!active) {
        return;
      }

      setScannerRuntimeSettings({
        offlineAutoEnabled:
          serverSettings?.organizerScannerOfflineAuto ?? true,
        autoSyncEnabled: serverSettings?.organizerScannerAutoSync ?? true,
        hapticsEnabled: serverSettings?.organizerScannerHaptics ?? true,
        soundEnabled: serverSettings?.organizerScannerSound ?? true,
        strictWindowEnabled: serverSettings?.organizerScannerStrictWindow ?? true,
        continuousScan: localPreferences.continuousScan,
        defaultTorchEnabled: localPreferences.defaultTorchEnabled,
        defaultCameraFacing: localPreferences.defaultCameraFacing,
        ticketInfoMode: localPreferences.ticketInfoMode,
      });
    };

    void hydrateScannerRuntimeSettings();

    return () => {
      active = false;
    };
  }, []);

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
    requiredCapability: 'scanner',
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

  const releaseScan = useCallback((freezeDurationMs: number) => {
    if (freezeTimeoutRef.current) {
      clearTimeout(freezeTimeoutRef.current);
    }

    freezeTimeoutRef.current = setTimeout(() => {
      setIsScanFrozen(false);
    }, freezeDurationMs);
  }, []);

  const triggerHaptic = useCallback(async (isSuccess: boolean) => {
    if (Platform.OS === 'web') {
      return;
    }
    if (!scannerRuntimeSettings.hapticsEnabled) {
      return;
    }

    await Haptics.notificationAsync(
      isSuccess
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  }, [scannerRuntimeSettings.hapticsEnabled]);

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
        if (
          isApiNetworkError(scanRequestError) &&
          selectedEventId &&
          scannerRuntimeSettings.offlineAutoEnabled
        ) {
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
        releaseScan(
          scannerRuntimeSettings.continuousScan
            ? SCAN_FREEZE_CONTINUOUS_MS
            : SCAN_FREEZE_STANDARD_MS,
        );
      }
    },
    [
      isProcessingScan,
      isScanFrozen,
      lastScanAt,
      releaseScan,
      selectedEventId,
      scannerRuntimeSettings.continuousScan,
      scannerRuntimeSettings.offlineAutoEnabled,
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

  const latestHistoryEvent = useMemo(() => {
    if (organizerEvents.length === 0) {
      return null;
    }

    return [...organizerEvents].sort((left, right) => {
      const leftBoundary = new Date(left.endTime || left.startTime).getTime();
      const rightBoundary = new Date(right.endTime || right.startTime).getTime();
      return rightBoundary - leftBoundary;
    })[0];
  }, [organizerEvents]);

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
    const targetEventId = selectedEventId || latestHistoryEvent?.id;

    if (!targetEventId) {
      return;
    }

    router.push({
      pathname: '/event-scans/[id]',
      params: { id: targetEventId },
    });
  }, [latestHistoryEvent?.id, router, selectedEventId]);

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
    if (
      !selectedEventId ||
      offlineQueueCount === 0 ||
      !scannerRuntimeSettings.autoSyncEnabled
    ) {
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
  }, [
    offlineQueueCount,
    scannerRuntimeSettings.autoSyncEnabled,
    selectedEventId,
    syncQueuedScans,
  ]);

  useEffect(() => {
    if (
      !selectedEventId ||
      offlineQueueCount === 0 ||
      !scannerRuntimeSettings.autoSyncEnabled
    ) {
      return;
    }

    const timer = setInterval(() => {
      void syncQueuedScans({ silent: true });
    }, OFFLINE_SYNC_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [
    offlineQueueCount,
    scannerRuntimeSettings.autoSyncEnabled,
    selectedEventId,
    syncQueuedScans,
  ]);

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
    cameraFacing: scannerRuntimeSettings.defaultCameraFacing,
    torchEnabled: scannerRuntimeSettings.defaultTorchEnabled,
    showDetailedTicketInfo:
      scannerRuntimeSettings.ticketInfoMode === 'detailed',
    scannerSoundEnabled: scannerRuntimeSettings.soundEnabled,
    scannerStrictWindowEnabled: scannerRuntimeSettings.strictWindowEnabled,
  };
}
