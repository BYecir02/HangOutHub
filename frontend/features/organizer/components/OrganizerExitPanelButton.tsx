import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';

import { useI18n } from '@/shared/hooks/use-i18n';

export default function OrganizerExitPanelButton() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <TouchableOpacity
      onPress={() => router.replace('/(tabs)/home')}
      className="flex-row items-center rounded-full border border-white/40 px-3 py-2"
      style={{
        backgroundColor: 'rgba(17, 24, 39, 0.82)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.24,
        shadowRadius: 4,
        elevation: 6,
      }}
    >
      <Ionicons name="swap-horizontal-outline" size={14} color="white" />
      <Text className="ml-1.5 text-xs font-semibold text-white">
        {t('organizerExitPanel')}
      </Text>
    </TouchableOpacity>
  );
}
