import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BarcodeType, CameraView } from 'expo-camera';

import ScannerEventPickerModal from '@/components/organizer/scanner/ScannerEventPickerModal';
import ScannerRecentScansPanel from '@/components/organizer/scanner/ScannerRecentScansPanel';
import ScannerScanResultCard from '@/components/organizer/scanner/ScannerScanResultCard';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import { useI18n } from '@/hooks/use-i18n';
import { useScannerFlow } from '@/hooks/useScannerFlow';
import { scannerStatusTitleKey } from '@/services/scanner-status';

const SCANNER_BARCODE_TYPES: BarcodeType[] = ['qr' as BarcodeType];

export default function ScannerScreen() {
  const { t } = useI18n();
  const [eventPickerVisible, setEventPickerVisible] = useState(false);
  const {
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
    statusTone,
  } = useScannerFlow();

  const selectedEventPhaseClass =
    selectedEventPhase === 'upcoming'
      ? 'rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-900/30'
      : selectedEventPhase === 'live'
        ? 'rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-900/30'
        : 'rounded-full bg-gray-200 px-2.5 py-1 dark:bg-gray-800';
  const selectedEventPhaseTextClass =
    selectedEventPhase === 'upcoming'
      ? 'text-xs font-semibold text-emerald-700 dark:text-emerald-300'
      : selectedEventPhase === 'live'
        ? 'text-xs font-semibold text-amber-700 dark:text-amber-300'
        : 'text-xs font-semibold text-gray-600 dark:text-gray-300';
  const selectedEventPhaseLabel =
    selectedEventPhase === 'upcoming'
      ? t('organizerEventsPhaseUpcoming')
      : selectedEventPhase === 'live'
        ? t('organizerEventsPhaseLive')
        : t('organizerEventsPhasePast');

  if (loading) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (error && !user) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('organizerDataLoadErrorTitle')}
        description={t('organizerDataLoadErrorMessage')}
        actionLabel={t('organizerDataRetry')}
        onAction={() => {
          void refetch();
        }}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (!user || !isAllowed) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 88 }}
      >
        <ScreenHeader
          title={t('scannerTitle')}
          subtitle={t('scannerSubtitle')}
          label={t('organizerEventsLabel')}
        />

        <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
          {scanEligibleEvents.length === 0 ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t('scannerEventNoEvents')}
            </Text>
          ) : selectedEvent ? (
            <View className="flex-row items-center justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  {t('scannerActiveEvent')}
                </Text>
                <Text
                  className="mt-1 text-base font-semibold text-gray-900 dark:text-white"
                  numberOfLines={1}
                >
                  {selectedEvent.title}
                </Text>
                <View className="mt-2 self-start">
                  <View className={selectedEventPhaseClass}>
                    <Text className={selectedEventPhaseTextClass}>
                      {selectedEventPhaseLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setEventPickerVisible(true)}
                className="rounded-full border border-[#4c669f] px-4 py-2"
              >
                <Text className="text-sm font-semibold text-[#4c669f]">
                  {t('scannerSwitchEvent')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {offlineQueueCount > 0 ? (
          <View className="mt-5 rounded-[24px] border border-sky-200 bg-sky-50 p-5 dark:border-sky-800/60 dark:bg-sky-900/20">
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
              onPress={() => {
                void syncQueuedScans();
              }}
              disabled={offlineSyncing}
              className={
                offlineSyncing
                  ? 'mt-3 rounded-[14px] bg-sky-300 px-4 py-3'
                  : 'mt-3 rounded-[14px] bg-sky-600 px-4 py-3'
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
        ) : null}

        {error ? (
          <ScreenState
            mode="warning"
            title={t('organizerDataLoadErrorMessage')}
            actionLabel={t('organizerDataRetry')}
            onAction={() => {
              void refetch();
            }}
            containerClassName="px-0 pb-0 pt-5"
          />
        ) : null}

        <View className="mt-5 rounded-[24px] bg-white p-6 dark:bg-gray-900">
          {!permission ? (
            <ScreenState
              mode="loading"
              title={t('scannerCameraLoading')}
              containerClassName="px-0 py-0"
            />
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
                    className="mt-4 self-start rounded-full bg-red-600 px-4 py-2.5"
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
                      barcodeTypes: SCANNER_BARCODE_TYPES,
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

              {scanResult && statusTone ? (
                <ScannerScanResultCard
                  toneClass={statusTone}
                  title={t(scannerStatusTitleKey[scanResult.status])}
                  message={getScanStatusMessage(scanResult)}
                  attendeeLabel={t('scannerResultAttendee')}
                  ticketLabel={t('scannerResultTicket')}
                  attendeeName={
                    scanResult.attendee?.displayName ||
                    scanResult.attendee?.username ||
                    '-'
                  }
                  ticketName={scanResult.ticket?.ticketTypeName || '-'}
                />
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

              <ScannerRecentScansPanel
                title={t('scannerRecentScansTitle')}
                openAllLabel={t('scannerOpenAllScans')}
                emptyLabel={t('scannerRecentScansEmpty')}
                scans={recentScans}
                onOpenAllScans={openSelectedEventScans}
                formatTime={formatRecentScanTime}
                statusLabelFor={(status) => t(scannerStatusTitleKey[status])}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ScannerEventPickerModal
        visible={eventPickerVisible}
        title={t('scannerEventPickerTitle')}
        subtitle={t('scannerEventPickerSubtitle')}
        events={scanEligibleEvents}
        selectedEventId={selectedEventId}
        onClose={() => setEventPickerVisible(false)}
        onSelectEvent={(eventId) => {
          setSelectedEventId(eventId);
          setEventPickerVisible(false);
        }}
      />
    </>
  );
}
