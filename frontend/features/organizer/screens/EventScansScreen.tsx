import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import TicketStatusBadge from '@/shared/ui/TicketStatusBadge';
import { useI18n } from '@/shared/hooks/use-i18n';
import { getApiErrorMessage, getImageUrl } from '@/services/api';
import {
  getEventScans,
  type EventScansResponse,
} from '@/services/events/event-bookings';

const AVATAR_PLACEHOLDER = 'https://i.pravatar.cc/150?img=12';

function CounterCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <View className="w-[48%] rounded-2xl bg-white p-4 dark:bg-gray-900">
      <Text className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </Text>
      <Text className={`mt-2 text-2xl font-bold ${tone}`}>{value}</Text>
    </View>
  );
}

export default function EventScansScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useI18n();
  const eventId = typeof params.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<EventScansResponse | null>(null);

  const loadScans = useCallback(
    async (isRefresh = false) => {
      if (!eventId) {
        setErrorMessage(t('organizerEventScansLoadFailed'));
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await getEventScans(eventId);
        setData(response);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, t('organizerEventScansLoadFailed')));
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId, t],
  );

  useEffect(() => {
    void loadScans();
  }, [loadScans]);

  const eventTitle = data?.event.title || '-';

  const content = useMemo(() => {
    if (loading) {
      return (
        <ScreenState
          mode="loading"
          title={t('organizerEventScansLoading')}
          containerClassName="px-0 py-12"
        />
      );
    }

    if (errorMessage) {
      return (
        <ScreenState
          mode="error"
          title={t('organizerEventScansLoadFailed')}
          description={errorMessage}
          actionLabel={t('commonRetry')}
          onAction={() => {
            void loadScans(true);
          }}
          containerClassName="px-0 py-0"
        />
      );
    }

    if (!data) {
      return (
        <ScreenState
          mode="empty"
          title={t('organizerEventScansEmptyTitle')}
          description={t('organizerEventScansEmptyDescription')}
          containerClassName="px-0 py-4"
        />
      );
    }

    const scans = data.scans || [];

    return (
      <>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          <CounterCard
            label={t('organizerEventScansExpected')}
            value={data.counters.expectedCount}
            tone="text-[#4c669f]"
          />
          <CounterCard
            label={t('organizerEventScansScanned')}
            value={data.counters.scannedCount}
            tone="text-[#2ecc71]"
          />
          <CounterCard
            label={t('organizerEventScansPending')}
            value={data.counters.pendingCount}
            tone="text-[#f39c12]"
          />
          <CounterCard
            label={t('organizerEventScansRemaining')}
            value={data.counters.remainingCount}
            tone="text-[#ff4757]"
          />
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <Text className="text-base font-bold text-gray-900 dark:text-white">
            {t('organizerEventScansListTitle')}
          </Text>

          {scans.length === 0 ? (
            <View className="mt-4 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('organizerEventScansEmptyTitle')}
              </Text>
              <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('organizerEventScansEmptyDescription')}
              </Text>
            </View>
          ) : (
            scans.map((scan) => {
              return (
                <View
                  key={scan.bookingId}
                  className="mt-3 rounded-2xl border border-gray-200 p-3 dark:border-gray-700"
                >
                  <View className="flex-row items-center">
                    <Image
                      source={{
                        uri: getImageUrl(scan.attendee.avatarUrl) || AVATAR_PLACEHOLDER,
                      }}
                      className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-700"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                        {scan.attendee.displayName ||
                          scan.attendee.username ||
                          t('organizerEventScansAttendeeFallback')}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {scan.ticket.ticketTypeName || t('organizerEventScansTicketFallback')}
                      </Text>
                    </View>
                    <TicketStatusBadge
                      status={scan.status || 'USED'}
                      context="eventScans"
                      size="sm"
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </>
    );
  }, [data, errorMessage, loadScans, loading, t]);

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-5 pt-14 dark:bg-black"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadScans(true)}
          tintColor="#4c669f"
        />
      }
    >
      <View className="mb-6">
        <ScreenHeader
          title={eventTitle}
          subtitle={t('organizerEventScansSubtitle')}
          label={t('organizerEventScansTitle')}
          onBack={() => router.back()}
        />
      </View>

      <View className="pb-10">{content}</View>
    </ScrollView>
  );
}
