import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';

export default function OrganizerLayout() {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: '#4c669f',
          tabBarInactiveTintColor: isDark ? '#9ca3af' : '#6b7280',
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            backgroundColor: isDark ? '#111827' : '#ffffff',
            height: 82,
            paddingBottom: 18,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t('organizerNavDashboard'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: t('organizerNavEvents'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            title: t('organizerNavScanner'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'scan' : 'scan-outline'}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="create-place"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}
