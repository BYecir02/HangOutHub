import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import FilterChipsBar, { type FilterChipOption } from '@/shared/ui/FilterChipsBar';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useOrganizerGuard } from '@/features/organizer/hooks/useOrganizerGuard';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { getApiErrorMessage } from '@/services/api';
import { discoverUsers } from '@/services/user/friendships';
import {
  type PlaceTeamMemberItem,
  type PlaceTeamRole,
  listPlaceTeam,
  removePlaceTeamMember,
  upsertPlaceTeamMember,
} from '@/services/places/place-team';
import type { DiscoverUser } from '@/types/social';

export default function OrganizerPlaceTeamScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const {
    user,
    ownedPlaces,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile();
  const isAllowed = useOrganizerGuard({
    user,
    loading: profileLoading,
    suspend: Boolean(profileError),
    requiredCapability: 'placeTeam',
  });

  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [members, setMembers] = useState<PlaceTeamMemberItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<DiscoverUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlaceTeamRole>('STAFF');
  const [adding, setAdding] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const membersSorted = useMemo(
    () =>
      members.slice().sort((a, b) => {
        const aName = (a.User.displayName || a.User.username || '').toLowerCase();
        const bName = (b.User.displayName || b.User.username || '').toLowerCase();
        return aName.localeCompare(bName);
      }),
    [members],
  );

  const placeOptions = useMemo<readonly FilterChipOption<string>[]>(
    () =>
      ownedPlaces.map((place) => ({
        key: place.id,
        label: place.name,
      })),
    [ownedPlaces],
  );

  const memberIds = useMemo(() => new Set(members.map((entry) => entry.userId)), [members]);

  const loadMembers = useCallback(async () => {
    if (!selectedPlaceId) {
      setMembers([]);
      return;
    }

    setTeamLoading(true);
    setTeamError(null);
    try {
      const data = await listPlaceTeam(selectedPlaceId);
      setMembers(data);
    } catch (error) {
      setTeamError(getApiErrorMessage(error, t('organizerPlaceTeamLoadFailed')));
      setMembers([]);
    } finally {
      setTeamLoading(false);
    }
  }, [selectedPlaceId, t]);

  useEffect(() => {
    if (!selectedPlaceId && ownedPlaces.length > 0) {
      setSelectedPlaceId(ownedPlaces[0].id);
    }
  }, [ownedPlaces, selectedPlaceId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const normalizedQuery = searchQuery.trim();
      if (normalizedQuery.length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      const runSearch = async () => {
        setSearchLoading(true);
        try {
          const results = await discoverUsers(normalizedQuery);
          setSearchResults(results.filter((candidate) => !memberIds.has(candidate.id)));
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      };

      void runSearch();
    }, 250);

    return () => clearTimeout(timeout);
  }, [memberIds, searchQuery]);

  const handleAddMember = async () => {
    if (!selectedPlaceId || !selectedUserId) {
      Alert.alert(t('commonErrorTitle'), t('organizerPlaceTeamUserRequired'));
      return;
    }

    setAdding(true);
    try {
      const updated = await upsertPlaceTeamMember(selectedPlaceId, {
        userId: selectedUserId,
        role: selectedRole,
      });
      setMembers(updated);
      setSearchQuery('');
      setSelectedUserId('');
      setSearchResults([]);
      Alert.alert(
        t('organizerPlaceTeamAddSuccessTitle'),
        t('organizerPlaceTeamAddSuccessMessage'),
      );
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('organizerPlaceTeamAddFailed')),
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = (placeMemberUserId: string) => {
    Alert.alert(
      t('organizerPlaceTeamRemoveConfirmTitle'),
      t('organizerPlaceTeamRemoveConfirmMessage'),
      [
        {
          text: t('genericCancel'),
          style: 'cancel',
        },
        {
          text: t('organizerPlaceTeamRemoveAction'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!selectedPlaceId) {
                return;
              }
              setRemovingUserId(placeMemberUserId);
              try {
                const updated = await removePlaceTeamMember(
                  selectedPlaceId,
                  placeMemberUserId,
                );
                setMembers(updated);
              } catch (error) {
                Alert.alert(
                  t('commonErrorTitle'),
                  getApiErrorMessage(error, t('organizerPlaceTeamRemoveFailed')),
                );
              } finally {
                setRemovingUserId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const getRoleLabel = (role: PlaceTeamRole | null) => {
    if (role === 'MANAGER') {
      return t('organizerPlaceTeamRoleManager');
    }
    if (role === 'SCANNER') {
      return t('organizerPlaceTeamRoleScanner');
    }
    return t('organizerPlaceTeamRoleStaff');
  };

  if (profileLoading) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
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
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (ownedPlaces.length === 0) {
    return (
      <ScreenState
        mode="empty"
        fullScreen
        title={t('organizerPlaceTeamNoPlacesTitle')}
        description={t('organizerPlaceTeamNoPlacesDescription')}
        actionLabel={t('organizerDashboardActionCreatePlace')}
        onAction={() => router.push('/organizer/create-place')}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 88 }}
    >
      <ScreenHeader
        title={t('organizerPlaceTeamTitle')}
        subtitle={t('organizerPlaceTeamSubtitle')}
        label={t('organizerPlaceTeamLabel')}
        onBack={() => router.back()}
      />

      <FilterChipsBar
        options={placeOptions}
        activeKey={selectedPlaceId}
        onChange={setSelectedPlaceId}
        activeColor="#4c669f"
        horizontalPadding={0}
        textSize="sm"
        paddingTop={18}
        paddingBottom={6}
      />

      {teamError ? (
        <ScreenState
          mode="warning"
          title={teamError}
          actionLabel={t('organizerDataRetry')}
          onAction={() => {
            void loadMembers();
          }}
          containerClassName="px-0 pt-3 pb-0"
        />
      ) : null}

      <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('organizerPlaceTeamAddSectionTitle')}
        </Text>
        <TextInput
          value={searchQuery}
          onChangeText={(value) => {
            setSearchQuery(value);
            setSelectedUserId('');
          }}
          placeholder={t('organizerPlaceTeamSearchPlaceholder')}
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          autoCapitalize="none"
          className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        {searchQuery.trim().length >= 2 ? (
          <View className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
            {searchLoading ? (
              <ActivityIndicator color="#4c669f" />
            ) : searchResults.length > 0 ? (
              searchResults.slice(0, 5).map((candidate) => (
                <TouchableOpacity
                  key={candidate.id}
                  onPress={() => {
                    setSelectedUserId(candidate.id);
                    setSearchQuery(
                      candidate.displayName || candidate.username || candidate.id,
                    );
                  }}
                  className="mb-2 rounded-lg bg-white px-3 py-2 dark:bg-gray-900"
                >
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    {candidate.displayName || candidate.username || candidate.id}
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    @{candidate.username || 'unknown'}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t('organizerPlaceTeamSearchEmpty')}
              </Text>
            )}
          </View>
        ) : null}

        <View className="mt-3 flex-row gap-2">
          {(['STAFF', 'MANAGER', 'SCANNER'] as const).map((role) => {
            const active = selectedRole === role;
            return (
              <TouchableOpacity
                key={role}
                onPress={() => setSelectedRole(role)}
                className={`flex-1 rounded-xl border px-3 py-3 ${
                  active
                    ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-center text-xs font-semibold ${
                    active ? 'text-[#4c669f]' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {getRoleLabel(role)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          disabled={adding || !selectedUserId}
          onPress={() => {
            void handleAddMember();
          }}
          className={`mt-4 min-h-[56px] flex-row items-center justify-center gap-2 rounded-[20px] border px-4 py-4 ${
            adding || !selectedUserId
              ? 'border-[#92A5C7] bg-[#92A5C7]'
              : 'border-[#4c669f] bg-[#4c669f]'
          }`}
        >
          <Ionicons name="person-add-outline" size={17} color="#FFFFFF" />
          <Text className="text-center text-[15px] font-semibold text-white">
            {adding ? t('organizerPlaceTeamAdding') : t('organizerPlaceTeamAddAction')}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('organizerPlaceTeamMembersCount', { count: membersSorted.length })}
        </Text>

        {teamLoading ? (
          <View className="mt-4 items-center">
            <ActivityIndicator color="#4c669f" />
          </View>
        ) : membersSorted.length === 0 ? (
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('organizerPlaceTeamEmpty')}
          </Text>
        ) : (
          <View className="mt-3">
            {membersSorted.map((member) => (
              <View
                key={member.userId}
                className="mb-3 rounded-[18px] border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {member.User.displayName || member.User.username || member.userId}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  @{member.User.username || 'unknown'}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4c669f]">
                    {getRoleLabel(member.role)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(member.userId)}
                    disabled={removingUserId === member.userId}
                    className="rounded-full bg-red-100 px-3 py-1.5 dark:bg-red-900/30"
                  >
                    {removingUserId === member.userId ? (
                      <ActivityIndicator color="#ef4444" size="small" />
                    ) : (
                      <Text className="text-xs font-semibold text-red-600 dark:text-red-300">
                        {t('organizerPlaceTeamRemoveAction')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
