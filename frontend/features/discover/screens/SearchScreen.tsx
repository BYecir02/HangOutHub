import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import BottomSheetModal from '@/shared/ui/BottomSheetModal';
import { useI18n } from '@/shared/hooks/use-i18n';
import SearchBar from '@/shared/ui/SearchBar';
import PersonActionButton from '@/features/social/components/PersonActionButton';
import PersonRow from '@/features/social/components/PersonRow';
import SocialEmptyState from '@/features/social/components/SocialEmptyState';
import { DiscoverUser } from '@/features/social/types';
import {
  acceptFriendRequest,
  discoverUsers,
  rejectFriendRequest,
  removeFriendship,
  sendFriendRequest,
} from '@/services/user/friendships';

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<DiscoverUser[]>([]);
  const [searchSheetOpen, setSearchSheetOpen] = useState(true);
  const normalizedQuery = query.trim();
  const headerSubtitle =
    normalizedQuery.length >= 2
      ? `${t('searchResultsLabel')} - ${normalizedQuery}`
      : t('searchHintDescription');

  useEffect(() => {
    const timeout = setTimeout(() => {
      const normalizedQuery = query.trim();

      if (normalizedQuery.length < 2) {
        setResults([]);
        setSearchLoading(false);
        setErrorMessage(null);
        return;
      }

      const runSearch = async () => {
        setSearchLoading(true);

        try {
          const nextResults = await discoverUsers(normalizedQuery);
          setResults(nextResults);
          setErrorMessage(null);
        } catch (error) {
          console.error('Erreur recherche utilisateurs:', error);
          setResults([]);
          setErrorMessage(t('commonErrorTitle'));
        } finally {
          setSearchLoading(false);
        }
      };

      void runSearch();
    }, 280);

    return () => clearTimeout(timeout);
  }, [query, t]);

  const refreshSearch = async () => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setResults([]);
      return;
    }

    try {
      const nextResults = await discoverUsers(normalizedQuery);
      setResults(nextResults);
      setErrorMessage(null);
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
      setErrorMessage(t('commonErrorTitle'));
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    try {
      await sendFriendRequest(targetUserId);
      await refreshSearch();
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRequestSendError'));
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
      await refreshSearch();
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRequestAcceptError'));
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await rejectFriendRequest(friendshipId);
      await refreshSearch();
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRequestRejectError'));
    }
  };

  const handleRemoveRelation = async (friendshipId: string) => {
    try {
      await removeFriendship(friendshipId);
      await refreshSearch();
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRelationshipUpdateError'));
    }
  };

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-4">
        <ScreenHeader
          title={t('searchTitle')}
          subtitle={headerSubtitle}
          onBack={() => router.back()}
          rightSlot={
            <TouchableOpacity
              onPress={() => setSearchSheetOpen(true)}
              className="h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <Ionicons name="search-outline" size={20} color="#4c669f" />
            </TouchableOpacity>
          }
        />
      </View>

      <ScrollView
        className="flex-1 px-5 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {normalizedQuery.length < 2 ? (
          <SocialEmptyState
            icon="search-outline"
            title={t('searchHintTitle')}
            description={t('searchHintDescription')}
          />
        ) : searchLoading ? (
          <ScreenState mode="loading" containerClassName="px-0 py-8" />
        ) : errorMessage ? (
          <ScreenState
            mode="error"
            title={errorMessage}
            actionLabel={t('commonRetry')}
            onAction={() => {
              void refreshSearch();
            }}
            containerClassName="px-0 py-4"
          />
        ) : results.length > 0 ? (
          <>
            {results.map((user) => {
              const friendshipId = user.friendshipId || undefined;

              return (
                <PersonRow
                  key={user.id}
                  user={user}
                  subtitle={
                    user.bio?.trim() ||
                    (user.role === 'ORGANIZER' || user.role === 'PLACE_OWNER'
                      ? t('searchOrganizerProfile')
                      : t('searchReadyToGoOut'))
                  }
                  onPress={() =>
                    router.push({
                      pathname: '/user/[id]',
                      params: { id: user.id },
                    })
                  }
                  primaryAction={
                    user.relationStatus === 'NONE' ? (
                      <PersonActionButton
                        label={t('searchActionAdd')}
                        onPress={() => handleSendRequest(user.id)}
                      />
                    ) : user.relationStatus === 'INCOMING_REQUEST' &&
                      friendshipId ? (
                      <PersonActionButton
                        label={t('searchActionAccept')}
                        onPress={() => handleAcceptRequest(friendshipId)}
                      />
                    ) : user.relationStatus === 'OUTGOING_REQUEST' ? (
                      <PersonActionButton label={t('searchActionSent')} disabled />
                    ) : (
                      <PersonActionButton label={t('searchActionConnected')} disabled />
                    )
                  }
                  secondaryAction={
                    user.relationStatus === 'INCOMING_REQUEST' && friendshipId ? (
                      <PersonActionButton
                        label={t('searchActionReject')}
                        variant="neutral"
                        onPress={() => handleRejectRequest(friendshipId)}
                      />
                    ) : friendshipId &&
                      (user.relationStatus === 'CONNECTED' ||
                        user.relationStatus === 'OUTGOING_REQUEST') ? (
                      <PersonActionButton
                        label={t('searchActionRemove')}
                        variant="neutral"
                        onPress={() => handleRemoveRelation(friendshipId)}
                      />
                    ) : null
                  }
                />
              );
            })}
          </>
        ) : (
          <SocialEmptyState
            icon="person-outline"
            title={t('searchNoResultTitle')}
            description={t('searchNoResultDescription')}
          />
        )}
      </ScrollView>

      <BottomSheetModal
        visible={searchSheetOpen}
        onClose={() => setSearchSheetOpen(false)}
        title={t('searchTitle')}
        subtitle={t('searchHintDescription')}
        maxHeight={300}
        contentMode="auto"
      >
        <SearchBar
          value={query}
          onChangeText={setQuery}
          autoFocus
          placeholder={t('searchPlaceholder')}
          useBottomSheetInput
        />
      </BottomSheetModal>
    </View>
  );
}
