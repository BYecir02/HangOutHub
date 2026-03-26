import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
import {
  EventBookingTicket,
  createEventBooking,
  getMyEventBookings,
} from '@/services/event-bookings';

interface EventDetail {
  id: string;
  title: string;
  description?: string | null;
  cancellationPolicy?: string | null;
  refundPolicy?: string | null;
  startTime: string;
  endTime?: string | null;
  coverUrl?: string | null;
  images: string[];
  entryFee?: number | string | null;
  address?: string | null;
  User?: {
    displayName?: string | null;
    username?: string | null;
  } | null;
  Place?: {
    id: string;
    name?: string | null;
    address?: string | null;
    City?: {
      name?: string | null;
    } | null;
  } | null;
  TicketType?: {
    id: string;
    name: string;
    description?: string | null;
    price: number | string;
    quantity: number;
  }[];
  Promotion?: {
    id: string;
    code?: string | null;
    discountType?: string | null;
    discountValue?: number | string | null;
    maxRedemptions?: number | null;
    redeemedCount?: number | null;
    endDate?: string | null;
  }[];
}

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

function formatEventDate(
  value: string | null | undefined,
  locale: string,
  fallback: string,
) {
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

function formatPrice(
  value: number | string | null | undefined,
  locale: string,
  freeLabel: string,
) {
  const amount = Number(value || 0);
  return amount > 0 ? `${amount.toLocaleString(locale)} FCFA` : freeLabel;
}

export default function EventBookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { locale, t } = useI18n();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [booking, setBooking] = useState<EventBookingTicket | null>(null);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>('');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [showCancellationDetails, setShowCancellationDetails] = useState(false);
  const [showRefundDetails, setShowRefundDetails] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!params.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<EventDetail>(`/events/${params.id}`);
      setEvent(response.data);
      const ticketTypes = response.data.TicketType || [];
      const firstAvailable = ticketTypes.find((ticketType) => ticketType.quantity > 0);
      setSelectedTicketTypeId(
        (previous) => previous || firstAvailable?.id || ticketTypes[0]?.id || '',
      );
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;

      const loadMyBookingForEvent = async () => {
        if (!params.id) {
          return;
        }

        try {
          const bookings = await getMyEventBookings();
          if (!isMounted) {
            return;
          }

          const existingBooking = bookings.find((item) => {
            const status = (item.status || '').toUpperCase();
            return item.eventId === params.id && status !== 'CANCELLED';
          });

          setBooking(existingBooking || null);
        } catch {
          if (isMounted) {
            setBooking(null);
          }
        }
      };

      void loadMyBookingForEvent();

      return () => {
        isMounted = false;
      };
    }, [params.id]),
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#ff4757" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8 dark:bg-black">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('eventDetailNotFound')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-[#ff4757] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('publicProfileBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const heroImage = getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER;
  const ticketTypes = [...(event.TicketType || [])].sort((a, b) => {
    const aSoldOut = a.quantity <= 0;
    const bSoldOut = b.quantity <= 0;

    if (aSoldOut === bSoldOut) {
      return Number(a.price || 0) - Number(b.price || 0);
    }

    return aSoldOut ? 1 : -1;
  });
  const availableTicketTypes = ticketTypes.filter((ticketType) => ticketType.quantity > 0);
  const cheapestAvailableTicket = availableTicketTypes.reduce<
    typeof ticketTypes[number] | null
  >((current, ticketType) => {
    if (!current) {
      return ticketType;
    }

    return Number(ticketType.price || 0) < Number(current.price || 0)
      ? ticketType
      : current;
  }, null);
  const selectedTicketType = ticketTypes.find(
    (ticketType) => ticketType.id === selectedTicketTypeId,
  );
  const selectedTicketSoldOut = Boolean(
    selectedTicketType && selectedTicketType.quantity <= 0,
  );
  const isSoldOut = ticketTypes.length > 0 && availableTicketTypes.length === 0;
  const hasActiveBooking = Boolean(
    booking && (booking.status || '').toUpperCase() !== 'CANCELLED',
  );
  const displayPrice =
    cheapestAvailableTicket
      ? Number(cheapestAvailableTicket.price || 0)
      : ticketTypes.length > 0
      ? Math.min(...ticketTypes.map((ticketType) => Number(ticketType.price || 0)))
      : event.entryFee;
  const ctaPrice = selectedTicketType
    ? Number(selectedTicketType.price || 0)
    : displayPrice;
  const confirmLabel = `${t('eventDetailConfirmCta')} • ${formatPrice(
    ctaPrice,
    locale,
    t('homePriceFree'),
  )}`;
  const actionLabel = joining
    ? t('eventDetailJoining')
    : hasActiveBooking
    ? t('eventDetailViewTicket')
    : isSoldOut
    ? t('eventDetailTicketSoldOutCta')
    : confirmLabel;
  const actionDisabled =
    joining ||
    (!hasActiveBooking &&
      (isSoldOut ||
        selectedTicketSoldOut ||
        (ticketTypes.length > 0 && !selectedTicketTypeId)));

  const handleConfirmBooking = async () => {
    if (!event) {
      return;
    }

    if (hasActiveBooking && booking) {
      router.push({
        pathname: '/my-ticket/[id]',
        params: {
          id: booking.id,
        },
      });
      return;
    }

    if (ticketTypes.length > 0 && !selectedTicketTypeId) {
      Alert.alert(t('commonErrorTitle'), t('eventDetailTicketTypeRequired'));
      return;
    }

    if (isSoldOut || selectedTicketSoldOut) {
      Alert.alert(t('commonErrorTitle'), t('eventDetailTicketSoldOutCta'));
      return;
    }

    setJoining(true);
    setPromoError('');
    try {
      const reserved = await createEventBooking(
        event.id,
        selectedTicketTypeId || undefined,
        promoCode.trim() || undefined,
      );
      setBooking(reserved);

      Alert.alert(t('eventDetailJoinSuccessTitle'), t('eventDetailJoinSuccessMessage'));

      router.push({
        pathname: '/my-ticket/[id]',
        params: {
          id: reserved.id,
        },
      });
    } catch (error) {
      const message = getApiErrorMessage(error, t('eventDetailJoinFailed'));
      setPromoError(message);
      Alert.alert(t('commonErrorTitle'), message);
    } finally {
      setJoining(false);
    }
  };

  const handlePromoChange = (value: string) => {
    setPromoCode(value);
    if (promoError) {
      setPromoError('');
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <View className="relative">
          <Image source={{ uri: heroImage }} className="h-72 w-full" resizeMode="cover" />
          <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5 pt-14">
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-full bg-black/45 p-3"
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View className="rounded-full bg-black/45 px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-widest text-white">
                {t('eventDetailBookCta')}
              </Text>
            </View>
          </View>
        </View>

        <View className="-mt-8 rounded-t-[28px] bg-gray-50 px-5 pt-6 dark:bg-black">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            {event.title}
          </Text>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="rounded-full bg-red-100 px-3 py-2 dark:bg-red-900/30">
              <Text className="text-xs font-semibold text-red-700 dark:text-red-300">
                {formatPrice(displayPrice, locale, t('homePriceFree'))}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <Ionicons name="calendar-outline" size={20} color="#ff4757" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailStart')}
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {formatEventDate(event.startTime, locale, t('eventDetailDateToConfirm'))}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <Ionicons name="location-outline" size={20} color="#ff4757" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailPlace')}
              </Text>
              {event.Place ? (
                <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                  {event.Place.name || event.Place.address || t('homeLocationToConfirm')}
                  {event.Place.City?.name ? ` â€” ${event.Place.City.name}` : ''}
                </Text>
              ) : (
                <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                  {event.address || t('homeLocationToConfirm')}
                </Text>
              )}
            </View>
          </View>

          <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
            <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('eventDetailTicketTypesTitle')}
            </Text>

            {ticketTypes.length > 0 ? (
              <View className="mt-3 gap-3">
                {ticketTypes.map((ticketType) => {
                  const isSelected = ticketType.id === selectedTicketTypeId;
                  const isTicketSoldOut = ticketType.quantity <= 0;
                  const isBestValue =
                    !isTicketSoldOut &&
                    cheapestAvailableTicket &&
                    cheapestAvailableTicket.id === ticketType.id;
                  return (
                    <TouchableOpacity
                      key={ticketType.id}
                      onPress={() => setSelectedTicketTypeId(ticketType.id)}
                      disabled={isTicketSoldOut}
                      className={
                        isTicketSoldOut
                          ? 'rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 opacity-70 dark:border-gray-700 dark:bg-gray-800'
                          : isSelected
                          ? 'rounded-2xl border border-[#ff4757] bg-red-50 px-4 py-3 dark:bg-red-950/30'
                          : 'rounded-2xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900'
                      }
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <Text
                          className={
                            isTicketSoldOut
                              ? 'flex-1 text-sm font-semibold text-gray-500 dark:text-gray-400'
                              : 'flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100'
                          }
                        >
                          {ticketType.name}
                        </Text>
                        <Text
                          className={
                            isTicketSoldOut
                              ? 'text-sm font-bold text-gray-500 dark:text-gray-400'
                              : 'text-sm font-bold text-[#ff4757]'
                          }
                        >
                          {formatPrice(ticketType.price, locale, t('homePriceFree'))}
                        </Text>
                      </View>
                      {ticketType.description ? (
                        <Text
                          className={
                            isTicketSoldOut
                              ? 'mt-1 text-xs text-gray-500 dark:text-gray-400'
                              : 'mt-1 text-xs text-gray-600 dark:text-gray-300'
                          }
                        >
                          {ticketType.description}
                        </Text>
                      ) : null}

                      <View className="mt-2 flex-row items-center justify-between gap-2">
                        {isBestValue ? (
                          <View className="rounded-full bg-emerald-100 px-2 py-1 dark:bg-emerald-900/40">
                            <Text className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              {t('eventDetailTicketBestValue')}
                            </Text>
                          </View>
                        ) : (
                          <View />
                        )}
                        <Text
                          className={
                            isTicketSoldOut
                              ? 'text-[11px] text-gray-500 dark:text-gray-400'
                              : 'text-[11px] text-gray-600 dark:text-gray-300'
                          }
                        >
                          {isTicketSoldOut
                            ? t('eventDetailTicketSoldOut')
                            : t('eventDetailTicketRemaining', { count: ticketType.quantity })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {formatPrice(displayPrice, locale, t('homePriceFree'))}
              </Text>
            )}
          </View>

          <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
            <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('eventDetailPromoCodeTitle')}
            </Text>
            <TextInput
              value={promoCode}
              onChangeText={handlePromoChange}
              placeholder={t('eventDetailPromoCodePlaceholder')}
              className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              editable={!joining && !hasActiveBooking && !isSoldOut}
            />
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('eventDetailPromoCodeHint')}
            </Text>
            {promoError ? (
              <Text className="mt-2 text-xs text-red-500 dark:text-red-400">
                {promoError}
              </Text>
            ) : null}
          </View>

          <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
            <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('eventDetailBookingSummaryTitle')}
            </Text>
            <View className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {selectedTicketType?.name || t('eventDetailBookingSummaryTicketLabel')}
                </Text>
                <Text className="text-sm font-bold text-[#ff4757]">
                  {formatPrice(ctaPrice, locale, t('homePriceFree'))}
                </Text>
              </View>
              {selectedTicketType ? (
                <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {selectedTicketType.quantity <= 0
                    ? t('eventDetailTicketSoldOut')
                    : t('eventDetailTicketRemaining', {
                        count: selectedTicketType.quantity,
                      })}
                </Text>
              ) : (
                <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('eventDetailBookingSummaryFixedPrice')}
                </Text>
              )}
            </View>
          </View>

          <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
            <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('eventDetailPoliciesTitle')}
            </Text>
            <View className="mt-3 rounded-xl overflow-hidden border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <TouchableOpacity
                onPress={() => setShowCancellationDetails((prev) => !prev)}
                className="flex-row items-center p-4"
              >
                <Ionicons name="information-circle-outline" size={22} color="#4c669f" />
                <Text className="ml-3 flex-1 text-base font-semibold text-gray-800 dark:text-gray-100">
                  {t('eventDetailCancellationPolicyTitle')}
                </Text>
                <Ionicons
                  name={showCancellationDetails ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#9aa5b1"
                />
              </TouchableOpacity>
              {showCancellationDetails ? (
                <View className="px-4 pb-4">
                  <Text className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                    {event.cancellationPolicy || t('eventDetailPolicyNotProvided')}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => setShowRefundDetails((prev) => !prev)}
                className="flex-row items-center border-t border-gray-100 p-4 dark:border-gray-800"
              >
                <Ionicons name="information-circle-outline" size={22} color="#4c669f" />
                <Text className="ml-3 flex-1 text-base font-semibold text-gray-800 dark:text-gray-100">
                  {t('eventDetailRefundPolicyTitle')}
                </Text>
                <Ionicons
                  name={showRefundDetails ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#9aa5b1"
                />
              </TouchableOpacity>
              {showRefundDetails ? (
                <View className="px-4 pb-4">
                  <Text className="text-sm leading-6 text-gray-700 dark:text-gray-200">
                    {event.refundPolicy || t('eventDetailPolicyNotProvided')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-gray-200 bg-white px-4 pb-5 pt-3 dark:border-gray-800 dark:bg-gray-950">
        <TouchableOpacity
          onPress={handleConfirmBooking}
          disabled={actionDisabled}
          className={`items-center rounded-2xl px-4 py-4 ${
            actionDisabled ? 'bg-[#ff9aa3]' : 'bg-[#ff4757]'
          }`}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
