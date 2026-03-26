import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import { getApiErrorMessage, getImageUrl } from '@/services/api';
import {
  getEventScans,
  type EventScansResponse,
} from '@/services/event-bookings';
import type { TranslationKey } from '@/services/i18n';

const AVATAR_PLACEHOLDER = 'https://i.pravatar.cc/150?img=12';

const statusToneClass: Record<string, string> = {
  USED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  CHECKED_IN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const statusLabelKey: Record<string, TranslationKey> = {
  USED: 'organizerEventScansStatusUsed',
  CHECKED_IN: 'organizerEventScansStatusCheckedIn',
};

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

  const loadScans = useCallback(async (isRefresh = false) => {
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
      setErrorMessage(
        getApiErrorMessage(error, t('organizerEventScansLoadFailed')),
      );
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, t]);

  useEffect(() => {
    void loadScans();
  }, [loadScans]);

  const eventTitle = data?.event.title || '-';

  const content = useMemo(() => {
    if (loading) {
      return (
        <View className="items-center justify-center py-20">
          <ActivityIndicator size="large" color="#4c669f" />
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('organizerEventScansLoading')}
          </Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <Text className="text-sm text-red-600 dark:text-red-300">{errorMessage}</Text>
          <TouchableOpacity
            onPress={() => void loadScans(true)}
            className="mt-3 self-start rounded-xl bg-[#ff4757] px-4 py-2"
          >
            <Text className="font-semibold text-white">{t('commonRetry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!data) {
      return null;
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
              const status = (scan.status || 'USED').toUpperCase();
              const statusClass =
                statusToneClass[status] ||
                'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
              const statusKey =
                statusLabelKey[status] || 'organizerEventScansStatusUnknown';

              return (
                <View
                  key={scan.bookingId}
                  className="mt-3 rounded-2xl border border-gray-200 p-3 dark:border-gray-700"
                >
                  <View className="flex-row items-center">
                    <Image
                      source={{ uri: getImageUrl(scan.attendee.avatarUrl) || AVATAR_PLACEHOLDER }}
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
                    <View className={`rounded-full px-2.5 py-1 ${statusClass}`}>
                      <Text className="text-xs font-semibold">{t(statusKey)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </>
    );
  }, [data, errorMessage, loading, loadScans, t]);

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
      <View className="mb-6 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 rounded-full bg-white p-3 dark:bg-gray-900"
        >
          <Ionicons name="arrow-back" size={20} color="#4c669f" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('organizerEventScansTitle')}
          </Text>
          <Text className="mt-1 text-xl font-bold text-gray-900 dark:text-white" numberOfLines={1}>
            {eventTitle}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('organizerEventScansSubtitle')}
          </Text>
        </View>
      </View>

      <View className="pb-10">{content}</View>
    </ScrollView>
  );
}
