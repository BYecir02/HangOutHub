import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, BarcodeType, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getApiErrorMessage, isApiNetworkError } from '@/services/api';
import { TranslationKey } from '@/services/i18n';
import {
  enqueueOfflineScan,
  listOfflineScans,
  ScannerVerificationResult,
  ScannerVerificationStatus,
  syncOfflineScans,
  verifyOrganizerScan,
} from '@/services/organizer-scanner';

const SCAN_THROTTLE_MS = 1000;
const SCAN_FREEZE_MS = 1500;
const RECENT_SCANS_LIMIT = 8;
const OFFLINE_SYNC_INTERVAL_MS = 15000;

interface RecentScanItem {
  id: string;
  attendeeName: string;
  ticketName: string;
  status: ScannerVerificationStatus;
  scannedAt: string;
}

const statusToneClass: Record<ScannerVerificationStatus, string> = {
  VALID_CHECKED_IN_NOW:
    'border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20',
  VALID_ALREADY_CHECKED_IN:
    'border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20',
  INVALID_CODE:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  BOOKING_NOT_FOUND:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  NOT_FOR_THIS_EVENT:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  BOOKING_NOT_CONFIRMED:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  EVENT_EXPIRED:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  UNAUTHORIZED_SCANNER:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
};

const statusTitleKey: Record<ScannerVerificationStatus, TranslationKey> = {
  VALID_CHECKED_IN_NOW: 'scannerStatusValidNow',
  VALID_ALREADY_CHECKED_IN: 'scannerStatusAlreadyUsed',
  INVALID_CODE: 'scannerStatusInvalid',
  BOOKING_NOT_FOUND: 'scannerStatusNotFound',
  NOT_FOR_THIS_EVENT: 'scannerStatusWrongEvent',
  BOOKING_NOT_CONFIRMED: 'scannerStatusNotConfirmed',
  EVENT_EXPIRED: 'scannerStatusExpired',
  UNAUTHORIZED_SCANNER: 'scannerStatusUnauthorized',
};

const statusMessageKey: Record<ScannerVerificationStatus, TranslationKey> = {
  VALID_CHECKED_IN_NOW: 'scannerStatusMessageValidNow',
  VALID_ALREADY_CHECKED_IN: 'scannerStatusMessageAlreadyUsed',
  INVALID_CODE: 'scannerStatusMessageInvalid',
  BOOKING_NOT_FOUND: 'scannerStatusMessageNotFound',
  NOT_FOR_THIS_EVENT: 'scannerStatusMessageWrongEvent',
  BOOKING_NOT_CONFIRMED: 'scannerStatusMessageNotConfirmed',
  EVENT_EXPIRED: 'scannerStatusMessageExpired',
  UNAUTHORIZED_SCANNER: 'scannerStatusMessageUnauthorized',
};

export default function ScannerScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { loading, user, organizerEvents, error, refetch } = useUserProfile();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [isScanFrozen, setIsScanFrozen] = useState(false);
  const [lastScanAt, setLastScanAt] = useState(0);
  const [scanResult, setScanResult] =
    useState<ScannerVerificationResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
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

    const hasSelection = scanEligibleEvents.some((event) => event.id === selectedEventId);
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

  const selectedEvent = scanEligibleEvents.find((event) => event.id === selectedEventId);

  const formatRecentScanTime = (value: string) => {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return '--:--';
    }

    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  };

  const openSelectedEventScans = () => {
    if (!selectedEventId) {
      return;
    }

    router.push({
      pathname: '/event-scans/[id]',
      params: { id: selectedEventId },
    });
  };

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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  if (error && !user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-black">
        <Text className="text-center text-xl font-bold text-gray-900 dark:text-white">
          {t('organizerDataLoadErrorTitle')}
        </Text>
        <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
          {t('organizerDataLoadErrorMessage')}
        </Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          className="mt-5 rounded-2xl bg-[#4c669f] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('organizerDataRetry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user || !isAllowed) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  const statusTone = scanResult ? statusToneClass[scanResult.status] : null;

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black">
      <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t('organizerEventsLabel')}
      </Text>
      <Text className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
        {t('scannerTitle')}
      </Text>
      <Text className="mt-3 text-base text-gray-500 dark:text-gray-400">
        {t('scannerSubtitle')}
      </Text>

      <View className="mt-4 rounded-2xl bg-white p-4 dark:bg-gray-900">
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('scannerEventPickerTitle')}
        </Text>
        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('scannerEventPickerSubtitle')}
        </Text>

        {scanEligibleEvents.length === 0 ? (
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('scannerEventNoEvents')}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          >
            {scanEligibleEvents.map((event) => {
              const selected = event.id === selectedEventId;
              return (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => setSelectedEventId(event.id)}
                  className={selected
                    ? 'rounded-full bg-[#4c669f] px-4 py-2'
                    : 'rounded-full border border-gray-300 px-4 py-2 dark:border-gray-700'}
                >
                  <Text
                    numberOfLines={1}
                    className={selected
                      ? 'max-w-[220px] text-xs font-semibold text-white'
                      : 'max-w-[220px] text-xs font-semibold text-gray-700 dark:text-gray-200'}
                  >
                    {event.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {selectedEvent ? (
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="mr-3 flex-1 text-sm text-gray-600 dark:text-gray-300" numberOfLines={1}>
              {t('scannerActiveEvent')}: {selectedEvent.title}
            </Text>
            <TouchableOpacity
              onPress={openSelectedEventScans}
              className="rounded-full border border-[#4c669f] px-3 py-1.5"
            >
              <Text className="text-xs font-semibold text-[#4c669f]">
                {t('scannerOpenAllScans')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800/60 dark:bg-sky-900/20">
        <Text className="text-sm font-semibold text-sky-800 dark:text-sky-200">
          {t('scannerOfflineQueueTitle')}
        </Text>
        <Text className="mt-1 text-xs text-sky-700 dark:text-sky-300">
          {t('scannerOfflineQueueSubtitle')}
        </Text>
        <Text className="mt-3 text-sm font-medium text-sky-800 dark:text-sky-200">
          {t('scannerOfflinePendingCount', { count: offlineQueueCount })}
        </Text>
        <TouchableOpacity
          onPress={() => void syncQueuedScans()}
          disabled={offlineSyncing || offlineQueueCount === 0}
          className={
            offlineSyncing || offlineQueueCount === 0
              ? 'mt-3 rounded-xl bg-sky-300 px-4 py-3'
              : 'mt-3 rounded-xl bg-sky-600 px-4 py-3'
          }
        >
          <Text className="text-center text-sm font-semibold text-white">
            {offlineSyncing
              ? t('scannerOfflineSyncing')
              : t('scannerOfflineSyncAction')}
          </Text>
        </TouchableOpacity>
        {offlineSyncMessage ? (
          <Text className="mt-2 text-xs text-sky-700 dark:text-sky-300">
            {offlineSyncMessage}
          </Text>
        ) : null}
      </View>

      {error ? (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-900/20">
          <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {t('organizerDataLoadErrorMessage')}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            className="mt-3 self-start rounded-full bg-amber-600 px-4 py-2"
          >
            <Text className="text-xs font-semibold text-white">
              {t('organizerDataRetry')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View className="mt-6 rounded-3xl bg-white p-6 dark:bg-gray-900">
        {!permission ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator size="small" color="#4c669f" />
            <Text className="mt-3 text-gray-500 dark:text-gray-400">
              {t('scannerCameraLoading')}
            </Text>
          </View>
        ) : null}

        {permission && !permission.granted ? (
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('scannerPermissionTitle')}
            </Text>
            <Text className="mt-2 text-gray-500 dark:text-gray-400">
              {t('scannerPermissionMessage')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                void requestPermission();
              }}
              className="mt-5 items-center rounded-2xl bg-[#4c669f] py-3"
            >
              <Text className="font-semibold text-white">
                {t('scannerPermissionButton')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {permission?.granted ? (
          <View>
            {cameraMountError ? (
              <View className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800/60 dark:bg-red-900/20">
                <Text className="text-base font-semibold text-red-700 dark:text-red-300">
                  {t('scannerCameraUnavailableTitle')}
                </Text>
                <Text className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {cameraMountError}
                </Text>
                <TouchableOpacity
                  onPress={resetScanState}
                  className="mt-4 self-start rounded-full bg-red-600 px-4 py-2"
                >
                  <Text className="text-xs font-semibold text-white">
                    {t('scannerCameraRetry')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
                <CameraView
                  key={cameraInstanceKey}
                  style={{ height: 288, width: '100%' }}
                  onMountError={handleCameraMountError}
                  onBarcodeScanned={handleBarcodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr' as BarcodeType],
                  }}
                />
              </View>
            )}

            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {cameraMountError
                ? t('scannerCameraUnavailableMessage')
                : isProcessingScan
                  ? t('scannerProcessing')
                  : t('scannerReadyHint')}
            </Text>

            {scanResult ? (
              <View className={`mt-4 rounded-2xl border p-4 ${statusTone}`}>
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {t(statusTitleKey[scanResult.status])}
                </Text>
                <Text className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {t(statusMessageKey[scanResult.status])}
                </Text>

                {scanResult.attendee ? (
                  <Text className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('scannerResultAttendee')}: {scanResult.attendee.displayName || scanResult.attendee.username || '-'}
                  </Text>
                ) : null}

                {scanResult.ticket ? (
                  <Text className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    {t('scannerResultTicket')}: {scanResult.ticket.ticketTypeName || '-'}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {scanError ? (
              <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800/60 dark:bg-red-900/20">
                <Text className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {t('scannerLastScanError')}
                </Text>
                <Text className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {scanError}
                </Text>
              </View>
            ) : null}

            <View className="mt-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('scannerRecentScansTitle')}
              </Text>

              {recentScans.length === 0 ? (
                <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('scannerRecentScansEmpty')}
                </Text>
              ) : (
                recentScans.map((item) => (
                  <View
                    key={item.id}
                    className="mt-3 flex-row items-center justify-between rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-800"
                  >
                    <View className="mr-3 flex-1">
                      <Text className="text-sm font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                        {item.attendeeName}
                      </Text>
                      <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
                        {item.ticketName}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {t(statusTitleKey[item.status])}
                      </Text>
                      <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {formatRecentScanTime(item.scannedAt)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
