import React, { useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import api, { getImageUrl } from '@/services/api';
import {
  formatOrganizerDateTime,
  getOrganizerEventPhase,
  getOrganizerEventPhaseWeight,
  type OrganizerEventPhase,
} from '@/services/organizer-ui';

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

function formatEventDate(value: string, locale: string) {
  return formatOrganizerDateTime(value, locale);
}

function getPhaseBadgeClassName(phase: OrganizerEventPhase) {
  if (phase === 'upcoming') {
    return 'rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-900/30';
  }

  if (phase === 'live') {
    return 'rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-900/30';
  }

  return 'rounded-full bg-gray-200 px-2.5 py-1 dark:bg-gray-800';
}

function getPhaseTextClassName(phase: OrganizerEventPhase) {
  if (phase === 'upcoming') {
    return 'text-xs font-semibold text-emerald-700 dark:text-emerald-300';
  }

  if (phase === 'live') {
    return 'text-xs font-semibold text-amber-700 dark:text-amber-300';
  }

  return 'text-xs font-semibold text-gray-600 dark:text-gray-300';
}

function getPhaseLabelKey(phase: OrganizerEventPhase) {
  if (phase === 'upcoming') {
    return 'organizerEventsPhaseUpcoming' as const;
  }

  if (phase === 'live') {
    return 'organizerEventsPhaseLive' as const;
  }

  return 'organizerEventsPhasePast' as const;
}

export default function OrganizerEventsScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<'all' | OrganizerEventPhase>('all');
  const [openActionsEventId, setOpenActionsEventId] = useState<string | null>(
    null,
  );
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const {
    organizerEvents,
    loading,
    user,
    error,
    refetch,
  } = useUserProfile();
  const isAllowed = useOrganizerGuard({
    user,
    loading,
    suspend: Boolean(error),
  });

  const eventsOverview = useMemo(() => {
    const items = organizerEvents
      .map((event) => {
        const phase = getOrganizerEventPhase(event.startTime, event.endTime);
        const startMs = new Date(event.startTime).getTime();

        return {
          event,
          phase,
          startMs: Number.isFinite(startMs) ? startMs : 0,
        };
      })
      .sort((a, b) => {
        const phaseGap =
          getOrganizerEventPhaseWeight(a.phase) -
          getOrganizerEventPhaseWeight(b.phase);
        if (phaseGap !== 0) {
          return phaseGap;
        }

        if (a.phase === 'past' && b.phase === 'past') {
          return b.startMs - a.startMs;
        }

        return a.startMs - b.startMs;
      });

    const counts = items.reduce(
      (acc, item) => {
        acc[item.phase] += 1;
        return acc;
      },
      {
        upcoming: 0,
        live: 0,
        past: 0,
      } as Record<OrganizerEventPhase, number>,
    );

    return {
      items,
      counts,
    };
  }, [organizerEvents]);

  const selectedEvent = useMemo(
    () =>
      eventsOverview.items.find((item) => item.event.id === openActionsEventId)
        ?.event ?? null,
    [eventsOverview.items, openActionsEventId],
  );

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') {
      return eventsOverview.items;
    }

    return eventsOverview.items.filter((item) => item.phase === activeFilter);
  }, [activeFilter, eventsOverview.items]);

  const openEventDetail = (eventId: string) => {
    router.push({
      pathname: '/event/[id]',
      params: { id: eventId },
    });
  };

  const openEventScans = (eventId: string) => {
    router.push({
      pathname: '/event-scans/[id]',
      params: { id: eventId },
    });
  };

  const openEventEdit = (eventId: string) => {
    router.push({
      pathname: '/event-edit/[id]',
      params: { id: eventId },
    });
  };

  const openEventTeam = (eventId: string) => {
    router.push(`/organizer/event-team?id=${eventId}` as never);
  };

  const requestDeleteEvent = (eventId: string, eventTitle: string) => {
    Alert.alert(
      t('organizerEventsDeleteConfirmTitle'),
      t('organizerEventsDeleteConfirmMessage', { title: eventTitle }),
      [
        {
          text: t('genericCancel'),
          style: 'cancel',
        },
        {
          text: t('organizerEventsDeleteConfirmAction'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeletingEventId(eventId);
              try {
                await api.delete(`/events/${eventId}`);
                setOpenActionsEventId(null);
                await refetch();
                Alert.alert(
                  t('organizerEventsDeleteSuccessTitle'),
                  t('organizerEventsDeleteSuccessMessage'),
                );
              } catch (error: any) {
                const apiMessage =
                  error?.response?.data?.message &&
                  typeof error.response.data.message === 'string'
                    ? error.response.data.message
                    : t('organizerEventsDeleteFailed');

                Alert.alert(t('commonErrorTitle'), apiMessage);
              } finally {
                setDeletingEventId(null);
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
        <ActivityIndicator size="large" color="#ff4757" />
      </View>
    );
  }

  if (error && !user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-black">
        <Text className="text-center text-xl font-bold text-gray-900 dark:text-white">
          {t('organizerDataLoadErrorTitle')}
        </Text>
        <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
          {t('organizerDataLoadErrorMessage')}
        </Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          className="mt-5 rounded-2xl bg-[#ff4757] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('organizerDataRetry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user || !isAllowed) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#ff4757" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('organizerEventsLabel')}
          </Text>
          <Text className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
            {t('organizerEventsTitle')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/event')}
          className="rounded-full border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
        >
          <Text className="text-sm font-semibold text-[#ff4757]">
            {t('organizerEventsCreate')}
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="mt-3 text-base text-gray-500 dark:text-gray-400">
        {t('organizerEventsSubtitle')}
      </Text>

      {error ? (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-900/20">
          <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {t('organizerDataLoadErrorMessage')}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            className="mt-3 self-start rounded-full bg-amber-600 px-4 py-2"
          >
            <Text className="text-xs font-semibold text-white">
              {t('organizerDataRetry')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {eventsOverview.items.length > 0 ? (
        <View className="mt-4 rounded-2xl bg-white p-4 dark:bg-gray-900">
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                {
                  key: 'all',
                  label: t('organizerEventsFilterAll'),
                  count: eventsOverview.items.length,
                },
                {
                  key: 'upcoming',
                  label: t('organizerEventsFilterUpcoming'),
                  count: eventsOverview.counts.upcoming,
                },
                {
                  key: 'live',
                  label: t('organizerEventsFilterLive'),
                  count: eventsOverview.counts.live,
                },
                {
                  key: 'past',
                  label: t('organizerEventsFilterPast'),
                  count: eventsOverview.counts.past,
                },
              ] as const
            ).map((filter) => {
              const isActive = activeFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  className={`rounded-full px-3 py-1.5 ${
                    isActive
                      ? 'bg-[#4c669f]'
                      : 'border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isActive ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {`${filter.label} (${filter.count})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      <View className="mt-6 pb-24">
        {eventsOverview.items.length > 0 ? (
          filteredItems.length > 0 ? (
            filteredItems.map(({ event, phase }) => (
            <View
              key={event.id}
              className="relative mb-4 rounded-3xl bg-white p-3 dark:bg-gray-900"
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setOpenActionsEventId(null);
                  openEventDetail(event.id);
                }}
              >
                <View className="flex-row">
                  <Image
                    source={{
                      uri: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER,
                    }}
                    className="h-24 w-24 rounded-2xl bg-gray-200 dark:bg-gray-800"
                    resizeMode="cover"
                  />
                  <View className="ml-4 flex-1 justify-center">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="mr-2 flex-1 text-lg font-semibold text-gray-900 dark:text-white"
                        numberOfLines={1}
                      >
                        {event.title}
                      </Text>
                      <View className="flex-row items-center">
                        <View className={getPhaseBadgeClassName(phase)}>
                          <Text className={getPhaseTextClassName(phase)}>
                            {t(getPhaseLabelKey(phase))}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={(pressEvent) => {
                            pressEvent.stopPropagation();
                            setOpenActionsEventId((current) =>
                              current === event.id ? null : event.id,
                            );
                          }}
                          className="ml-2 rounded-full p-1.5"
                        >
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={18}
                            color="#6b7280"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {formatEventDate(event.startTime, locale)}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                      {event.Place?.name || t('homeLocationToConfirm')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

            </View>
            ))
          ) : (
            <View className="items-center rounded-3xl bg-white px-6 py-10 dark:bg-gray-900">
              <Text className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                {t('organizerEventsEmptyFilteredTitle')}
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                {t('organizerEventsEmptyFilteredDescription')}
              </Text>
              <TouchableOpacity
                onPress={() => setActiveFilter('all')}
                className="mt-5 rounded-xl border border-gray-200 px-5 py-3 dark:border-gray-700"
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-200">
                  {t('organizerEventsFilterAll')}
                </Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View className="items-center rounded-3xl bg-white px-6 py-10 dark:bg-gray-900">
            <Text className="text-center text-lg font-semibold text-gray-900 dark:text-white">
              {t('organizerEventsEmptyTitle')}
            </Text>
            <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
              {t('organizerEventsEmptyDescription')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/event')}
              className="mt-5 rounded-xl bg-[#ff4757] px-5 py-3"
            >
              <Text className="font-semibold text-white">
                {t('organizerEventsCreate')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/organizer/dashboard')}
              className="mt-3 rounded-xl border border-gray-200 px-5 py-3 dark:border-gray-700"
            >
              <Text className="font-semibold text-gray-700 dark:text-gray-200">
                {t('organizerEventsEmptyOpenDashboard')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </ScrollView>

      <Modal
        transparent
        visible={Boolean(selectedEvent)}
        animationType="fade"
        onRequestClose={() => setOpenActionsEventId(null)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/35"
          onPress={() => setOpenActionsEventId(null)}
        >
          <Pressable
            className="rounded-t-3xl bg-white p-5 dark:bg-gray-900"
            onPress={(event) => event.stopPropagation()}
          >
            <Text
              className="text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
              numberOfLines={1}
            >
              {selectedEvent?.title}
            </Text>

            <TouchableOpacity
              onPress={() => {
                if (!selectedEvent) {
                  return;
                }
                setOpenActionsEventId(null);
                openEventScans(selectedEvent.id);
              }}
              className="mt-4 rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700"
            >
              <Text className="text-center text-sm font-semibold text-gray-800 dark:text-gray-100">
                {t('organizerEventsActionViewScans')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!selectedEvent) {
                  return;
                }
                setOpenActionsEventId(null);
                openEventEdit(selectedEvent.id);
              }}
              className="mt-3 rounded-2xl border border-[#4c669f] px-4 py-3"
            >
              <Text className="text-center text-sm font-semibold text-[#4c669f]">
                {t('organizerEventsActionEdit')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!selectedEvent) {
                  return;
                }
                setOpenActionsEventId(null);
                openEventTeam(selectedEvent.id);
              }}
              className="mt-3 rounded-2xl border border-gray-300 px-4 py-3 dark:border-gray-700"
            >
              <Text className="text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('organizerEventsActionTeam')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!selectedEvent || deletingEventId) {
                  return;
                }
                requestDeleteEvent(selectedEvent.id, selectedEvent.title);
              }}
              disabled={Boolean(deletingEventId)}
              className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-900/20"
            >
              {deletingEventId === selectedEvent?.id ? (
                <ActivityIndicator color="#ef4444" />
              ) : (
                <Text className="text-center text-sm font-semibold text-red-600 dark:text-red-300">
                  {t('organizerEventsActionDelete')}
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
