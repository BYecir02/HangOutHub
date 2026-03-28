import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api, { storage } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import {
  type AppLanguage,
  type AppTheme,
  getMySettings,
  type OutingInviteScope,
  type PostVisibility,
  type UserSettings,
  updateMySettings,
} from '@/services/settings';
import { syncAppPreferencesFromSettings } from '@/services/app-preferences';
import { clearStoredUserSession } from '@/services/user-session';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsToggleRow from '@/components/settings/SettingsToggleRow';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#fff' : '#333';
  const chevronColor = isDark ? '#555' : '#ccc';
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const nextSettings = await getMySettings();
      setSettings(nextSettings);
      await syncAppPreferencesFromSettings(nextSettings);
    } catch (error) {
      console.error('Erreur chargement settings:', error);
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

  const handleUpdateSetting = async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
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
    await syncAppPreferencesFromSettings(optimisticSettings);

    try {
      const savedSettings = await updateMySettings({
        [key]: value,
      } as Partial<UserSettings>);
      setSettings(savedSettings);
      await syncAppPreferencesFromSettings(savedSettings);
    } catch (error) {
      console.error('Erreur sauvegarde settings:', error);
      setSettings(previousSettings);
      await syncAppPreferencesFromSettings(previousSettings);
      Alert.alert(t('commonErrorTitle'), t('settingsSaveError'));
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('settingsLogoutTitle'),
      t('settingsLogoutMessage'),
      [
        { text: t('genericCancel'), style: 'cancel' },
        {
          text: t('settingsLogoutConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Logout backend (invalider la session)
              await api.post('/auth/logout').catch(() => {});
              // 2. Supprimer le token et les infos locales
              await storage.removeItem('userToken');
              await storage.removeItem('refreshToken');
              await clearStoredUserSession();
              // 3. Rediriger vers la page de connexion (index)
              router.replace('/');
            } catch (error) {
              console.error("Erreur lors de la déconnexion:", error);
              Alert.alert(t('commonErrorTitle'), t('settingsLogoutFailed'));
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settingsDeleteTitle'),
      t('settingsDeleteMessage'),
      [
        { text: t('genericCancel'), style: 'cancel' },
        { 
          text: t('settingsDeleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/users/me');
              await storage.removeItem('userToken');
              await storage.removeItem('refreshToken');
              await clearStoredUserSession();
              router.replace('/');
              Alert.alert(
                t('settingsDeleteSuccessTitle'),
                t('settingsDeleteSuccessMessage'),
              );
            } catch (error) {
              console.error(error);
              Alert.alert(t('commonErrorTitle'), t('settingsDeleteFailed'));
            }
          }
        }
      ]
    );
  };

  const renderChoiceRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    currentValue: string,
    choices: { value: string; label: string }[],
    onSelect: (nextValue: string) => void,
    withBorder = true,
  ) => (
    <View className={`p-4 ${withBorder ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
      <View className="flex-row items-center">
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{label}</Text>
      </View>
      <View className="mt-3 flex-row flex-wrap">
        {choices.map((choice) => {
          const active = currentValue === choice.value;

          return (
            <TouchableOpacity
              key={choice.value}
              onPress={() => onSelect(choice.value)}
              className={`mr-2 mb-2 rounded-full px-3 py-2 ${
                active ? 'bg-[#4c669f]' : 'bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  active ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {choice.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-black">
      <View className="p-5">
        <ScreenHeader
          title={t('settingsTitle')}
          label={t('settingsLabel')}
          onBack={() => router.back()}
          containerClassName="mb-4 pt-10"
        />

        {loading ? (
          <ScreenState mode="loading" />
        ) : null}

        {!loading && !settings ? (
          <ScreenState
            mode="error"
            title={t('settingsLoadError')}
            actionLabel={t('commonRetry')}
            onAction={() => {
              void loadSettings();
            }}
            containerClassName="mb-6 px-0 py-0"
          />
        ) : null}

        {!loading && settings ? (
          <>
            <SettingsSection title={t('settingsSectionAccount')} containerClassName="mb-6">
              <TouchableOpacity
                onPress={() => router.push('/edit-profile')}
                className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800"
              >
                <Ionicons name="person-outline" size={22} color={iconColor} />
                <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{t('settingsEditProfile')}</Text>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/notifications')}
                className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800"
              >
                <Ionicons name="notifications-outline" size={22} color={iconColor} />
                <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{t('settingsNotificationInbox')}</Text>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/notification-settings')}
                className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800"
              >
                <Ionicons name="notifications-circle-outline" size={22} color={iconColor} />
                <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{t('settingsNotificationPreferences')}</Text>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/preferences')}
                className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800"
              >
                <Ionicons name="lock-closed-outline" size={22} color={iconColor} />
                <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{t('settingsInterestCenter')}</Text>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center p-4"
              >
                <Ionicons name="log-out-outline" size={22} color="#ff4757" />
                <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{t('settingsLogout')}</Text>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </TouchableOpacity>
            </SettingsSection>

            <SettingsSection title={t('settingsPrivacySection')} containerClassName="mb-6">
              <SettingsToggleRow
                icon="eye-outline"
                label={t('settingsProfilePublic')}
                value={settings.profilePublic}
                onValueChange={(nextValue) => {
                  void handleUpdateSetting('profilePublic', nextValue);
                }}
              />

              {renderChoiceRow(
                'globe-outline',
                t('settingsDefaultPostVisibility'),
                settings.defaultPostVisibility,
                [
                  { value: 'public', label: t('settingsVisibilityPublic') },
                  { value: 'friends', label: t('settingsVisibilityFriends') },
                  { value: 'private', label: t('settingsVisibilityPrivate') },
                ],
                (nextValue) => {
                  void handleUpdateSetting(
                    'defaultPostVisibility',
                    nextValue as PostVisibility,
                  );
                },
              )}

              {renderChoiceRow(
                'people-circle-outline',
                t('settingsOutingInviteScope'),
                settings.allowOutingInvitesFrom,
                [
                  { value: 'everyone', label: t('settingsOutingInviteEveryone') },
                  { value: 'connections', label: t('settingsOutingInviteConnections') },
                  { value: 'nobody', label: t('settingsOutingInviteNobody') },
                ],
                (nextValue) => {
                  void handleUpdateSetting(
                    'allowOutingInvitesFrom',
                    nextValue as OutingInviteScope,
                  );
                },
                false,
              )}
            </SettingsSection>

            <SettingsSection title={t('settingsAppSection')} containerClassName="mb-6">
              {renderChoiceRow(
                'contrast-outline',
                t('settingsTheme'),
                settings.theme,
                [
                  { value: 'system', label: t('settingsThemeSystem') },
                  { value: 'light', label: t('settingsThemeLight') },
                  { value: 'dark', label: t('settingsThemeDark') },
                ],
                (nextValue) => {
                  void handleUpdateSetting('theme', nextValue as AppTheme);
                },
              )}

              {renderChoiceRow(
                'language-outline',
                t('settingsLanguage'),
                settings.language,
                [
                  { value: 'fr', label: t('settingsLanguageFrench') },
                  { value: 'en', label: t('settingsLanguageEnglish') },
                ],
                (nextValue) => {
                  void handleUpdateSetting('language', nextValue as AppLanguage);
                },
              )}

              <SettingsToggleRow
                icon="cellular-outline"
                label={t('settingsDataSaver')}
                value={settings.dataSaver}
                onValueChange={(nextValue) => {
                  void handleUpdateSetting('dataSaver', nextValue);
                }}
              />

              <TouchableOpacity
                onPress={() => router.push('/help-support')}
                className="flex-row items-center p-4"
              >
                <Ionicons name="help-circle-outline" size={22} color={iconColor} />
                <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{t('settingsHelpSupport')}</Text>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </TouchableOpacity>
            </SettingsSection>
          </>
        ) : null}

        <SettingsSection
          title={t('settingsDangerSection')}
          containerClassName="mt-8"
          cardClassName="border border-red-100 dark:border-red-900/40"
        >
          <TouchableOpacity
            onPress={handleDeleteAccount}
            className="flex-row items-center p-4"
          >
            <Ionicons name="trash-outline" size={22} color="#ff4757" />
            <Text className="flex-1 ml-3 text-red-600 font-semibold text-base">{t('settingsDeleteAccount')}</Text>
            <Ionicons name="chevron-forward" size={20} color={chevronColor} />
          </TouchableOpacity>
        </SettingsSection>
        
        <Text className="text-center text-gray-400 mt-8 text-xs">Hangout Hub v1.0.0</Text>
      </View>
    </ScrollView>
  );
}
