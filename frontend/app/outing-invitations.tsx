import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import PersonActionButton from '../components/social/PersonActionButton';
import SocialCountChip from '../components/social/SocialCountChip';
import SocialEmptyState from '../components/social/SocialEmptyState';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api from '../services/api';
import { OutingInvitation } from '../types/social';

function formatEventDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
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
  const { locale, t } = useI18n();
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
      Alert.alert(t('commonErrorTitle'), t('outingInvitationsRespondFailed'));
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
          {t('outingInvitationsTitle')}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-[28px] bg-[#4c669f]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4c669f]">
            {t('outingInvitationsLabel')}
          </Text>
          <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {t('outingInvitationsHero')}
          </Text>
        </View>

        <View className="mt-5">
          <SocialCountChip
            label={t('outingInvitationsCountLabel')}
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
                  {t('outingInvitationsProposedBy', {
                    name:
                      invitation.User?.displayName ||
                      invitation.User?.username ||
                      t('outingInvitationsUserFallback'),
                  })}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatEventDate(invitation.scheduledDate, locale)}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {invitation.Place?.name ||
                    invitation.Place?.City?.name ||
                    invitation.Place?.address ||
                    t('profileFeaturedOutingLocationFallback')}
                </Text>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <PersonActionButton
                    label={t('outingInvitationsActionGoing')}
                    onPress={() => handleRespondToInvitation(invitation.id, 'GOING')}
                  />
                  <PersonActionButton
                    label={t('outingInvitationsActionMaybe')}
                    variant="neutral"
                    onPress={() => handleRespondToInvitation(invitation.id, 'MAYBE')}
                  />
                  <PersonActionButton
                    label={t('outingInvitationsActionDecline')}
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
              title={t('outingInvitationsEmptyTitle')}
              description={t('outingInvitationsEmptyDescription')}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
