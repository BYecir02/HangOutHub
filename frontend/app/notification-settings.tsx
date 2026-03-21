import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import {
  getMySettings,
  type UserSettings,
  updateMySettings,
} from '@/services/settings';

type NotificationSettingKey =
  | 'notificationMessages'
  | 'notificationOutingInvites'
  | 'notificationFriendRequests'
  | 'notificationSavedPlacesActivity';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#fff' : '#333';
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const nextSettings = await getMySettings();
      setSettings(nextSettings);
    } catch (error) {
      console.error('Erreur chargement parametres notifications:', error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const handleUpdateNotificationSetting = async (
    key: NotificationSettingKey,
    value: boolean,
  ) => {
    if (!settings) {
      return;
    }

    const previousSettings = settings;
    const optimisticSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(optimisticSettings);

    try {
      const savedSettings = await updateMySettings({
        [key]: value,
      });
      setSettings(savedSettings);
    } catch (error) {
      console.error('Erreur sauvegarde parametres notifications:', error);
      setSettings(previousSettings);
      Alert.alert(t('commonErrorTitle'), t('notificationSettingsSaveError'));
    }
  };

  const renderToggleRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: boolean,
    onValueChange: (nextValue: boolean) => void,
    withBorder = true,
  ) => (
    <View
      className={`flex-row items-center p-4 ${
        withBorder ? 'border-b border-gray-100 dark:border-gray-800' : ''
      }`}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#d1d5db', true: '#4c669f' }}
        thumbColor="#ffffff"
      />
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-black">
      <View className="p-5">
        <View className="flex-row items-center mb-2 pt-10">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('notificationSettingsTitle')}
          </Text>
        </View>

        <Text className="text-gray-500 dark:text-gray-400 mb-4">
          {t('notificationSettingsSubtitle')}
        </Text>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#4c669f" />
          </View>
        ) : null}

        {!loading && !settings ? (
          <View className="bg-white dark:bg-gray-900 rounded-xl p-5 mb-6">
            <Text className="text-gray-700 dark:text-gray-200 font-semibold mb-2">
              {t('notificationSettingsLoadError')}
            </Text>
            <TouchableOpacity
              onPress={() => void loadSettings()}
              className="self-start rounded-lg bg-[#4c669f] px-4 py-2"
            >
              <Text className="text-white font-semibold">{t('commonRetry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && settings ? (
          <View className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden mb-6">
            {renderToggleRow(
              'chatbubble-ellipses-outline',
              t('notifMessages'),
              settings.notificationMessages,
              (nextValue) => {
                void handleUpdateNotificationSetting('notificationMessages', nextValue);
              },
            )}
            {renderToggleRow(
              'calendar-outline',
              t('notifOutingInvites'),
              settings.notificationOutingInvites,
              (nextValue) => {
                void handleUpdateNotificationSetting('notificationOutingInvites', nextValue);
              },
            )}
            {renderToggleRow(
              'people-outline',
              t('notifFriendRequests'),
              settings.notificationFriendRequests,
              (nextValue) => {
                void handleUpdateNotificationSetting('notificationFriendRequests', nextValue);
              },
            )}
            {renderToggleRow(
              'location-outline',
              t('notifSavedPlaces'),
              settings.notificationSavedPlacesActivity,
              (nextValue) => {
                void handleUpdateNotificationSetting(
                  'notificationSavedPlacesActivity',
                  nextValue,
                );
              },
              false,
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
