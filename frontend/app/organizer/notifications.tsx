import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import FilterChipsBar, { type FilterChipOption } from '@/shared/ui/FilterChipsBar';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useOrganizerGuard } from '@/features/organizer/hooks/useOrganizerGuard';
import { usePaginatedList } from '@/shared/hooks/usePaginatedList';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { formatEventDate } from '@/services/shared/formatters';
import {
  fetchOrganizerNotifications,
  markOrganizerNotificationRead,
  markOrganizerNotificationsBatchRead,
  type OrganizerNotificationItem,
} from '@/services/organizer/organizer-notifications';

function getPlaceClaimDecision(item: OrganizerNotificationItem) {
  const payload = item.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const decision = (payload as { decision?: string }).decision?.toUpperCase();
  if (decision === 'APPROVED' || decision === 'REJECTED') {
    return decision;
  }

  return null;
}

function getPlaceClaimName(
  item: OrganizerNotificationItem,
  t: ReturnType<typeof useI18n>['t'],
) {
  const payload = item.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return t('notificationsPlaceFallback');
  }

  const placeName = (payload as { placeName?: string | null }).placeName?.trim();
  return placeName || t('notificationsPlaceFallback');
}

function getTypeTone(
  type: OrganizerNotificationItem['type'],
  item: OrganizerNotificationItem,
) {
  if (type === 'ORGANIZER_PLACE_CLAIM_REVIEWED') {
    const decision = getPlaceClaimDecision(item);

    if (decision === 'APPROVED') {
      return 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20';
    }

    if (decision === 'REJECTED') {
      return 'border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20';
    }

    return 'border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20';
  }

  if (type === 'ORGANIZER_BOOKING_CREATED') {
    return 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20';
  }

  if (type === 'ORGANIZER_COLLABORATOR_UPDATED') {
    return 'border-sky-200 bg-sky-50 dark:border-sky-800/60 dark:bg-sky-900/20';
  }

  if (type === 'ORGANIZER_EVENT_UPDATED') {
    return 'border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20';
  }

  if (type === 'ORGANIZER_EVENT_REMINDER') {
    return 'border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20';
  }

  return 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800';
}

function getTypeIcon(
  type: OrganizerNotificationItem['type'],
  item: OrganizerNotificationItem,
) {
  if (type === 'ORGANIZER_PLACE_CLAIM_REVIEWED') {
    const decision = getPlaceClaimDecision(item);

    if (decision === 'APPROVED') {
      return 'checkmark-circle-outline' as const;
    }

    if (decision === 'REJECTED') {
      return 'close-circle-outline' as const;
    }

    return 'business-outline' as const;
  }

  if (type === 'ORGANIZER_BOOKING_CREATED') {
    return 'ticket-outline' as const;
  }

  if (type === 'ORGANIZER_COLLABORATOR_UPDATED') {
    return 'people-outline' as const;
  }

  if (type === 'ORGANIZER_EVENT_UPDATED') {
    return 'create-outline' as const;
  }

  if (type === 'ORGANIZER_EVENT_REMINDER') {
    return 'alarm-outline' as const;
  }

  return 'notifications-outline' as const;
}

function getTypeIconColor(
  type: OrganizerNotificationItem['type'],
  item: OrganizerNotificationItem,
) {
  if (type === 'ORGANIZER_PLACE_CLAIM_REVIEWED') {
    const decision = getPlaceClaimDecision(item);

    if (decision === 'APPROVED') {
      return '#059669';
    }

    if (decision === 'REJECTED') {
      return '#e11d48';
    }

    return '#d97706';
  }

  if (type === 'ORGANIZER_EVENT_REMINDER') {
    return '#e11d48';
  }

  return '#4c669f';
}

function getSeverityTone(severity: OrganizerNotificationItem['severity']) {
  if (severity === 'URGENT') {
    return 'text-red-700 dark:text-red-300';
  }

  if (severity === 'IMPORTANT') {
    return 'text-amber-700 dark:text-amber-300';
  }

  return 'text-gray-600 dark:text-gray-300';
}

export default function OrganizerNotificationsScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
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
    requiredCapability: 'notifications',
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent'>(
    'all',
  );
  const lastLoadMoreAtRef = useRef(0);
  const skeletonOpacity = useRef(new Animated.Value(0.45)).current;
  const mapOrganizerNotificationsError = useCallback(
    () => t('organizerNotificationsLoadFailed'),
    [t],
  );
  const fetchNotificationsPage = useCallback(
    async ({ cursor }: { cursor?: string }) => {
      const response = await fetchOrganizerNotifications({
        limit: 20,
        cursor,
        unreadOnly: activeFilter === 'unread',
        urgentOnly: activeFilter === 'urgent',
      });

      return {
        items: response.items || [],
        nextCursor: response.nextCursor || null,
      };
    },
    [activeFilter],
  );

  const {
    items,
    setItems,
    nextCursor,
    loading,
    refreshing,
    loadingMore,
    error,
    loadInitial,
    refresh,
    loadMore,
  } = usePaginatedList<OrganizerNotificationItem>({
    fetchPage: fetchNotificationsPage,
    getItemKey: (item) => item.id,
    mapError: mapOrganizerNotificationsError,
  });

  useEffect(() => {
    if (!loadingMore) {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.45,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      skeletonOpacity.setValue(0.45);
    };
  }, [loadingMore, skeletonOpacity]);

  useFocusEffect(
    useCallback(() => {
      void loadInitial();
    }, [loadInitial]),
  );

  const onRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!nextCursor || loadingMore || loading) {
        return;
      }

      const now = Date.now();
      if (now - lastLoadMoreAtRef.current < 700) {
        return;
      }

      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const threshold = 220;
      const isNearBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - threshold;

      if (isNearBottom) {
        lastLoadMoreAtRef.current = now;
        void loadMore();
      }
    },
    [loadMore, loading, loadingMore, nextCursor],
  );

  const formatDate = useCallback(
    (value: string) => formatEventDate(value, locale),
    [locale],
  );

  const mapped = useMemo(
    () =>
      items.map((item) => {
        const actorName = item.actor?.displayName || item.actor?.username || t('organizerRevisionsActorFallback');

        if (item.title || item.message) {
          return {
            ...item,
            title: item.title || t('organizerNotificationsTypeSystemTitle'),
            description:
              item.message || t('organizerNotificationsTypeSystemDescription'),
          };
        }

        if (item.type === 'ORGANIZER_BOOKING_CREATED') {
          return {
            ...item,
            title: t('organizerNotificationsTypeBookingTitle'),
            description: t('organizerNotificationsTypeBookingDescription', {
              actor: actorName,
            }),
          };
        }

        if (item.type === 'ORGANIZER_COLLABORATOR_UPDATED') {
          return {
            ...item,
            title: t('organizerNotificationsTypeCollaboratorTitle'),
            description: t('organizerNotificationsTypeCollaboratorDescription', {
              actor: actorName,
            }),
          };
        }

        if (item.type === 'ORGANIZER_EVENT_UPDATED') {
          return {
            ...item,
            title: t('organizerNotificationsTypeEventTitle'),
            description: t('organizerNotificationsTypeEventDescription', {
              actor: actorName,
            }),
          };
        }

        if (item.type === 'ORGANIZER_EVENT_REMINDER') {
          return {
            ...item,
            title: t('organizerNotificationsTypeReminderTitle'),
            description: t('organizerNotificationsTypeReminderDescription'),
          };
        }

        if (item.type === 'ORGANIZER_PLACE_CLAIM_REVIEWED') {
          const placeName = getPlaceClaimName(item, t);
          const decision = getPlaceClaimDecision(item);

          if (decision === 'APPROVED') {
            return {
              ...item,
              title: t('organizerNotificationsTypePlaceClaimApprovedTitle'),
              description: t('organizerNotificationsTypePlaceClaimApprovedDescription', {
                place: placeName,
              }),
            };
          }

          if (decision === 'REJECTED') {
            return {
              ...item,
              title: t('organizerNotificationsTypePlaceClaimRejectedTitle'),
              description: t('organizerNotificationsTypePlaceClaimRejectedDescription', {
                place: placeName,
              }),
            };
          }

          return {
            ...item,
            title: t('organizerNotificationsTypePlaceClaimTitle'),
            description: t('organizerNotificationsTypePlaceClaimDescription', {
              place: placeName,
            }),
          };
        }

        return {
          ...item,
          title: t('organizerNotificationsTypeSystemTitle'),
          description: t('organizerNotificationsTypeSystemDescription'),
        };
      }),
    [items, t],
  );

  const filteredItems = useMemo(() => {
    if (activeFilter === 'unread') {
      return mapped.filter((item) => !item.isRead);
    }

    if (activeFilter === 'urgent') {
      return mapped.filter((item) => item.severity === 'URGENT');
    }

    return mapped;
  }, [activeFilter, mapped]);
  const filterOptions = useMemo<
    readonly FilterChipOption<'all' | 'unread' | 'urgent'>[]
  >(
    () => [
      { key: 'all', label: t('organizerNotificationsFilterAll') },
      { key: 'unread', label: t('organizerNotificationsFilterUnread') },
      { key: 'urgent', label: t('organizerNotificationsFilterUrgent') },
    ],
    [t],
  );

  const markVisibleAsRead = useCallback(async () => {
    const visibleUnreadIds = filteredItems
      .filter((item) => !item.isRead)
      .map((item) => item.id);

    if (visibleUnreadIds.length === 0) {
      return;
    }

    try {
      await markOrganizerNotificationsBatchRead(visibleUnreadIds);
      const unreadSet = new Set(visibleUnreadIds);
      setItems((current) =>
        current.map((item) =>
          unreadSet.has(item.id)
            ? {
                ...item,
                isRead: true,
              }
            : item,
        ),
      );
    } catch {
      // On garde le comportement silencieux pour ne pas casser l'experience.
    }
  }, [filteredItems, setItems]);

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

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 88 }}
      onScroll={handleScroll}
      scrollEventThrottle={120}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void onRefresh();
          }}
          tintColor="#4c669f"
        />
      }
    >
      <ScreenHeader
        title={t('organizerNotificationsTitle')}
        subtitle={t('organizerNotificationsSubtitle')}
        label={t('organizerNotificationsLabel')}
      />
      <Text className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
        {t('organizerNotificationsResultsCount', {
          count: filteredItems.length,
        })}
      </Text>

      <FilterChipsBar
        options={filterOptions}
        activeKey={activeFilter}
        onChange={setActiveFilter}
        activeColor="#4c669f"
        horizontalPadding={0}
        textSize="sm"
        paddingTop={14}
        paddingBottom={6}
      />

      {filteredItems.some((item) => !item.isRead) ? (
        <View className="mt-3 flex-row justify-end">
          <TouchableOpacity
            onPress={() => {
              void markVisibleAsRead();
            }}
            className="rounded-full border border-gray-300 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900"
          >
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('organizerNotificationsMarkVisibleRead')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <ScreenState mode="loading" containerClassName="px-0 pb-0 pt-4" />
      ) : null}

      {error ? (
        <ScreenState
          mode="warning"
          title={error}
          actionLabel={t('commonRetry')}
          onAction={() => {
            void loadInitial();
          }}
          containerClassName="px-0 pb-0 pt-4"
        />
      ) : null}

      {!loading && !error && filteredItems.length === 0 ? (
        <View className="mt-6 rounded-[24px] bg-white p-6 dark:bg-gray-900">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {activeFilter === 'all'
              ? t('organizerNotificationsEmptyTitle')
              : t('organizerNotificationsNoMatchTitle')}
          </Text>
          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {activeFilter === 'all'
              ? t('organizerNotificationsEmptyDescription')
              : t('organizerNotificationsNoMatchDescription')}
          </Text>
        </View>
      ) : null}

      <View className="mt-5">
        {filteredItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            disabled={!item.targetPath}
            activeOpacity={item.targetPath ? 0.85 : 1}
            onPress={() => {
              void markOrganizerNotificationRead(item.id);
              setItems((current) =>
                current.map((currentItem) =>
                  currentItem.id === item.id
                    ? {
                        ...currentItem,
                        isRead: true,
                      }
                    : currentItem,
                ),
              );

              if (item.targetPath) {
                router.push(item.targetPath as never);
              }
            }}
            className={`mb-3 rounded-[24px] border p-4 ${getTypeTone(item.type, item)}`}
          >
            <View className="flex-row items-center justify-between">
              <View className="mr-3 flex-row items-center">
                <Ionicons
                  name={getTypeIcon(item.type, item)}
                  size={18}
                  color={getTypeIconColor(item.type, item)}
                />
                <Text className="ml-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </Text>
              </View>
              {!item.isRead ? (
                <View className="h-2.5 w-2.5 rounded-full bg-[#4c669f]" />
              ) : null}
            </View>
            <Text className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {item.description}
            </Text>
            <Text
              className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${getSeverityTone(item.severity)}`}
            >
              {item.severity}
            </Text>
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {formatDate(item.createdAt)}
            </Text>
          </TouchableOpacity>
        ))}

        {loadingMore ? (
          <View className="mt-2 gap-2 rounded-[24px] py-2">
            {[0, 1].map((index) => (
              <Animated.View
                key={`notif-skeleton-${index}`}
                style={{ opacity: skeletonOpacity }}
                className="rounded-[24px] border border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <View className="h-3 w-36 rounded bg-gray-200 dark:bg-gray-700" />
                <View className="mt-3 h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                <View className="mt-2 h-3 w-4/5 rounded bg-gray-200 dark:bg-gray-700" />
              </Animated.View>
            ))}
            <View className="items-center pt-1">
              <ActivityIndicator size="small" color="#4c669f" />
              <Text className="mt-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                {t('organizerNotificationsLoadingMore')}
              </Text>
            </View>
          </View>
        ) : null}

        {!loading && !loadingMore && !nextCursor && filteredItems.length > 0 ? (
          <View className="mt-3 items-center rounded-2xl border border-dashed border-gray-300 p-3 dark:border-gray-700">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              {t('organizerNotificationsEndOfList')}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
