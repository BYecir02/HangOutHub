import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '@/hooks/use-i18n';

type OrganizerPanelTab = 'dashboard' | 'events' | 'scanner';

interface OrganizerPanelNavProps {
  current: OrganizerPanelTab;
  showCreatePlace?: boolean;
}

export default function OrganizerPanelNav({
  current,
  showCreatePlace = false,
}: OrganizerPanelNavProps) {
  const router = useRouter();
  const { t } = useI18n();

  const items: {
    id: OrganizerPanelTab | 'create-place';
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    path: string;
  }[] = [
    {
      id: 'dashboard',
      icon: 'grid-outline',
      label: t('organizerNavDashboard'),
      path: '/organizer/dashboard',
    },
    {
      id: 'events',
      icon: 'calendar-outline',
      label: t('organizerNavEvents'),
      path: '/organizer/events',
    },
    {
      id: 'scanner',
      icon: 'scan-outline',
      label: t('organizerNavScanner'),
      path: '/organizer/scanner',
    },
  ];

  if (showCreatePlace) {
    items.push({
      id: 'create-place',
      icon: 'location-outline',
      label: t('organizerNavCreatePlace'),
      path: '/organizer/create-place',
    });
  }

  return (
    <View className="mt-5 rounded-3xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <Text className="mb-2 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t('organizerNavTitle')}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => {
          const isActive = item.id === current;

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(item.path as never)}
              className={`flex-row items-center rounded-full px-3 py-2 ${
                isActive
                  ? 'bg-[#4c669f]'
                  : 'border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={isActive ? '#ffffff' : '#6b7280'}
              />
              <Text
                className={`ml-2 text-xs font-semibold ${
                  isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
