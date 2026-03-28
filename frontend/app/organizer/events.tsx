import React, { useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
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
import FilterChipsBar, { type FilterChipOption } from '@/components/ui/FilterChipsBar';
import BottomSheetModal from '@/components/ui/BottomSheetModal';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
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
  const filterOptions = useMemo<
    readonly FilterChipOption<'all' | OrganizerEventPhase>[]
  >(
    () => [
      {
        key: 'all',
        label: `${t('organizerEventsFilterAll')} (${eventsOverview.items.length})`,
      },
      {
        key: 'upcoming',
        label: `${t('organizerEventsFilterUpcoming')} (${eventsOverview.counts.upcoming})`,
      },
      {
        key: 'live',
        label: `${t('organizerEventsFilterLive')} (${eventsOverview.counts.live})`,
      },
      {
        key: 'past',
        label: `${t('organizerEventsFilterPast')} (${eventsOverview.counts.past})`,
      },
    ],
    [eventsOverview.counts.live, eventsOverview.counts.past, eventsOverview.counts.upcoming, eventsOverview.items.length, t],
  );

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
              } catch (error: unknown) {
                Alert.alert(
                  t('commonErrorTitle'),
                  getApiErrorMessage(error, t('organizerEventsDeleteFailed')),
                );
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
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (error && !user) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('organizerDataLoadErrorTitle')}
        description={t('organizerDataLoadErrorMessage')}
        actionLabel={t('organizerDataRetry')}
        onAction={() => {
          void refetch();
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

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView
        className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 88 }}
      >
      <ScreenHeader
        title={t('organizerEventsTitle')}
        subtitle={t('organizerEventsSubtitle')}
        label={t('organizerEventsLabel')}
        rightSlot={
          <TouchableOpacity
            onPress={() => router.push('/event')}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <Text className="text-sm font-semibold text-[#ff4757]">
              {t('organizerEventsCreate')}
            </Text>
          </TouchableOpacity>
        }
      />

      {error ? (
        <ScreenState
          mode="warning"
          title={t('organizerDataLoadErrorMessage')}
          actionLabel={t('organizerDataRetry')}
          onAction={() => {
            void refetch();
          }}
          containerClassName="px-0 pb-0 pt-5"
        />
      ) : null}

      {eventsOverview.items.length > 0 ? (
        <FilterChipsBar
          options={filterOptions}
          activeKey={activeFilter}
          onChange={setActiveFilter}
          activeColor="#4c669f"
          horizontalPadding={0}
          textSize="sm"
          paddingTop={14}
          paddingBottom={4}
        />
      ) : null}

      <View className="mt-5">
        {eventsOverview.items.length > 0 ? (
          filteredItems.length > 0 ? (
            filteredItems.map(({ event, phase }) => (
            <View
              key={event.id}
              className="relative mb-4 rounded-[24px] bg-white p-4 dark:bg-gray-900"
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setOpenActionsEventId(null);
                  openEventDetail(event.id);
                }}
              >
                <View className="flex-row">
                  <View className="h-24 w-24 shrink-0 overflow-hidden rounded-[18px] bg-gray-200 dark:bg-gray-800">
                    <Image
                      source={{
                        uri: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER,
                      }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </View>
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
            <View className="items-center rounded-[24px] bg-white px-6 py-10 dark:bg-gray-900">
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
          <View className="items-center rounded-[24px] bg-white px-6 py-10 dark:bg-gray-900">
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

      <BottomSheetModal
        visible={Boolean(selectedEvent)}
        onClose={() => setOpenActionsEventId(null)}
        title={t('organizerEventsActionCenterTitle')}
        subtitle={
          selectedEvent?.title || t('organizerEventsActionCenterSubtitle')
        }
        maxHeight={620}
        contentMode="auto"
        footer={
          <TouchableOpacity
            onPress={() => setOpenActionsEventId(null)}
            className="items-center rounded-2xl border border-gray-200 py-3 dark:border-gray-700"
          >
            <Text className="font-semibold text-gray-600 dark:text-gray-300">
              {t('genericCancel')}
            </Text>
          </TouchableOpacity>
        }
      >
        <View>
          <TouchableOpacity
            onPress={() => {
              if (!selectedEvent) {
                return;
              }
              setOpenActionsEventId(null);
              openEventScans(selectedEvent.id);
            }}
            className="mb-3 flex-row items-center rounded-3xl bg-gray-50 p-4 dark:bg-gray-800"
            style={{ borderWidth: 1, borderColor: '#4c669f2A' }}
          >
            <View
              className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#4c669f18' }}
            >
              <Ionicons name="scan-outline" size={24} color="#4c669f" />
            </View>
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-gray-800 dark:text-white">
                {t('organizerEventsActionViewScans')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (!selectedEvent) {
                return;
              }
              setOpenActionsEventId(null);
              openEventEdit(selectedEvent.id);
            }}
            className="mb-3 flex-row items-center rounded-3xl bg-gray-50 p-4 dark:bg-gray-800"
            style={{ borderWidth: 1, borderColor: '#f39c122A' }}
          >
            <View
              className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#f39c1218' }}
            >
              <Ionicons name="create-outline" size={24} color="#f39c12" />
            </View>
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-gray-800 dark:text-white">
                {t('organizerEventsActionEdit')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (!selectedEvent) {
                return;
              }
              setOpenActionsEventId(null);
              openEventTeam(selectedEvent.id);
            }}
            className="mb-3 flex-row items-center rounded-3xl bg-gray-50 p-4 dark:bg-gray-800"
            style={{ borderWidth: 1, borderColor: '#10b9812A' }}
          >
            <View
              className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#10b98118' }}
            >
              <Ionicons name="people-outline" size={24} color="#10b981" />
            </View>
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-gray-800 dark:text-white">
                {t('organizerEventsActionTeam')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (!selectedEvent || deletingEventId) {
                return;
              }
              requestDeleteEvent(selectedEvent.id, selectedEvent.title);
            }}
            disabled={Boolean(deletingEventId)}
            className="mb-1 flex-row items-center rounded-3xl bg-red-50 p-4 dark:bg-red-900/20"
            style={{ borderWidth: 1, borderColor: '#ef44442A' }}
          >
            <View
              className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#ef444418' }}
            >
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
            </View>
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-red-600 dark:text-red-300">
                {t('organizerEventsActionDelete')}
              </Text>
            </View>
            {deletingEventId === selectedEvent?.id ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#f87171" />
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    </View>
  );
}
