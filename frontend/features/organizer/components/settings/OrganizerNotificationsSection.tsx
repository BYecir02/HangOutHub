import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useI18n } from '@/shared/hooks/use-i18n';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import type { UserSettings } from '@/services/user/settings';
import SettingsSection from '@/features/user/components/SettingsSection';
import SettingsToggleRow from '@/features/user/components/SettingsToggleRow';
import { REMINDER_PRESETS, formatReminderOffset, normalizeReminderOffsets } from '@/features/organizer/utils/settings-helpers';

export interface OrganizerNotificationsSectionProps {
  settings: UserSettings;
  customReminderInput: string;
  onCustomReminderInputChange: (value: string) => void;
  onPatch: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  onSetSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
  onAddReminderOffset: (offsetMin: number) => void;
  onRemoveReminderOffset: (offsetMin: number) => void;
  onAddCustomReminderFromInput: () => void;
}

export default function OrganizerNotificationsSection({
  settings,
  customReminderInput,
  onCustomReminderInputChange,
  onPatch,
  onSetSettings,
  onAddReminderOffset,
  onRemoveReminderOffset,
  onAddCustomReminderFromInput,
}: OrganizerNotificationsSectionProps) {
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';

  return (
    <SettingsSection title={t('organizerSettingsSectionNotifications')} containerClassName="mb-5">
      <SettingsToggleRow
        label={t('organizerSettingsNotifyBookings')}
        value={settings.organizerNotifyBookings}
        onValueChange={(next) => onPatch('organizerNotifyBookings', next)}
      />
      <SettingsToggleRow
        label={t('organizerSettingsNotifyTeam')}
        value={settings.organizerNotifyTeamUpdates}
        onValueChange={(next) => onPatch('organizerNotifyTeamUpdates', next)}
      />
      <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
          {t('organizerSettingsReminderMode')}
        </Text>
        <View className="flex-row gap-2">
          {(['preset', 'custom'] as const).map((mode) => {
            const active = settings.organizerReminderMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => {
                  onSetSettings((current) => {
                    if (!current) {
                      return current;
                    }

                    if (mode === 'preset') {
                      return {
                        ...current,
                        organizerReminderMode: 'preset',
                        organizerReminderOffsetsMin: [...REMINDER_PRESETS],
                      };
                    }

                    return {
                      ...current,
                      organizerReminderMode: 'custom',
                      organizerReminderOffsetsMin: normalizeReminderOffsets(
                        current.organizerReminderOffsetsMin || [...REMINDER_PRESETS],
                      ),
                    };
                  });
                }}
                className={`rounded-full px-3 py-2 ${
                  active
                    ? 'bg-[#4c669f]'
                    : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {mode === 'preset'
                    ? t('organizerSettingsReminderModePreset')
                    : t('organizerSettingsReminderModeCustom')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {settings.organizerReminderMode === 'preset' ? (
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('organizerSettingsReminderPresetHelp')}
          </Text>
        ) : null}
      </View>

      {settings.organizerReminderMode === 'custom' ? (
        <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
            {t('organizerSettingsReminderCustomTitle')}
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {REMINDER_PRESETS.map((offset) => {
              const isSelected = (settings.organizerReminderOffsetsMin || []).includes(
                offset,
              );
              return (
                <TouchableOpacity
                  key={offset}
                  onPress={() => onAddReminderOffset(offset)}
                  disabled={isSelected}
                  className={`rounded-full px-3 py-2 ${
                    isSelected
                      ? 'bg-[#92A5C7]'
                      : 'bg-gray-200 dark:bg-gray-800'
                  }`}
                >
                  <Text className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                    {formatReminderOffset(offset)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="mt-3 flex-row items-center gap-2">
            <TextInput
              value={customReminderInput}
              onChangeText={onCustomReminderInputChange}
              keyboardType="numeric"
              placeholder={t('organizerSettingsReminderCustomPlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              className="flex-1 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
            />
            <TouchableOpacity
              onPress={onAddCustomReminderFromInput}
              className="rounded-xl bg-[#4c669f] px-4 py-3"
            >
              <Text className="text-xs font-semibold text-white">
                {t('organizerSettingsReminderAdd')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('organizerSettingsReminderCustomHint')}
          </Text>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {(settings.organizerReminderOffsetsMin || []).map((offset) => (
              <TouchableOpacity
                key={`reminder-${offset}`}
                onPress={() => onRemoveReminderOffset(offset)}
                className="rounded-full bg-[#4c669f]/10 px-3 py-2"
              >
                <Text className="text-xs font-semibold text-[#4c669f]">
                  {formatReminderOffset(offset)} x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View className="px-4 py-3">
        <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
          {t('organizerSettingsPriorityMin')}
        </Text>
        <View className="flex-row gap-2">
          {(['IMPORTANT', 'URGENT'] as const).map((level) => {
            const active = settings.organizerNotificationPriorityMin === level;
            return (
              <TouchableOpacity
                key={level}
                onPress={() => onPatch('organizerNotificationPriorityMin', level)}
                className={`rounded-full px-3 py-2 ${
                  active
                    ? 'bg-[#4c669f]'
                    : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SettingsSection>
  );
}
