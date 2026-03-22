import React, { useCallback, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import { fetchOrganizerNotificationsUnreadCount } from '@/services/organizer-notifications';

export default function OrganizerLayout() {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [notificationsUnread, setNotificationsUnread] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchOrganizerNotificationsUnreadCount();
      setNotificationsUnread(count);
    } catch {
      setNotificationsUnread(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUnreadCount();

      const timer = setInterval(() => {
        void loadUnreadCount();
      }, 30000);

      return () => {
        clearInterval(timer);
      };
    }, [loadUnreadCount]),
  );

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
          name="notifications"
          options={{
            title: t('organizerNavNotifications'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'notifications' : 'notifications-outline'}
                size={20}
                color={color}
              />
            ),
            tabBarBadge: notificationsUnread > 0 ? notificationsUnread : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#ff4757',
              color: 'white',
              fontSize: 10,
              fontWeight: '700',
            },
          }}
        />
        <Tabs.Screen
          name="create-place"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="event-team"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="event-revisions"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('organizerNavSettings'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={20}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
