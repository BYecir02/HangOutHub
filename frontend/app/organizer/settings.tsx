import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useOrganizerGuard } from '@/features/organizer/hooks/useOrganizerGuard';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import api, { isUnauthorizedError, storage } from '@/services/api';
import { setLanguagePreference } from '@/services/auth/app-preferences';
import { clearOfflineScans, listOfflineScans } from '@/services/organizer/organizer-scanner';
import { normalizeTeamWorkspaceRole } from '@/services/organizer/organizer-access';
import {
  getScannerPreferences,
  patchScannerPreferences,
  type ScannerPreferences,
} from '@/services/organizer/scanner-preferences';
import { clearStoredUserSession } from '@/services/auth/user-session';
import {
  getMySettings,
  type UserSettings,
  updateMySettings,
} from '@/services/user/settings';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import SettingsSection from '@/features/user/components/SettingsSection';
import SettingsToggleRow from '@/features/user/components/SettingsToggleRow';

const REMINDER_PRESETS = [1440, 180, 60] as const;
const DEFAULT_SCANNER_PREFERENCES: ScannerPreferences = {
  continuousScan: false,
  defaultTorchEnabled: false,
  defaultCameraFacing: 'back',
  ticketInfoMode: 'detailed',
};

function formatReminderOffset(offsetMin: number) {
  if (offsetMin % 1440 === 0) {
    const days = offsetMin / 1440;
    return days === 1 ? '1 jour' : `${days} jours`;
  }

  if (offsetMin % 60 === 0) {
    const hours = offsetMin / 60;
    return hours === 1 ? '1 heure' : `${hours} heures`;
  }

  return `${offsetMin} min`;
}

function normalizeReminderOffsets(offsets: number[]) {
  return Array.from(
    new Set(offsets.filter((offset) => Number.isInteger(offset))),
  )
    .filter((offset) => offset >= 15 && offset <= 10080)
    .sort((a, b) => b - a)
    .slice(0, 3);
}

export default function OrganizerSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const {
    user,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile();
  const teamWorkspaceRole = normalizeTeamWorkspaceRole(user?.teamRole);
  const isScannerWorkspace = teamWorkspaceRole === 'SCANNER';
  const isAllowed = useOrganizerGuard({
    user,
    loading: profileLoading,
    suspend: Boolean(profileError),
    requiredCapability: 'settings',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [scannerPreferences, setScannerPreferences] = useState<ScannerPreferences>(
    DEFAULT_SCANNER_PREFERENCES,
  );
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [customReminderInput, setCustomReminderInput] = useState('');

  const handleInvalidSession = useCallback(async () => {
    await clearStoredUserSession();
    await clearOfflineScans().catch(() => {});
    router.replace('/');
  }, [router]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [next, nextScannerPreferences, queuedScans] = await Promise.all([
        getMySettings(),
        getScannerPreferences(),
        listOfflineScans(),
      ]);
      const fallbackLegacyOffsets = normalizeReminderOffsets([
        next.organizerNotifyReminderD1 ? 1440 : 0,
        next.organizerNotifyReminderH3 ? 180 : 0,
        next.organizerNotifyReminderH1 ? 60 : 0,
      ]);

      setSettings({
        ...next,
        organizerReminderMode:
          next.organizerReminderMode === 'custom' ? 'custom' : 'preset',
        organizerReminderOffsetsMin:
          normalizeReminderOffsets(next.organizerReminderOffsetsMin || []).length > 0
            ? normalizeReminderOffsets(next.organizerReminderOffsetsMin || [])
            : fallbackLegacyOffsets,
      });
      setScannerPreferences(nextScannerPreferences);
      setOfflineQueueCount(queuedScans.length);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [handleInvalidSession]);

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

  const patchScanner = <K extends keyof ScannerPreferences>(
    key: K,
    value: ScannerPreferences[K],
  ) => {
    setScannerPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const addReminderOffset = (offsetMin: number) => {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      if (offsetMin < 15 || offsetMin > 10080) {
        return current;
      }

      const nextOffsets = normalizeReminderOffsets([
        ...(current.organizerReminderOffsetsMin || []),
        offsetMin,
      ]);

      if (nextOffsets.length === 0 || nextOffsets.length > 3) {
        return current;
      }

      return {
        ...current,
        organizerReminderMode: 'custom',
        organizerReminderOffsetsMin: nextOffsets,
      };
    });
  };

  const removeReminderOffset = (offsetMin: number) => {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      const nextOffsets = normalizeReminderOffsets(
        (current.organizerReminderOffsetsMin || []).filter(
          (offset) => offset !== offsetMin,
        ),
      );

      return {
        ...current,
        organizerReminderOffsetsMin: nextOffsets,
      };
    });
  };

  const addCustomReminderFromInput = () => {
    const parsed = Number(customReminderInput);
    if (!Number.isInteger(parsed)) {
      Alert.alert(t('commonErrorTitle'), t('organizerSettingsReminderCustomInvalid'));
      return;
    }

    if (parsed < 15 || parsed > 10080) {
      Alert.alert(t('commonErrorTitle'), t('organizerSettingsReminderCustomRange'));
      return;
    }

    if ((settings?.organizerReminderOffsetsMin || []).length >= 3) {
      Alert.alert(t('commonErrorTitle'), t('organizerSettingsReminderCustomMax'));
      return;
    }

    addReminderOffset(parsed);
    setCustomReminderInput('');
  };

  const saveAll = async () => {
    if (!settings) {
      return;
    }

    setSaving(true);
    try {
      const normalizedOffsets = normalizeReminderOffsets(
        settings.organizerReminderOffsetsMin || [],
      );

      const payload: UserSettings = {
        ...settings,
        organizerReminderOffsetsMin: normalizedOffsets,
        organizerNotifyReminderD1: normalizedOffsets.includes(1440),
        organizerNotifyReminderH3: normalizedOffsets.includes(180),
        organizerNotifyReminderH1: normalizedOffsets.includes(60),
        organizerReminderMode:
          settings.organizerReminderMode === 'custom' && normalizedOffsets.length > 0
            ? 'custom'
            : 'preset',
      };

      const saved = await updateMySettings(payload);
      const normalizedSavedOffsets = normalizeReminderOffsets(
        saved.organizerReminderOffsetsMin || [],
      );

      const savedScannerPreferences =
        await patchScannerPreferences(scannerPreferences);

      await setLanguagePreference(payload.language);

      setSettings({
        ...saved,
        organizerReminderMode:
          saved.organizerReminderMode === 'custom' ? 'custom' : 'preset',
        organizerReminderOffsetsMin:
          normalizedSavedOffsets.length > 0
            ? normalizedSavedOffsets
            : normalizeReminderOffsets([
                saved.organizerNotifyReminderD1 ? 1440 : 0,
                saved.organizerNotifyReminderH3 ? 180 : 0,
                saved.organizerNotifyReminderH1 ? 60 : 0,
              ]),
      });
      setScannerPreferences(savedScannerPreferences);
      Alert.alert(t('organizerSettingsSavedTitle'), t('organizerSettingsSavedMessage'));
    } catch {
      Alert.alert(t('commonErrorTitle'), t('organizerSettingsSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const clearOfflineQueue = () => {
    if (offlineQueueCount === 0) {
      Alert.alert(
        t('organizerSettingsScannerOfflineClearTitle'),
        t('organizerSettingsScannerOfflineClearEmpty'),
      );
      return;
    }

    Alert.alert(
      t('organizerSettingsScannerOfflineClearTitle'),
      t('organizerSettingsScannerOfflineClearMessage', { count: offlineQueueCount }),
      [
        { text: t('genericCancel'), style: 'cancel' },
        {
          text: t('organizerSettingsScannerOfflineClearAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              const removed = await clearOfflineScans();
              setOfflineQueueCount((current) => Math.max(0, current - removed));
              Alert.alert(
                t('organizerSettingsScannerOfflineClearTitle'),
                t('organizerSettingsScannerOfflineClearSuccess', { count: removed }),
              );
            } catch {
              Alert.alert(
                t('commonErrorTitle'),
                t('organizerSettingsScannerOfflineClearFailed'),
              );
            }
          },
        },
      ],
    );
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
      <ScreenState mode="loading" fullScreen containerClassName="bg-gray-50 dark:bg-black" />
    );
  }

  if (profileLoading) {
    return (
      <ScreenState mode="loading" fullScreen containerClassName="bg-gray-50 dark:bg-black" />
    );
  }

  if (profileError && !user) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('organizerDataLoadErrorTitle')}
        description={t('organizerDataLoadErrorMessage')}
        actionLabel={t('organizerDataRetry')}
        onAction={() => {
          void refetchProfile();
        }}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (!user || !isAllowed) {
    return (
      <ScreenState mode="loading" fullScreen containerClassName="bg-gray-50 dark:bg-black" />
    );
  }

  if (!settings) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('organizerSettingsLoadError')}
        actionLabel={t('commonRetry')}
        onAction={() => {
          void loadSettings();
        }}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black">
      <ScreenHeader
        title={t('organizerSettingsTitle')}
        subtitle={t('organizerSettingsSubtitle')}
        label={t('organizerSettingsLabel')}
        containerClassName="mb-5"
      />

      {!isScannerWorkspace ? (
        <SettingsSection title={t('organizerSettingsSectionNotifications')} containerClassName="mb-5">
        <SettingsToggleRow
          label={t('organizerSettingsNotifyBookings')}
          value={settings.organizerNotifyBookings}
          onValueChange={(next) => patch('organizerNotifyBookings', next)}
        />
        <SettingsToggleRow
          label={t('organizerSettingsNotifyTeam')}
          value={settings.organizerNotifyTeamUpdates}
          onValueChange={(next) => patch('organizerNotifyTeamUpdates', next)}
        />
        <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
            {t('organizerSettingsReminderMode')}
          </Text>
          <View className="flex-row gap-2">
            {(['preset', 'custom'] as const).map((mode) => {
              const active = settings.organizerReminderMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    setSettings((current) => {
                      if (!current) {
                        return current;
                      }

                      if (mode === 'preset') {
                        return {
                          ...current,
                          organizerReminderMode: 'preset',
                          organizerReminderOffsetsMin: [...REMINDER_PRESETS],
                        };
                      }

                      return {
                        ...current,
                        organizerReminderMode: 'custom',
                        organizerReminderOffsetsMin: normalizeReminderOffsets(
                          current.organizerReminderOffsetsMin || [...REMINDER_PRESETS],
                        ),
                      };
                    });
                  }}
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
                    {mode === 'preset'
                      ? t('organizerSettingsReminderModePreset')
                      : t('organizerSettingsReminderModeCustom')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {settings.organizerReminderMode === 'preset' ? (
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('organizerSettingsReminderPresetHelp')}
            </Text>
          ) : null}
        </View>

        {settings.organizerReminderMode === 'custom' ? (
          <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
              {t('organizerSettingsReminderCustomTitle')}
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {REMINDER_PRESETS.map((offset) => {
                const isSelected = (settings.organizerReminderOffsetsMin || []).includes(
                  offset,
                );
                return (
                  <TouchableOpacity
                    key={offset}
                    onPress={() => addReminderOffset(offset)}
                    disabled={isSelected}
                    className={`rounded-full px-3 py-2 ${
                      isSelected
                        ? 'bg-[#92A5C7]'
                        : 'bg-gray-200 dark:bg-gray-800'
                    }`}
                  >
                    <Text className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {formatReminderOffset(offset)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="mt-3 flex-row items-center gap-2">
              <TextInput
                value={customReminderInput}
                onChangeText={setCustomReminderInput}
                keyboardType="numeric"
                placeholder={t('organizerSettingsReminderCustomPlaceholder')}
                placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-3 text-gray-900 dark:bg-gray-800 dark:text-white"
              />
              <TouchableOpacity
                onPress={addCustomReminderFromInput}
                className="rounded-xl bg-[#4c669f] px-4 py-3"
              >
                <Text className="text-xs font-semibold text-white">
                  {t('organizerSettingsReminderAdd')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('organizerSettingsReminderCustomHint')}
            </Text>

            <View className="mt-3 flex-row flex-wrap gap-2">
              {(settings.organizerReminderOffsetsMin || []).map((offset) => (
                <TouchableOpacity
                  key={`reminder-${offset}`}
                  onPress={() => removeReminderOffset(offset)}
                  className="rounded-full bg-[#4c669f]/10 px-3 py-2"
                >
                  <Text className="text-xs font-semibold text-[#4c669f]">
                    {formatReminderOffset(offset)} x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
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
        </SettingsSection>
      ) : null}

      <SettingsSection
        title={
          isScannerWorkspace
            ? t('organizerSettingsSectionScannerWorkspace')
            : t('organizerSettingsSectionScanner')
        }
        containerClassName="mb-5"
      >
        {isScannerWorkspace ? (
          <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {t('organizerSettingsScannerWorkspaceHint')}
            </Text>
          </View>
        ) : null}
        <SettingsToggleRow
          label={t('organizerSettingsScannerOfflineAuto')}
          value={settings.organizerScannerOfflineAuto}
          onValueChange={(next) => patch('organizerScannerOfflineAuto', next)}
        />
        <SettingsToggleRow
          label={t('organizerSettingsScannerAutoSync')}
          value={settings.organizerScannerAutoSync}
          onValueChange={(next) => patch('organizerScannerAutoSync', next)}
        />
        <SettingsToggleRow
          label={t('organizerSettingsScannerHaptics')}
          value={settings.organizerScannerHaptics}
          onValueChange={(next) => patch('organizerScannerHaptics', next)}
        />
        <SettingsToggleRow
          label={t('organizerSettingsScannerSound')}
          value={settings.organizerScannerSound}
          onValueChange={(next) => patch('organizerScannerSound', next)}
        />
        <SettingsToggleRow
          label={t('organizerSettingsScannerStrictWindow')}
          value={settings.organizerScannerStrictWindow}
          onValueChange={(next) => patch('organizerScannerStrictWindow', next)}
        />
        <SettingsToggleRow
          label={t('organizerSettingsScannerContinuousScan')}
          value={scannerPreferences.continuousScan}
          onValueChange={(next) => patchScanner('continuousScan', next)}
        />
        <SettingsToggleRow
          label={t('organizerSettingsScannerTorchDefault')}
          value={scannerPreferences.defaultTorchEnabled}
          onValueChange={(next) => patchScanner('defaultTorchEnabled', next)}
        />

        <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
            {t('organizerSettingsScannerCameraFacing')}
          </Text>
          <View className="flex-row gap-2">
            {(['back', 'front'] as const).map((cameraFacing) => {
              const active = scannerPreferences.defaultCameraFacing === cameraFacing;
              return (
                <TouchableOpacity
                  key={cameraFacing}
                  onPress={() => patchScanner('defaultCameraFacing', cameraFacing)}
                  className={`rounded-full px-3 py-2 ${
                    active ? 'bg-[#4c669f]' : 'bg-gray-200 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {cameraFacing === 'back'
                      ? t('organizerSettingsScannerCameraBack')
                      : t('organizerSettingsScannerCameraFront')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
            {t('organizerSettingsScannerTicketInfoMode')}
          </Text>
          <View className="flex-row gap-2">
            {(['detailed', 'compact'] as const).map((ticketInfoMode) => {
              const active = scannerPreferences.ticketInfoMode === ticketInfoMode;
              return (
                <TouchableOpacity
                  key={ticketInfoMode}
                  onPress={() => patchScanner('ticketInfoMode', ticketInfoMode)}
                  className={`rounded-full px-3 py-2 ${
                    active ? 'bg-[#4c669f]' : 'bg-gray-200 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {ticketInfoMode === 'detailed'
                      ? t('organizerSettingsScannerTicketInfoDetailed')
                      : t('organizerSettingsScannerTicketInfoCompact')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <Text className="mb-2 text-sm text-gray-700 dark:text-gray-200">
            {t('settingsLanguage')}
          </Text>
          <View className="flex-row gap-2">
            {(['fr', 'en'] as const).map((languageCode) => {
              const active = settings.language === languageCode;
              return (
                <TouchableOpacity
                  key={languageCode}
                  onPress={() => patch('language', languageCode)}
                  className={`rounded-full px-3 py-2 ${
                    active ? 'bg-[#4c669f]' : 'bg-gray-200 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {languageCode === 'fr'
                      ? t('settingsLanguageFrench')
                      : t('settingsLanguageEnglish')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="px-4 py-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {t('organizerSettingsScannerOfflinePendingCount', {
              count: offlineQueueCount,
            })}
          </Text>
          <TouchableOpacity
            onPress={clearOfflineQueue}
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-500/50 dark:bg-red-500/10"
          >
            <Text className="text-center text-xs font-semibold text-red-600 dark:text-red-300">
              {t('organizerSettingsScannerOfflineClearAction')}
            </Text>
          </TouchableOpacity>
        </View>
      </SettingsSection>

      {!isScannerWorkspace ? (
        <SettingsSection title={t('organizerSettingsSectionDefaults')} containerClassName="mb-5">
        <View className="p-4">
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
        </SettingsSection>
      ) : null}

      {!isScannerWorkspace ? (
        <SettingsSection title={t('organizerSettingsSectionTeam')} containerClassName="mb-5">
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

        <SettingsToggleRow
          label={t('organizerSettingsTeamRequireRemovalConfirm')}
          value={settings.organizerTeamRequireRemovalConfirm}
          withBorder={false}
          onValueChange={(next) => patch('organizerTeamRequireRemovalConfirm', next)}
        />
        </SettingsSection>
      ) : null}

      <TouchableOpacity
        onPress={() => {
          void saveAll();
        }}
        disabled={saving}
        className={`mt-2 rounded-2xl py-4 ${
          saving ? 'bg-[#92A5C7]' : 'bg-[#4c669f]'
        }`}
      >
        <Text className="text-center text-base font-semibold text-white">
          {saving ? t('organizerSettingsSaving') : t('organizerSettingsSaveAction')}
        </Text>
      </TouchableOpacity>

      <SettingsSection title={t('organizerSettingsSectionAccount')} containerClassName="mt-3 mb-16">
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
      </SettingsSection>
    </ScrollView>
  );
}
