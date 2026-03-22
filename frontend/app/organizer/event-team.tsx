import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import { getApiErrorMessage } from '@/services/api';
import { discoverUsers } from '@/services/friendships';
import {
  addEventCollaborator,
  EventCollaboratorPermission,
  EventCollaboratorItem,
  listEventCollaborators,
  removeEventCollaborator,
} from '@/services/event-collaborators';
import { DiscoverUser } from '@/types/social';

export default function OrganizerEventTeamScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<EventCollaboratorItem[]>([]);
  const [newUserId, setNewUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<DiscoverUser[]>([]);
  const [newPermission, setNewPermission] =
    useState<EventCollaboratorPermission>('EDIT');

  const collaborators = useMemo(
    () =>
      items.slice().sort((a, b) => {
        const aName = (a.User.displayName || a.User.username || '').toLowerCase();
        const bName = (b.User.displayName || b.User.username || '').toLowerCase();
        return aName.localeCompare(bName);
      }),
    [items],
  );

  const loadCollaborators = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      const response = await listEventCollaborators(eventId);
      setItems(response);
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('organizerTeamLoadFailed')),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCollaborators();
  }, [eventId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const normalizedQuery = searchQuery.trim();

      if (normalizedQuery.length < 2) {
        setSearchLoading(false);
        setSearchResults([]);
        return;
      }

      const runSearch = async () => {
        setSearchLoading(true);
        try {
          const results = await discoverUsers(normalizedQuery);
          const alreadyInTeam = new Set(items.map((item) => item.userId));
          setSearchResults(
            results.filter((user) => !alreadyInTeam.has(user.id)),
          );
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      };

      void runSearch();
    }, 280);

    return () => clearTimeout(timeout);
  }, [searchQuery, items]);

  const handleAdd = async () => {
    if (!eventId) {
      return;
    }

    if (!newUserId.trim()) {
      Alert.alert(t('commonErrorTitle'), t('organizerTeamUserIdRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const updated = await addEventCollaborator(eventId, {
        userId: newUserId.trim(),
        permission: newPermission,
      });
      setItems(updated);
      setNewUserId('');
      setSearchQuery('');
      setSearchResults([]);
      Alert.alert(t('organizerTeamAddSuccessTitle'), t('organizerTeamAddSuccessMessage'));
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('organizerTeamAddFailed')),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = (collaboratorUserId: string) => {
    Alert.alert(
      t('organizerTeamRemoveConfirmTitle'),
      t('organizerTeamRemoveConfirmMessage'),
      [
        {
          text: t('genericCancel'),
          style: 'cancel',
        },
        {
          text: t('organizerTeamRemoveAction'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const updated = await removeEventCollaborator(
                  eventId,
                  collaboratorUserId,
                );
                setItems(updated);
              } catch (error) {
                Alert.alert(
                  t('commonErrorTitle'),
                  getApiErrorMessage(error, t('organizerTeamRemoveFailed')),
                );
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black">
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 rounded-full bg-white p-2 dark:bg-gray-800"
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={isDark ? '#fff' : '#1F2937'}
          />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('organizerTeamLabel')}
          </Text>
          <Text className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {t('organizerTeamTitle')}
          </Text>
        </View>
      </View>

      <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t('organizerTeamSubtitle')}
      </Text>

      <View className="mt-6 rounded-3xl bg-white p-4 dark:bg-gray-900">
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('organizerTeamAddSectionTitle')}
        </Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('organizerTeamSearchPlaceholder')}
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          autoCapitalize="none"
          className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        {searchQuery.trim().length >= 2 ? (
          <View className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
            {searchLoading ? (
              <ActivityIndicator color="#4c669f" />
            ) : searchResults.length > 0 ? (
              searchResults.slice(0, 5).map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => {
                    setNewUserId(user.id);
                    setSearchQuery(user.displayName || user.username || user.id);
                  }}
                  className="mb-2 rounded-lg bg-white px-3 py-2 dark:bg-gray-900"
                >
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user.displayName || user.username || user.id}
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    @{user.username || 'unknown'}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t('organizerTeamSearchEmpty')}
              </Text>
            )}
          </View>
        ) : null}

        <TextInput
          value={newUserId}
          onChangeText={setNewUserId}
          placeholder={t('organizerTeamUserIdPlaceholder')}
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          autoCapitalize="none"
          className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        <View className="mt-3 flex-row gap-2">
          <TouchableOpacity
            onPress={() => setNewPermission('EDIT')}
            className={`flex-1 rounded-xl border px-3 py-3 ${
              newPermission === 'EDIT'
                ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                newPermission === 'EDIT'
                  ? 'text-[#4c669f]'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {t('organizerTeamPermissionEdit')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setNewPermission('SCAN')}
            className={`flex-1 rounded-xl border px-3 py-3 ${
              newPermission === 'SCAN'
                ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                newPermission === 'SCAN'
                  ? 'text-[#4c669f]'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {t('organizerTeamPermissionScan')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          disabled={submitting}
          onPress={() => void handleAdd()}
          className={`mt-4 rounded-2xl px-4 py-3 ${
            submitting ? 'bg-[#92A5C7]' : 'bg-[#4c669f]'
          }`}
        >
          <Text className="text-center font-semibold text-white">
            {submitting ? t('organizerTeamAdding') : t('organizerTeamAddAction')}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-5 rounded-3xl bg-white p-4 dark:bg-gray-900">
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('organizerTeamMembersCount', { count: collaborators.length })}
        </Text>

        {collaborators.length === 0 ? (
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('organizerTeamEmpty')}
          </Text>
        ) : (
          <View className="mt-3">
            {collaborators.map((item) => (
              <View
                key={item.userId}
                className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {item.User.displayName || item.User.username || item.userId}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  @{item.User.username || 'unknown'}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-[#4c669f]">
                    {item.permission === 'SCAN'
                      ? t('organizerTeamPermissionScan')
                      : t('organizerTeamPermissionEdit')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemove(item.userId)}
                    className="rounded-full bg-red-100 px-3 py-1.5 dark:bg-red-900/30"
                  >
                    <Text className="text-xs font-semibold text-red-600 dark:text-red-300">
                      {t('organizerTeamRemoveAction')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="pb-20" />
    </ScrollView>
  );
}
