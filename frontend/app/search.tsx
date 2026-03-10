import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import SearchBar from '../components/ui/SearchBar';
import PersonActionButton from '../components/social/PersonActionButton';
import PersonRow from '../components/social/PersonRow';
import SocialEmptyState from '../components/social/SocialEmptyState';
import { DiscoverUser } from '../types/social';
import {
  acceptFriendRequest,
  discoverUsers,
  rejectFriendRequest,
  removeFriendship,
  sendFriendRequest,
} from '../services/friendships';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<DiscoverUser[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const normalizedQuery = query.trim();

      if (normalizedQuery.length < 2) {
        setResults([]);
        setSearchLoading(false);
        return;
      }

      const runSearch = async () => {
        setSearchLoading(true);

        try {
          const nextResults = await discoverUsers(normalizedQuery);
          setResults(nextResults);
        } catch (error) {
          console.error('Erreur recherche utilisateurs:', error);
          setResults([]);
        } finally {
          setSearchLoading(false);
        }
      };

      void runSearch();
    }, 280);

    return () => clearTimeout(timeout);
  }, [query]);

  const refreshSearch = async () => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setResults([]);
      return;
    }

    try {
      const nextResults = await discoverUsers(normalizedQuery);
      setResults(nextResults);
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    try {
      await sendFriendRequest(targetUserId);
      await refreshSearch();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Impossible d'envoyer la demande.");
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
      await refreshSearch();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Impossible d'accepter cette demande.");
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await rejectFriendRequest(friendshipId);
      await refreshSearch();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Impossible de refuser cette demande.");
    }
  };

  const handleRemoveRelation = async (friendshipId: string) => {
    try {
      await removeFriendship(friendshipId);
      await refreshSearch();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de modifier cette relation.');
    }
  };

  return (
    <View className="flex-1 bg-white pt-16 dark:bg-black">
      <View className="flex-row items-center px-5 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? 'white' : 'black'}
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Recherche
        </Text>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        autoFocus
        placeholder="Personnes, @pseudo..."
      />

      <ScrollView
        className="flex-1 px-5 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {query.trim().length < 2 ? (
          <SocialEmptyState
            icon="search-outline"
            title="Trouve des personnes"
            description="Tape au moins 2 caracteres pour chercher un pseudo, un prenom ou un nom."
          />
        ) : searchLoading ? (
          <View className="py-12">
            <ActivityIndicator color="#4c669f" />
          </View>
        ) : results.length > 0 ? (
          <>
            <Text className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
              Resultats
            </Text>

            {results.map((user) => {
              const friendshipId = user.friendshipId || undefined;

              return (
                <PersonRow
                  key={user.id}
                  user={user}
                  subtitle={
                    user.bio?.trim() ||
                    (user.role === 'ORGANIZER' || user.role === 'PLACE_OWNER'
                      ? 'Profil organisateur'
                      : 'Pret a sortir')
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
                        label="Ajouter"
                        onPress={() => handleSendRequest(user.id)}
                      />
                    ) : user.relationStatus === 'INCOMING_REQUEST' &&
                      friendshipId ? (
                      <PersonActionButton
                        label="Accepter"
                        onPress={() => handleAcceptRequest(friendshipId)}
                      />
                    ) : user.relationStatus === 'OUTGOING_REQUEST' ? (
                      <PersonActionButton label="Envoyee" disabled />
                    ) : (
                      <PersonActionButton label="Connecte" disabled />
                    )
                  }
                  secondaryAction={
                    user.relationStatus === 'INCOMING_REQUEST' && friendshipId ? (
                      <PersonActionButton
                        label="Refuser"
                        variant="neutral"
                        onPress={() => handleRejectRequest(friendshipId)}
                      />
                    ) : friendshipId &&
                      (user.relationStatus === 'CONNECTED' ||
                        user.relationStatus === 'OUTGOING_REQUEST') ? (
                      <PersonActionButton
                        label="Retirer"
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
            title="Aucun profil trouve"
            description="Essaie un pseudo, un prenom ou un nom plus precis."
          />
        )}
      </ScrollView>
    </View>
  );
}
