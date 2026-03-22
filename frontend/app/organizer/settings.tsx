import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api, { storage } from '@/services/api';
import { clearStoredUserSession } from '@/services/user-session';
import {
  getMySettings,
  type UserSettings,
  updateMySettings,
} from '@/services/settings';

function SectionTitle({ label }: { label: string }) {
  return (
    <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
      {label}
    </Text>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <Text className="mr-3 flex-1 text-sm text-gray-700 dark:text-gray-200">
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#d1d5db', true: '#4c669f' }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

export default function OrganizerSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getMySettings();
      setSettings(next);
    } catch {
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

  const patch = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const saveAll = async () => {
    if (!settings) {
      return;
    }

    setSaving(true);
    try {
      await updateMySettings(settings);
      Alert.alert(t('organizerSettingsSavedTitle'), t('organizerSettingsSavedMessage'));
    } catch {
      Alert.alert(t('commonErrorTitle'), t('organizerSettingsSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(t('settingsLogoutTitle'), t('settingsLogoutMessage'), [
      { text: t('genericCancel'), style: 'cancel' },
      {
        text: t('settingsLogoutConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/auth/logout').catch(() => {});
            await storage.removeItem('userToken');
            await storage.removeItem('refreshToken');
            await clearStoredUserSession();
            router.replace('/');
          } catch {
            Alert.alert(t('commonErrorTitle'), t('settingsLogoutFailed'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  if (!settings) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-black">
        <Text className="text-center text-base text-gray-700 dark:text-gray-200">
          {t('organizerSettingsLoadError')}
        </Text>
        <TouchableOpacity
          onPress={() => {
            void loadSettings();
          }}
          className="mt-4 rounded-xl bg-[#4c669f] px-4 py-3"
        >
          <Text className="font-semibold text-white">{t('commonRetry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black">
      <View className="mb-3">
        <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t('organizerSettingsLabel')}
        </Text>
        <Text className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          {t('organizerSettingsTitle')}
        </Text>
      </View>
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        {t('organizerSettingsSubtitle')}
      </Text>

      <SectionTitle label={t('organizerSettingsSectionNotifications')} />
      <View className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
        <ToggleRow
          label={t('organizerSettingsNotifyBookings')}
          value={settings.organizerNotifyBookings}
          onChange={(next) => patch('organizerNotifyBookings', next)}
        />
        <ToggleRow
          label={t('organizerSettingsNotifyTeam')}
          value={settings.organizerNotifyTeamUpdates}
          onChange={(next) => patch('organizerNotifyTeamUpdates', next)}
        />
        <ToggleRow
          label={t('organizerSettingsNotifyReminderD1')}
          value={settings.organizerNotifyReminderD1}
          onChange={(next) => patch('organizerNotifyReminderD1', next)}
        />
        <ToggleRow
          label={t('organizerSettingsNotifyReminderH3')}
          value={settings.organizerNotifyReminderH3}
          onChange={(next) => patch('organizerNotifyReminderH3', next)}
        />
        <ToggleRow
          label={t('organizerSettingsNotifyReminderH1')}
          value={settings.organizerNotifyReminderH1}
          onChange={(next) => patch('organizerNotifyReminderH1', next)}
        />
        <View className="px-4 py-3">
          <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
            {t('organizerSettingsPriorityMin')}
          </Text>
          <View className="flex-row gap-2">
            {(['IMPORTANT', 'URGENT'] as const).map((level) => {
              const active = settings.organizerNotificationPriorityMin === level;
              return (
                <TouchableOpacity
                  key={level}
                  onPress={() => patch('organizerNotificationPriorityMin', level)}
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
                    {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <SectionTitle label={t('organizerSettingsSectionScanner')} />
      <View className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
        <ToggleRow
          label={t('organizerSettingsScannerOfflineAuto')}
          value={settings.organizerScannerOfflineAuto}
          onChange={(next) => patch('organizerScannerOfflineAuto', next)}
        />
        <ToggleRow
          label={t('organizerSettingsScannerAutoSync')}
          value={settings.organizerScannerAutoSync}
          onChange={(next) => patch('organizerScannerAutoSync', next)}
        />
        <ToggleRow
          label={t('organizerSettingsScannerHaptics')}
          value={settings.organizerScannerHaptics}
          onChange={(next) => patch('organizerScannerHaptics', next)}
        />
        <ToggleRow
          label={t('organizerSettingsScannerSound')}
          value={settings.organizerScannerSound}
          onChange={(next) => patch('organizerScannerSound', next)}
        />
        <ToggleRow
          label={t('organizerSettingsScannerStrictWindow')}
          value={settings.organizerScannerStrictWindow}
          onChange={(next) => patch('organizerScannerStrictWindow', next)}
        />
      </View>

      <SectionTitle label={t('organizerSettingsSectionDefaults')} />
      <View className="overflow-hidden rounded-2xl bg-white p-4 dark:bg-gray-900">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultCheckInOpen')}
        </Text>
        <TextInput
          value={String(settings.organizerDefaultCheckInOpenOffsetMin)}
          onChangeText={(value) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              patch('organizerDefaultCheckInOpenOffsetMin', Math.trunc(parsed));
            }
          }}
          keyboardType="numbers-and-punctuation"
          className="mt-1 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
        />

        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultCheckInClose')}
        </Text>
        <TextInput
          value={String(settings.organizerDefaultCheckInCloseOffsetMin)}
          onChangeText={(value) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              patch('organizerDefaultCheckInCloseOffsetMin', Math.trunc(parsed));
            }
          }}
          keyboardType="numbers-and-punctuation"
          className="mt-1 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
        />

        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultMaxTickets')}
        </Text>
        <TextInput
          value={String(settings.organizerDefaultMaxTicketsPerUser)}
          onChangeText={(value) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              patch('organizerDefaultMaxTicketsPerUser', Math.trunc(parsed));
            }
          }}
          keyboardType="numeric"
          className="mt-1 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
        />

        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultCancellationPolicy')}
        </Text>
        <TextInput
          value={settings.organizerDefaultCancellationPolicy || ''}
          onChangeText={(value) => patch('organizerDefaultCancellationPolicy', value)}
          multiline
          className="mt-1 h-20 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
          textAlignVertical="top"
        />

        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('organizerSettingsDefaultRefundPolicy')}
        </Text>
        <TextInput
          value={settings.organizerDefaultRefundPolicy || ''}
          onChangeText={(value) => patch('organizerDefaultRefundPolicy', value)}
          multiline
          className="mt-1 h-20 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
          textAlignVertical="top"
        />
      </View>

      <SectionTitle label={t('organizerSettingsSectionTeam')} />
      <View className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
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
                  onPress={() => patch('organizerTeamInviteScope', scope)}
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
                  onPress={() => patch('organizerTeamDefaultPermission', permission)}
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

        <ToggleRow
          label={t('organizerSettingsTeamRequireRemovalConfirm')}
          value={settings.organizerTeamRequireRemovalConfirm}
          onChange={(next) => patch('organizerTeamRequireRemovalConfirm', next)}
        />
      </View>

      <TouchableOpacity
        onPress={() => {
          void saveAll();
        }}
        disabled={saving}
        className={`mt-6 rounded-2xl py-4 ${
          saving ? 'bg-[#92A5C7]' : 'bg-[#4c669f]'
        }`}
      >
        <Text className="text-center text-base font-semibold text-white">
          {saving ? t('organizerSettingsSaving') : t('organizerSettingsSaveAction')}
        </Text>
      </TouchableOpacity>

      <SectionTitle label={t('organizerSettingsSectionAccount')} />
      <View className="mb-16 overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
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
          onPress={handleLogout}
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
      </View>
    </ScrollView>
  );
}
