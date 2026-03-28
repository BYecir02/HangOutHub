import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import {
  getMySettings,
  type UserSettings,
  updateMySettings,
} from '@/services/settings';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsToggleRow from '@/components/settings/SettingsToggleRow';

type NotificationSettingKey =
  | 'notificationMessages'
  | 'notificationOutingInvites'
  | 'notificationFriendRequests'
  | 'notificationSavedPlacesActivity';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
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

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-black">
      <View className="p-5">
        <ScreenHeader
          title={t('notificationSettingsTitle')}
          subtitle={t('notificationSettingsSubtitle')}
          onBack={() => router.back()}
          containerClassName="mb-4 pt-10"
        />

        {loading ? (
          <ScreenState mode="loading" />
        ) : null}

        {!loading && !settings ? (
          <ScreenState
            mode="error"
            title={t('notificationSettingsLoadError')}
            actionLabel={t('commonRetry')}
            onAction={() => {
              void loadSettings();
            }}
            containerClassName="mb-6 px-0 py-0"
          />
        ) : null}

        {!loading && settings ? (
          <SettingsSection containerClassName="mb-6">
            <SettingsToggleRow
              icon="chatbubble-ellipses-outline"
              label={t('notifMessages')}
              value={settings.notificationMessages}
              onValueChange={(nextValue) => {
                void handleUpdateNotificationSetting('notificationMessages', nextValue);
              }}
            />
            <SettingsToggleRow
              icon="calendar-outline"
              label={t('notifOutingInvites')}
              value={settings.notificationOutingInvites}
              onValueChange={(nextValue) => {
                void handleUpdateNotificationSetting('notificationOutingInvites', nextValue);
              }}
            />
            <SettingsToggleRow
              icon="people-outline"
              label={t('notifFriendRequests')}
              value={settings.notificationFriendRequests}
              onValueChange={(nextValue) => {
                void handleUpdateNotificationSetting('notificationFriendRequests', nextValue);
              }}
            />
            <SettingsToggleRow
              icon="location-outline"
              label={t('notifSavedPlaces')}
              value={settings.notificationSavedPlacesActivity}
              withBorder={false}
              onValueChange={(nextValue) => {
                void handleUpdateNotificationSetting(
                  'notificationSavedPlacesActivity',
                  nextValue,
                );
              }}
            />
          </SettingsSection>
        ) : null}
      </View>
    </ScrollView>
  );
}
