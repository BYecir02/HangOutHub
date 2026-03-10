import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import PersonActionButton from '../components/social/PersonActionButton';
import SocialCountChip from '../components/social/SocialCountChip';
import SocialEmptyState from '../components/social/SocialEmptyState';
import api from '../services/api';
import { OutingInvitation } from '../types/social';

function formatEventDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OutingInvitationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<OutingInvitation[]>([]);

  const loadInvitations = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get<OutingInvitation[]>('/outings/invitations');
      setInvitations(response.data);
    } catch (error) {
      console.error('Erreur chargement invitations:', error);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInvitations();
    }, [loadInvitations]),
  );

  const handleRespondToInvitation = async (
    outingId: string,
    status: 'GOING' | 'MAYBE' | 'DECLINED',
  ) => {
    try {
      await api.patch(`/outings/${outingId}/respond`, { status });
      await loadInvitations();
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Impossible de repondre a cette invitation.");
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
          Invitations de sorties
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-[28px] bg-[#4c669f]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4c669f]">
            Sorties
          </Text>
          <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            Reponds aux sorties ou propose un autre plan.
          </Text>
        </View>

        <View className="mt-5">
          <SocialCountChip
            label="Invites"
            value={invitations.length}
            color="#4c669f"
          />
        </View>

        <View className="mt-6">
          {loading ? (
            <View className="py-8">
              <ActivityIndicator color="#4c669f" />
            </View>
          ) : invitations.length > 0 ? (
            invitations.map((invitation) => (
              <View
                key={invitation.id}
                className="mb-3 rounded-[28px] bg-gray-50 p-5 dark:bg-gray-900"
              >
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {invitation.title}
                </Text>
                <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Proposee par{' '}
                  {invitation.User?.displayName ||
                    invitation.User?.username ||
                    'un ami'}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatEventDate(invitation.scheduledDate)}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {invitation.Place?.name ||
                    invitation.Place?.City?.name ||
                    invitation.Place?.address ||
                    'Lieu libre'}
                </Text>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <PersonActionButton
                    label="J y vais"
                    onPress={() => handleRespondToInvitation(invitation.id, 'GOING')}
                  />
                  <PersonActionButton
                    label="Peut etre"
                    variant="neutral"
                    onPress={() => handleRespondToInvitation(invitation.id, 'MAYBE')}
                  />
                  <PersonActionButton
                    label="Decliner"
                    variant="neutral"
                    onPress={() =>
                      handleRespondToInvitation(invitation.id, 'DECLINED')
                    }
                  />
                </View>
              </View>
            ))
          ) : (
            <SocialEmptyState
              icon="calendar-outline"
              title="Aucune invitation en attente"
              description="Tes prochaines invitations a une sortie apparaitront ici."
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
