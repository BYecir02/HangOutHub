import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '@/shared/hooks/use-i18n';
import type { UserSettings } from '@/services/user/settings';
import SettingsSection from '@/features/user/components/SettingsSection';
import SettingsToggleRow from '@/features/user/components/SettingsToggleRow';

export interface OrganizerTeamSectionProps {
  settings: UserSettings;
  onPatch: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export default function OrganizerTeamSection({
  settings,
  onPatch,
}: OrganizerTeamSectionProps) {
  const { t } = useI18n();

  return (
    <SettingsSection title={t('organizerSettingsSectionTeam')} containerClassName="mb-5">
      <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
          {t('organizerSettingsTeamInviteScope')}
        </Text>
        <View className="flex-row gap-2">
          {(['OWNER_ONLY', 'OWNER_AND_EDITORS'] as const).map((scope) => {
            const active = settings.organizerTeamInviteScope === scope;
            return (
              <TouchableOpacity
                key={scope}
                onPress={() => onPatch('organizerTeamInviteScope', scope)}
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
                  {scope === 'OWNER_ONLY'
                    ? t('organizerSettingsTeamInviteOwnerOnly')
                    : t('organizerSettingsTeamInviteOwnerEditors')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
          {t('organizerSettingsTeamDefaultPermission')}
        </Text>
        <View className="flex-row gap-2">
          {(['EDIT', 'SCAN'] as const).map((permission) => {
            const active = settings.organizerTeamDefaultPermission === permission;
            return (
              <TouchableOpacity
                key={permission}
                onPress={() => onPatch('organizerTeamDefaultPermission', permission)}
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
                  {permission}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <SettingsToggleRow
        label={t('organizerSettingsTeamRequireRemovalConfirm')}
        value={settings.organizerTeamRequireRemovalConfirm}
        withBorder={false}
        onValueChange={(next) => onPatch('organizerTeamRequireRemovalConfirm', next)}
      />
    </SettingsSection>
  );
}
