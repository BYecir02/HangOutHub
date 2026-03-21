import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
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
        <View className="flex-row items-center mb-4 pt-10">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('settingsTitle')}
          </Text>
        </View>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#4c669f" />
          </View>
        ) : null}

        {!loading && !settings ? (
          <View className="bg-white dark:bg-gray-900 rounded-xl p-5 mb-6">
            <Text className="text-gray-700 dark:text-gray-200 font-semibold mb-2">
              {t('settingsLoadError')}
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
          <>
            {/* Section Compte */}
            <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase text-xs tracking-wider">{t('settingsSectionAccount')}</Text>
            <View className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden mb-6">
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
                className="flex-row items-center p-4"
              >
                <Ionicons name="lock-closed-outline" size={22} color={iconColor} />
                <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{t('settingsInterestCenter')}</Text>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </TouchableOpacity>
            </View>

            {/* Section Confidentialite */}
            <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase text-xs tracking-wider">{t('settingsPrivacySection')}</Text>
            <View className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden mb-6">
              {renderToggleRow(
                'eye-outline',
                t('settingsProfilePublic'),
                settings.profilePublic,
                (nextValue) => {
                  void handleUpdateSetting('profilePublic', nextValue);
                },
              )}

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
            </View>

            {/* Section Application */}
            <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase text-xs tracking-wider">{t('settingsAppSection')}</Text>
            <View className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden mb-6">
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

              {renderToggleRow(
                'cellular-outline',
                t('settingsDataSaver'),
                settings.dataSaver,
                (nextValue) => {
                  void handleUpdateSetting('dataSaver', nextValue);
                },
              )}

              <TouchableOpacity
                onPress={() => router.push('/help-support')}
                className="flex-row items-center p-4"
              >
                <Ionicons name="help-circle-outline" size={22} color={iconColor} />
                <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">{t('settingsHelpSupport')}</Text>
                <Ionicons name="chevron-forward" size={20} color={chevronColor} />
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {/* Bouton Déconnexion */}
        <TouchableOpacity onPress={handleLogout} className="flex-row items-center justify-center bg-gray-200 dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 mt-4">
          <Ionicons name="log-out-outline" size={22} color={isDark ? "#fff" : "#333"} />
           <Text className="ml-2 text-gray-800 dark:text-white font-bold text-base">{t('settingsLogout')}</Text>
        </TouchableOpacity>

        {/* Zone Danger */}
        <View className="mt-8">
             <Text className="text-red-500 font-bold mb-2 uppercase text-xs tracking-wider">{t('settingsDangerSection')}</Text>
             <TouchableOpacity onPress={handleDeleteAccount} className="flex-row items-center justify-center bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                <Ionicons name="trash-outline" size={22} color="#ff4757" />
               <Text className="ml-2 text-red-600 font-bold text-base">{t('settingsDeleteAccount')}</Text>
             </TouchableOpacity>
        </View>
        
        <Text className="text-center text-gray-400 mt-8 text-xs">Hangout Hub v1.0.0</Text>
      </View>
    </ScrollView>
  );
}