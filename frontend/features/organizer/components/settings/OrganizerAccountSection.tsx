import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '@/shared/hooks/use-i18n';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import SettingsSection from '@/features/user/components/SettingsSection';

export interface OrganizerAccountSectionProps {
  onExitPanel: () => void;
  onLogout: () => void;
}

export default function OrganizerAccountSection({
  onExitPanel,
  onLogout,
}: OrganizerAccountSectionProps) {
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';

  return (
    <SettingsSection title={t('organizerSettingsSectionAccount')} containerClassName="mt-3 mb-16">
      <TouchableOpacity
        onPress={onExitPanel}
        className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-800"
      >
        <View className="flex-row items-center">
          <View className="mr-3 rounded-full bg-gray-100 p-2 dark:bg-gray-800">
            <Ionicons name="swap-horizontal-outline" size={16} color="#4c669f" />
          </View>
          <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {t('organizerExitPanel')}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? '#9ca3af' : '#6b7280'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onLogout}
        className="flex-row items-center justify-between px-4 py-4"
      >
        <View className="flex-row items-center">
          <View className="mr-3 rounded-full bg-gray-100 p-2 dark:bg-gray-800">
            <Ionicons name="log-out-outline" size={16} color="#ff4757" />
          </View>
          <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {t('settingsLogout')}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? '#9ca3af' : '#6b7280'}
        />
      </TouchableOpacity>
    </SettingsSection>
  );
}
