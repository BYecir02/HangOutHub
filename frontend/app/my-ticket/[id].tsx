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
import QRCode from 'react-native-qrcode-svg';

import { useI18n } from '@/hooks/use-i18n';
import { getApiErrorMessage, getImageUrl } from '@/services/api';
import {
  EventBookingTicket,
  getMyEventBookings,
} from '@/services/event-bookings';
import type { TranslationKey } from '@/services/i18n';

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

const statusToneClass: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  USED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CHECKED_IN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CANCELLED: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const statusLabelKey: Record<string, string> = {
  PENDING: 'myTicketsStatusPending',
  CONFIRMED: 'myTicketsStatusConfirmed',
  PAID: 'myTicketsStatusPaid',
  USED: 'myTicketsStatusUsed',
  CHECKED_IN: 'myTicketsStatusCheckedIn',
  CANCELLED: 'myTicketsStatusCancelled',
};

function getStatusTranslationKey(status: string): TranslationKey {
  const key = statusLabelKey[status];
  if (key) {
    return key as TranslationKey;
  }

  return 'myTicketsStatusUnknown';
}

function formatEventDate(value: string | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyTicketDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ticket, setTicket] = useState<EventBookingTicket | null>(null);

  const bookingId = typeof params.id === 'string' ? params.id : null;

  const loadTicket = useCallback(async (isRefresh = false) => {
    if (!bookingId) {
      setLoading(false);
      setTicket(null);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const tickets = await getMyEventBookings();
      const found = tickets.find((item) => item.id === bookingId) || null;
      setTicket(found);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t('myTicketDetailLoadFailed')));
      setTicket(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId, t]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  const status = (ticket?.status || 'PENDING').toUpperCase();
  const statusClass =
    statusToneClass[status] ||
    'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  const statusLabel = t(getStatusTranslationKey(status));
  const hasQr = Boolean(ticket?.qrCode);

  const qrHint = useMemo(() => {
    if (!ticket) {
      return '';
    }

    if (status === 'CANCELLED') {
      return t('myTicketDetailQrUnavailableCancelled');
    }

    if (status === 'USED' || status === 'CHECKED_IN') {
      return t('myTicketDetailQrUnavailableUsed');
    }

    return t('myTicketsQrUnavailable');
  }, [status, t, ticket]);

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-5 pt-14 dark:bg-black"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadTicket(true)}
          tintColor="#ff4757"
        />
      }
    >
      <View className="mb-6 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 rounded-full bg-white p-3 dark:bg-gray-900"
        >
          <Ionicons name="arrow-back" size={20} color="#ff4757" />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('myTicketDetailTitle')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('myTicketDetailSubtitle')}
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-24">
          <ActivityIndicator size="large" color="#ff4757" />
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('myTicketsLoading')}
          </Text>
        </View>
      ) : null}

      {!loading && errorMessage ? (
        <View className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <Text className="text-sm text-red-600 dark:text-red-300">{errorMessage}</Text>
          <TouchableOpacity
            onPress={() => void loadTicket(true)}
            className="mt-3 self-start rounded-xl bg-[#ff4757] px-4 py-2"
          >
            <Text className="font-semibold text-white">{t('commonRetry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !errorMessage && !ticket ? (
        <View className="rounded-3xl bg-white px-5 py-8 dark:bg-gray-900">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {t('myTicketDetailNotFound')}
          </Text>
          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('myTicketDetailNotFoundDescription')}
          </Text>
        </View>
      ) : null}

      {!loading && !errorMessage && ticket ? (
        <>
          <View className="mb-4 overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <View className="flex-row items-center">
              <Image
                source={{ uri: getImageUrl(ticket.event?.coverUrl) || EVENT_PLACEHOLDER }}
                className="h-14 w-14 rounded-xl bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
              />
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-gray-900 dark:text-white">
                  {ticket.event?.title || '-'}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('myTicketsStart')}{' '}
                  {formatEventDate(ticket.event?.startTime || null, locale, '-')}
                </Text>
              </View>
              <View className={`rounded-full px-3 py-1 ${statusClass}`}>
                <Text className="text-xs font-semibold">{statusLabel}</Text>
              </View>
            </View>

            <View className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t('myTicketsTicketType')}: {ticket.ticketType?.name || '-'}
              </Text>
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('eventDetailPlace')}: {ticket.event?.place?.name || '-'}
              </Text>
            </View>
          </View>

          <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('myTicketDetailQrTitle')}
            </Text>

            {hasQr ? (
              <View className="mt-4 items-center">
                <QRCode value={ticket.qrCode || ''} size={200} backgroundColor="transparent" />
                <Text className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  {ticket.qrCode}
                </Text>
              </View>
            ) : (
              <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {qrHint}
              </Text>
            )}
          </View>

          <View className="pb-10">
            <TouchableOpacity
              onPress={() => {
                if (!ticket.event?.id) {
                  return;
                }
                router.push({
                  pathname: '/event/[id]',
                  params: { id: ticket.event.id },
                });
              }}
              className="items-center rounded-2xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-900"
            >
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('myTicketsOpenEvent')}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
