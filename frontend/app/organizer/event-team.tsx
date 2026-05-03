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
import { useLocalSearchParams, useRouter } from 'expo-router';

import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useOrganizerGuard } from '@/features/organizer/hooks/useOrganizerGuard';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { getApiErrorMessage } from '@/services/api';
import {
  addEventCollaborator,
  addEventPlaceTeamMember,
  type EventCollaboratorItem,
  type EventCollaboratorPermission,
  listEventCollaborators,
  listEventPlaceTeam,
  type PlaceTeamMemberItem,
  removeEventCollaborator,
  removeEventPlaceTeamMember,
} from '@/services/events/event-collaborators';
import { discoverUsers } from '@/services/user/friendships';
import type { DiscoverUser } from '@/types/social';

export default function OrganizerEventTeamScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const {
    user,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile();
  const isAllowed = useOrganizerGuard({
    user,
    loading: profileLoading,
    suspend: Boolean(profileError),
    requiredCapability: 'eventTeam',
  });

  const [teamLoading, setTeamLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<EventCollaboratorItem[]>([]);
  const [newUserId, setNewUserId] = useState('');

  const [placeTeamMembers, setPlaceTeamMembers] = useState<PlaceTeamMemberItem[]>(
    [],
  );
  const [placeTeamSupported, setPlaceTeamSupported] = useState(true);
  const [placeTeamMessage, setPlaceTeamMessage] = useState<string | null>(null);
  const [addingPlaceMember, setAddingPlaceMember] = useState(false);
  const [removingPlaceMemberId, setRemovingPlaceMemberId] = useState<string | null>(
    null,
  );
  const [selectedSearchUserId, setSelectedSearchUserId] = useState('');
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

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

  const placeTeam = useMemo(
    () =>
      placeTeamMembers.slice().sort((a, b) => {
        const aName = (a.User.displayName || a.User.username || '').toLowerCase();
        const bName = (b.User.displayName || b.User.username || '').toLowerCase();
        return aName.localeCompare(bName);
      }),
    [placeTeamMembers],
  );

  const collaboratorIdSet = useMemo(
    () => new Set(collaborators.map((item) => item.userId)),
    [collaborators],
  );

  const assignablePlaceMembers = useMemo(
    () =>
      placeTeam.filter((member) => !collaboratorIdSet.has(member.userId)),
    [collaboratorIdSet, placeTeam],
  );

  const loadTeamData = useCallback(async () => {
    if (!eventId) {
      setTeamLoading(false);
      return;
    }

    setTeamLoading(true);
    try {
      const collaboratorsResponse = await listEventCollaborators(eventId);
      setItems(collaboratorsResponse);
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('organizerTeamLoadFailed')),
      );
    }

    try {
      const placeTeamResponse = await listEventPlaceTeam(eventId);
      setPlaceTeamSupported(true);
      setPlaceTeamMessage(null);
      setPlaceTeamMembers(placeTeamResponse);
    } catch (error) {
      setPlaceTeamSupported(false);
      setPlaceTeamMembers([]);
      setPlaceTeamMessage(
        getApiErrorMessage(
          error,
          "Equipe de lieu indisponible sur cet evenement.",
        ),
      );
    } finally {
      setTeamLoading(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    void loadTeamData();
  }, [loadTeamData]);

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
          const excludedIds = placeTeamSupported
            ? new Set(placeTeamMembers.map((member) => member.userId))
            : new Set(items.map((item) => item.userId));

          setSearchResults(results.filter((candidate) => !excludedIds.has(candidate.id)));
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      };

      void runSearch();
    }, 280);

    return () => clearTimeout(timeout);
  }, [items, placeTeamMembers, placeTeamSupported, searchQuery]);

  const handleLegacyAddCollaborator = async () => {
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
      Alert.alert(
        t('organizerTeamAddSuccessTitle'),
        t('organizerTeamAddSuccessMessage'),
      );
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('organizerTeamAddFailed')),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPlaceMember = async () => {
    if (!eventId || !selectedSearchUserId) {
      Alert.alert(t('commonErrorTitle'), 'Selectionne un utilisateur.');
      return;
    }

    setAddingPlaceMember(true);
    try {
      const updated = await addEventPlaceTeamMember(eventId, {
        userId: selectedSearchUserId,
        role: 'STAFF',
      });
      setPlaceTeamMembers(updated);
      setSelectedSearchUserId('');
      setSearchQuery('');
      setSearchResults([]);
      Alert.alert('Equipe du lieu', 'Membre ajoute a l equipe du lieu.');
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, "Impossible d'ajouter ce membre au lieu."),
      );
    } finally {
      setAddingPlaceMember(false);
    }
  };

  const handleAssignFromPlace = async (candidateUserId: string) => {
    if (!eventId) {
      return;
    }

    setAssigningUserId(candidateUserId);
    try {
      const updated = await addEventCollaborator(eventId, {
        userId: candidateUserId,
        permission: newPermission,
      });
      setItems(updated);
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('organizerTeamAddFailed')),
      );
    } finally {
      setAssigningUserId(null);
    }
  };

  const handleRemovePlaceMember = (placeMemberUserId: string) => {
    Alert.alert(
      'Retirer de l equipe du lieu ?',
      'Ce membre sera aussi retire de cet evenement s il y etait assigne.',
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
              setRemovingPlaceMemberId(placeMemberUserId);
              try {
                const updatedPlaceTeam = await removeEventPlaceTeamMember(
                  eventId,
                  placeMemberUserId,
                );
                setPlaceTeamMembers(updatedPlaceTeam);
                const updatedCollaborators = await listEventCollaborators(eventId);
                setItems(updatedCollaborators);
              } catch (error) {
                Alert.alert(
                  t('commonErrorTitle'),
                  getApiErrorMessage(error, "Impossible de retirer ce membre du lieu."),
                );
              } finally {
                setRemovingPlaceMemberId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const handleRemoveCollaborator = (collaboratorUserId: string) => {
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

  if (teamLoading) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (!eventId) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('organizerDataLoadErrorTitle')}
        description={t('organizerDataLoadErrorMessage')}
        actionLabel={t('organizerGuardActionOk')}
        onAction={() => router.back()}
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
        title={t('organizerTeamTitle')}
        subtitle={t('organizerTeamSubtitle')}
        label={t('organizerTeamLabel')}
        onBack={() => router.back()}
      />

      <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          {placeTeamSupported
            ? 'Equipe du lieu'
            : t('organizerTeamAddSectionTitle')}
        </Text>
        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {placeTeamSupported
            ? 'Ajoute des membres au lieu, puis assigne-les a cet evenement.'
            : 'Aucun lieu lie a cet evenement. Mode legacy active.'}
        </Text>

        <TextInput
          value={searchQuery}
          onChangeText={(value) => {
            setSearchQuery(value);
            setSelectedSearchUserId('');
            setNewUserId('');
          }}
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
              searchResults.slice(0, 5).map((candidate) => (
                <TouchableOpacity
                  key={candidate.id}
                  onPress={() => {
                    const label =
                      candidate.displayName || candidate.username || candidate.id;
                    setSearchQuery(label);
                    setSelectedSearchUserId(candidate.id);
                    setNewUserId(candidate.id);
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
                {t('organizerTeamSearchEmpty')}
              </Text>
            )}
          </View>
        ) : null}

        {placeTeamSupported ? (
          <TouchableOpacity
            disabled={addingPlaceMember || !selectedSearchUserId}
            onPress={() => {
              void handleAddPlaceMember();
            }}
            className={`mt-4 rounded-[18px] px-4 py-3 ${
              addingPlaceMember || !selectedSearchUserId
                ? 'bg-[#92A5C7]'
                : 'bg-[#4c669f]'
            }`}
          >
            <Text className="text-center font-semibold text-white">
              {addingPlaceMember ? 'Ajout en cours...' : 'Ajouter a l equipe du lieu'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              value={newUserId}
              onChangeText={setNewUserId}
              placeholder={t('organizerTeamUserIdPlaceholder')}
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              autoCapitalize="none"
              className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />

            <TouchableOpacity
              disabled={submitting}
              onPress={() => {
                void handleLegacyAddCollaborator();
              }}
              className={`mt-4 rounded-[18px] px-4 py-3 ${
                submitting ? 'bg-[#92A5C7]' : 'bg-[#4c669f]'
              }`}
            >
              <Text className="text-center font-semibold text-white">
                {submitting ? t('organizerTeamAdding') : t('organizerTeamAddAction')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {!placeTeamSupported && placeTeamMessage ? (
          <Text className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            {placeTeamMessage}
          </Text>
        ) : null}
      </View>

      <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          Permissions d affectation
        </Text>
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
      </View>

      {placeTeamSupported ? (
        <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
          <Text className="text-sm font-semibold text-gray-900 dark:text-white">
            Membres du lieu ({placeTeam.length})
          </Text>

          {placeTeam.length === 0 ? (
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Aucun membre dans l equipe du lieu pour le moment.
            </Text>
          ) : (
            <View className="mt-3">
              {placeTeam.map((member) => (
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
                    <TouchableOpacity
                      disabled={
                        collaboratorIdSet.has(member.userId) ||
                        assigningUserId === member.userId
                      }
                      onPress={() => {
                        void handleAssignFromPlace(member.userId);
                      }}
                      className={`rounded-full px-3 py-1.5 ${
                        collaboratorIdSet.has(member.userId)
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-[#4c669f]'
                      }`}
                    >
                      {assigningUserId === member.userId ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text
                          className={`text-xs font-semibold ${
                            collaboratorIdSet.has(member.userId)
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-white'
                          }`}
                        >
                          {collaboratorIdSet.has(member.userId)
                            ? 'Deja assigne'
                            : 'Assigner a l evenement'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRemovePlaceMember(member.userId)}
                      disabled={removingPlaceMemberId === member.userId}
                      className="rounded-full bg-red-100 px-3 py-1.5 dark:bg-red-900/30"
                    >
                      {removingPlaceMemberId === member.userId ? (
                        <ActivityIndicator color="#ef4444" size="small" />
                      ) : (
                        <Text className="text-xs font-semibold text-red-600 dark:text-red-300">
                          {t('organizerTeamRemoveAction')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
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
                className="mb-3 rounded-[18px] border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {item.User.displayName || item.User.username || item.userId}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  @{item.User.username || 'unknown'}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4c669f]">
                    {item.permission === 'SCAN'
                      ? t('organizerTeamPermissionScan')
                      : t('organizerTeamPermissionEdit')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveCollaborator(item.userId)}
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

      {placeTeamSupported && assignablePlaceMembers.length === 0 ? (
        <View className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/50 dark:bg-emerald-900/20">
          <Text className="text-sm text-emerald-700 dark:text-emerald-300">
            Tous les membres du lieu sont deja assignes ou aucun membre n est disponible.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
