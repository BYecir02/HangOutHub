import React from 'react';
import { Text, TextInput, View } from 'react-native';

import { useI18n } from '@/shared/hooks/use-i18n';
import type { UserSettings } from '@/services/user/settings';
import SettingsSection from '@/features/user/components/SettingsSection';

export interface OrganizerDefaultsSectionProps {
  settings: UserSettings;
  onPatch: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export default function OrganizerDefaultsSection({
  settings,
  onPatch,
}: OrganizerDefaultsSectionProps) {
  const { t } = useI18n();

  return (
    <SettingsSection title={t('organizerSettingsSectionDefaults')} containerClassName="mb-5">
      <View className="p-4">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultCheckInOpen')}
        </Text>
        <TextInput
          value={String(settings.organizerDefaultCheckInOpenOffsetMin)}
          onChangeText={(value) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              onPatch('organizerDefaultCheckInOpenOffsetMin', Math.trunc(parsed));
            }
          }}
          keyboardType="numbers-and-punctuation"
          className="mt-1 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
        />

        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultCheckInClose')}
        </Text>
        <TextInput
          value={String(settings.organizerDefaultCheckInCloseOffsetMin)}
          onChangeText={(value) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              onPatch('organizerDefaultCheckInCloseOffsetMin', Math.trunc(parsed));
            }
          }}
          keyboardType="numbers-and-punctuation"
          className="mt-1 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
        />

        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultMaxTickets')}
        </Text>
        <TextInput
          value={String(settings.organizerDefaultMaxTicketsPerUser)}
          onChangeText={(value) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              onPatch('organizerDefaultMaxTicketsPerUser', Math.trunc(parsed));
            }
          }}
          keyboardType="numeric"
          className="mt-1 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
        />

        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultCancellationPolicy')}
        </Text>
        <TextInput
          value={settings.organizerDefaultCancellationPolicy || ''}
          onChangeText={(value) => onPatch('organizerDefaultCancellationPolicy', value)}
          multiline
          className="mt-1 h-20 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
          textAlignVertical="top"
        />

        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultRefundPolicy')}
        </Text>
        <TextInput
          value={settings.organizerDefaultRefundPolicy || ''}
          onChangeText={(value) => onPatch('organizerDefaultRefundPolicy', value)}
          multiline
          className="mt-1 h-20 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
          textAlignVertical="top"
        />
      </View>
    </SettingsSection>
  );
}
