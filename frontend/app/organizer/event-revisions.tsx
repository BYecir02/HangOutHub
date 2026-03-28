import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import type { TranslationKey } from '@/services/i18n';
import { getApiErrorMessage } from '@/services/api';
import { EventRevisionItem, listEventRevisions } from '@/services/event-revisions';

function getRevisionActionLabel(
  action: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
) {
  if (action === 'CREATE') {
    return t('organizerRevisionsActionCreate');
  }

  if (action === 'UPDATE') {
    return t('organizerRevisionsActionUpdate');
  }

  if (action === 'COLLABORATOR_UPSERT') {
    return t('organizerRevisionsActionCollaboratorUpsert');
  }

  if (action === 'COLLABORATOR_REMOVE') {
    return t('organizerRevisionsActionCollaboratorRemove');
  }

  return action;
}

export default function OrganizerEventRevisionsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { t, locale } = useI18n();
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
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EventRevisionItem[]>([]);

  const loadRevisions = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const revisions = await listEventRevisions(eventId);
      setItems(revisions);
    } catch (e) {
      setError(getApiErrorMessage(e, t('organizerRevisionsLoadFailed')));
    } finally {
      setLoading(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const revisions = await listEventRevisions(eventId);
        if (mounted) {
          setItems(revisions);
        }
      } catch (e) {
        if (mounted) {
          setError(getApiErrorMessage(e, t('organizerRevisionsLoadFailed')));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [eventId, t]);

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

  if (loading) {
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
        title={t('organizerRevisionsTitle')}
        subtitle={t('organizerRevisionsSubtitle')}
        label={t('organizerRevisionsLabel')}
        onBack={() => router.back()}
      />

      {error ? (
        <ScreenState
          mode="warning"
          title={error}
          actionLabel={t('commonRetry')}
          onAction={() => {
            void loadRevisions();
          }}
          containerClassName="px-0 pb-0 pt-5"
        />
      ) : null}

      {items.length === 0 ? (
        <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('organizerRevisionsEmpty')}
          </Text>
        </View>
      ) : (
        <View className="mt-5 gap-3">
          {items.map((item) => {
            const createdAtLabel = item.createdAt
              ? new Date(item.createdAt).toLocaleString(locale)
              : '-';
            const actorLabel =
              item.actor?.displayName || item.actor?.username || t('organizerRevisionsActorFallback');
            const snapshot = item.snapshot as { title?: string; startTime?: string } | null;

            return (
              <View
                key={item.id}
                className="rounded-[24px] border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  {getRevisionActionLabel(item.action, t)}
                </Text>
                <Text className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {snapshot?.title || t('organizerRevisionsTitleFallback')}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('organizerRevisionsMeta', {
                    actor: actorLabel,
                    date: createdAtLabel,
                  })}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
