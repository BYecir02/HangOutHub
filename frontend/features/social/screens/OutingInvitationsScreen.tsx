import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import PersonActionButton from '@/features/social/components/PersonActionButton';
import SocialCountChip from '@/features/social/components/SocialCountChip';
import SocialEmptyState from '@/features/social/components/SocialEmptyState';
import { EntityRowCard } from '@/shared/ui/EntityCard';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import { useI18n } from '@/shared/hooks/use-i18n';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
import { OutingInvitation } from '@/types/social';

const OUTING_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

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
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<OutingInvitation[]>([]);

  const loadInvitations = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get<OutingInvitation[]>('/outings/invitations');
      setInvitations(response.data);
      setErrorMessage(null);
    } catch (error) {
      console.error('Erreur chargement invitations:', error);
      setInvitations([]);
      setErrorMessage(getApiErrorMessage(error, t('commonErrorTitle')));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-4">
        <ScreenHeader title={t('outingInvitationsTitle')} onBack={() => router.back()} />
      </View>

      <ScrollView
        className="flex-1 px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-5">
          <SocialCountChip
            label={t('outingInvitationsCountLabel')}
            value={invitations.length}
            color="#4c669f"
          />
        </View>

        <View className="mt-6 pb-2">
          {loading ? (
            <ScreenState mode="loading" containerClassName="px-0 py-4" />
          ) : errorMessage ? (
            <ScreenState
              mode="error"
              title={errorMessage}
              actionLabel={t('commonRetry')}
              onAction={() => {
                void loadInvitations();
              }}
              containerClassName="px-0 py-0"
            />
          ) : invitations.length > 0 ? (
            <View className="gap-5">
              {invitations.map((invitation) => {
                const hostLabel = t('outingInvitationsProposedBy', {
                  name:
                    invitation.User?.displayName ||
                    invitation.User?.username ||
                    t('outingInvitationsUserFallback'),
                });
                const locationLabel =
                  invitation.Place?.name ||
                  invitation.Place?.City?.name ||
                  invitation.Place?.address ||
                  t('profileFeaturedOutingLocationFallback');

                return (
                  <View key={invitation.id}>
                    <EntityRowCard
                      imageUrl={
                        getImageUrl(invitation.Place?.coverUrl || null) ||
                        OUTING_PLACEHOLDER
                      }
                      title={invitation.title}
                      subtitle={hostLabel}
                      badge={{
                        label:
                          invitation.Place?.City?.name ||
                          t('profileFeaturedOutingLocationFallback'),
                        color: '#4c669f',
                        backgroundColor: '#4c669f24',
                      }}
                      meta={formatEventDate(invitation.scheduledDate, locale)}
                      footerLeft={
                        <View className="flex-row items-center">
                          <Ionicons name="location-outline" size={14} color="#4c669f" />
                          <Text
                            className="ml-1 text-sm text-gray-600 dark:text-gray-300"
                            numberOfLines={1}
                          >
                            {locationLabel}
                          </Text>
                        </View>
                      }
                      onPress={() =>
                        router.push({
                          pathname: '/outing/[id]',
                          params: { id: invitation.id },
                        })
                      }
                    />

                    <View className="mt-3 flex-row flex-wrap gap-2.5 px-1">
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
                );
              })}
            </View>
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
