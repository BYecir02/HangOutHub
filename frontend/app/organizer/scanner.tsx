import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, BarcodeType, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import OrganizerExitPanelButton from '@/components/organizer/OrganizerExitPanelButton';
import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getApiErrorMessage } from '@/services/api';
import { TranslationKey } from '@/services/i18n';
import {
  ScannerVerificationResult,
  ScannerVerificationStatus,
  verifyOrganizerScan,
} from '@/services/organizer-scanner';

const SCAN_THROTTLE_MS = 1000;
const SCAN_FREEZE_MS = 1500;

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
  const { t } = useI18n();
  const { loading, user, error, refetch } = useUserProfile();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [isScanFrozen, setIsScanFrozen] = useState(false);
  const [lastScanAt, setLastScanAt] = useState(0);
  const [scanResult, setScanResult] =
    useState<ScannerVerificationResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraMountError, setCameraMountError] = useState<string | null>(null);
  const [cameraInstanceKey, setCameraInstanceKey] = useState(0);
  const freezeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          source,
        });
        setScanResult(result);
        await triggerHaptic(result.status === 'VALID_CHECKED_IN_NOW');
      } catch (scanRequestError) {
        setScanResult(null);
        setScanError(
          getApiErrorMessage(scanRequestError, t('scannerUnexpectedError')),
        );
        await triggerHaptic(false);
      } finally {
        setIsProcessingScan(false);
        releaseScan();
      }
    },
    [isProcessingScan, isScanFrozen, lastScanAt, releaseScan, t, triggerHaptic],
  );

  const resetScanState = useCallback(() => {
    setScanResult(null);
    setScanError(null);
    setIsScanFrozen(false);
    setCameraMountError(null);
    setCameraInstanceKey((current) => current + 1);
  }, []);

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
      <View className="mb-3 flex-row justify-end">
        <OrganizerExitPanelButton />
      </View>
      <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t('organizerEventsLabel')}
      </Text>
      <Text className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
        {t('scannerTitle')}
      </Text>
      <Text className="mt-3 text-base text-gray-500 dark:text-gray-400">
        {t('scannerSubtitle')}
      </Text>

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

            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                onPress={resetScanState}
                className="flex-1 items-center rounded-2xl bg-[#4c669f] py-3"
              >
                <Text className="font-semibold text-white">{t('scannerRescanButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/organizer/events')}
                className="flex-1 items-center rounded-2xl border border-gray-300 py-3 dark:border-gray-700"
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-200">
                  {t('organizerDashboardViewEvents')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
