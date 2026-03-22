import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import { getApiErrorMessage } from '@/services/api';
import { EventRevisionItem, listEventRevisions } from '@/services/event-revisions';

function getRevisionActionLabel(action: string, t: (key: any, params?: Record<string, string | number>) => string) {
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EventRevisionItem[]>([]);

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
            {t('organizerRevisionsLabel')}
          </Text>
          <Text className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {t('organizerRevisionsTitle')}
          </Text>
        </View>
      </View>

      <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t('organizerRevisionsSubtitle')}
      </Text>

      {error ? (
        <View className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
          <Text className="text-sm font-semibold text-red-600 dark:text-red-300">
            {error}
          </Text>
        </View>
      ) : null}

      {items.length === 0 ? (
        <View className="mt-5 rounded-2xl bg-white p-4 dark:bg-gray-900">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('organizerRevisionsEmpty')}
          </Text>
        </View>
      ) : (
        <View className="mt-5 gap-3 pb-20">
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
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
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
