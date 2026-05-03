import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

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
import {
  DEFAULT_SCANNER_PREFERENCES,
  REMINDER_PRESETS,
  normalizeReminderOffsets,
} from '@/features/organizer/utils/settings-helpers';
import OrganizerNotificationsSection from '@/features/organizer/components/settings/OrganizerNotificationsSection';
import OrganizerScannerSection from '@/features/organizer/components/settings/OrganizerScannerSection';
import OrganizerDefaultsSection from '@/features/organizer/components/settings/OrganizerDefaultsSection';
import OrganizerTeamSection from '@/features/organizer/components/settings/OrganizerTeamSection';
import OrganizerAccountSection from '@/features/organizer/components/settings/OrganizerAccountSection';

export default function OrganizerSettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
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
        <OrganizerNotificationsSection
          settings={settings}
          customReminderInput={customReminderInput}
          onCustomReminderInputChange={setCustomReminderInput}
          onPatch={patch}
          onSetSettings={setSettings}
          onAddReminderOffset={addReminderOffset}
          onRemoveReminderOffset={removeReminderOffset}
          onAddCustomReminderFromInput={addCustomReminderFromInput}
        />
      ) : null}

      <OrganizerScannerSection
        settings={settings}
        scannerPreferences={scannerPreferences}
        offlineQueueCount={offlineQueueCount}
        isScannerWorkspace={isScannerWorkspace}
        onPatch={patch}
        onPatchScanner={patchScanner}
        onClearOfflineQueue={clearOfflineQueue}
      />

      {!isScannerWorkspace ? (
        <OrganizerDefaultsSection
          settings={settings}
          onPatch={patch}
        />
      ) : null}

      {!isScannerWorkspace ? (
        <OrganizerTeamSection
          settings={settings}
          onPatch={patch}
        />
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

      <OrganizerAccountSection
        onExitPanel={() => router.replace('/(tabs)/home')}
        onLogout={() => {
          void handleLogout();
        }}
      />
    </ScrollView>
  );
}
