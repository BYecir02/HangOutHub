import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '@/shared/hooks/use-i18n';
import type { UserSettings } from '@/services/user/settings';
import type { ScannerPreferences } from '@/services/organizer/scanner-preferences';
import SettingsSection from '@/features/user/components/SettingsSection';
import SettingsToggleRow from '@/features/user/components/SettingsToggleRow';

export interface OrganizerScannerSectionProps {
  settings: UserSettings;
  scannerPreferences: ScannerPreferences;
  offlineQueueCount: number;
  isScannerWorkspace: boolean;
  onPatch: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  onPatchScanner: <K extends keyof ScannerPreferences>(key: K, value: ScannerPreferences[K]) => void;
  onClearOfflineQueue: () => void;
}

export default function OrganizerScannerSection({
  settings,
  scannerPreferences,
  offlineQueueCount,
  isScannerWorkspace,
  onPatch,
  onPatchScanner,
  onClearOfflineQueue,
}: OrganizerScannerSectionProps) {
  const { t } = useI18n();

  return (
    <SettingsSection
      title={
        isScannerWorkspace
          ? t('organizerSettingsSectionScannerWorkspace')
          : t('organizerSettingsSectionScanner')
      }
      containerClassName="mb-5"
    >
      {isScannerWorkspace ? (
        <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {t('organizerSettingsScannerWorkspaceHint')}
          </Text>
        </View>
      ) : null}
      <SettingsToggleRow
        label={t('organizerSettingsScannerOfflineAuto')}
        value={settings.organizerScannerOfflineAuto}
        onValueChange={(next) => onPatch('organizerScannerOfflineAuto', next)}
      />
      <SettingsToggleRow
        label={t('organizerSettingsScannerAutoSync')}
        value={settings.organizerScannerAutoSync}
        onValueChange={(next) => onPatch('organizerScannerAutoSync', next)}
      />
      <SettingsToggleRow
        label={t('organizerSettingsScannerHaptics')}
        value={settings.organizerScannerHaptics}
        onValueChange={(next) => onPatch('organizerScannerHaptics', next)}
      />
      <SettingsToggleRow
        label={t('organizerSettingsScannerSound')}
        value={settings.organizerScannerSound}
        onValueChange={(next) => onPatch('organizerScannerSound', next)}
      />
      <SettingsToggleRow
        label={t('organizerSettingsScannerStrictWindow')}
        value={settings.organizerScannerStrictWindow}
        onValueChange={(next) => onPatch('organizerScannerStrictWindow', next)}
      />
      <SettingsToggleRow
        label={t('organizerSettingsScannerContinuousScan')}
        value={scannerPreferences.continuousScan}
        onValueChange={(next) => onPatchScanner('continuousScan', next)}
      />
      <SettingsToggleRow
        label={t('organizerSettingsScannerTorchDefault')}
        value={scannerPreferences.defaultTorchEnabled}
        onValueChange={(next) => onPatchScanner('defaultTorchEnabled', next)}
      />

      <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
          {t('organizerSettingsScannerCameraFacing')}
        </Text>
        <View className="flex-row gap-2">
          {(['back', 'front'] as const).map((cameraFacing) => {
            const active = scannerPreferences.defaultCameraFacing === cameraFacing;
            return (
              <TouchableOpacity
                key={cameraFacing}
                onPress={() => onPatchScanner('defaultCameraFacing', cameraFacing)}
                className={`rounded-full px-3 py-2 ${
                  active ? 'bg-[#4c669f]' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {cameraFacing === 'back'
                    ? t('organizerSettingsScannerCameraBack')
                    : t('organizerSettingsScannerCameraFront')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
          {t('organizerSettingsScannerTicketInfoMode')}
        </Text>
        <View className="flex-row gap-2">
          {(['detailed', 'compact'] as const).map((ticketInfoMode) => {
            const active = scannerPreferences.ticketInfoMode === ticketInfoMode;
            return (
              <TouchableOpacity
                key={ticketInfoMode}
                onPress={() => onPatchScanner('ticketInfoMode', ticketInfoMode)}
                className={`rounded-full px-3 py-2 ${
                  active ? 'bg-[#4c669f]' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {ticketInfoMode === 'detailed'
                    ? t('organizerSettingsScannerTicketInfoDetailed')
                    : t('organizerSettingsScannerTicketInfoCompact')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
          {t('settingsLanguage')}
        </Text>
        <View className="flex-row gap-2">
          {(['fr', 'en'] as const).map((languageCode) => {
            const active = settings.language === languageCode;
            return (
              <TouchableOpacity
                key={languageCode}
                onPress={() => onPatch('language', languageCode)}
                className={`rounded-full px-3 py-2 ${
                  active ? 'bg-[#4c669f]' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {languageCode === 'fr'
                    ? t('settingsLanguageFrench')
                    : t('settingsLanguageEnglish')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="px-4 py-3">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsScannerOfflinePendingCount', {
            count: offlineQueueCount,
          })}
        </Text>
        <TouchableOpacity
          onPress={onClearOfflineQueue}
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-500/50 dark:bg-red-500/10"
        >
          <Text className="text-center text-xs font-semibold text-red-600 dark:text-red-300">
            {t('organizerSettingsScannerOfflineClearAction')}
          </Text>
        </TouchableOpacity>
      </View>
    </SettingsSection>
  );
}
