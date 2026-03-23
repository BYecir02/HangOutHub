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
  cancelEventBooking,
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
  TicketType?: Array<{
    id: string;
    name: string;
    price: number | string;
    quantity: number;
  }>;
  Promotion?: Array<{
    id: string;
    code?: string | null;
    discountType?: string | null;
    discountValue?: number | string | null;
    maxRedemptions?: number | null;
    redeemedCount?: number | null;
    endDate?: string | null;
  }>;
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

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { locale, t } = useI18n();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [booking, setBooking] = useState<EventBookingTicket | null>(null);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>('');
  const [promoCode, setPromoCode] = useState('');

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
      setSelectedTicketTypeId((previous) => previous || ticketTypes[0]?.id || '');
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
  const cheapestAvailableTicket = ticketTypes
    .filter((ticketType) => ticketType.quantity > 0)
    .reduce<typeof ticketTypes[number] | null>((current, ticketType) => {
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
  const hasActiveBooking = Boolean(
    booking && (booking.status || '').toUpperCase() !== 'CANCELLED',
  );
  const bookingStatus = (booking?.status || '').toUpperCase();
  const canCancelBooking =
    hasActiveBooking &&
    !['USED', 'CHECKED_IN'].includes(bookingStatus) &&
    new Date(event.startTime).getTime() > Date.now();
  const displayPrice =
    cheapestAvailableTicket
      ? Number(cheapestAvailableTicket.price || 0)
      : ticketTypes.length > 0
      ? Math.min(...ticketTypes.map((ticketType) => Number(ticketType.price || 0)))
      : event.entryFee;
  const gallery =
    event.images?.length > 0
      ? event.images.map((image) => getImageUrl(image) || EVENT_PLACEHOLDER)
      : [heroImage];
  const primaryActionLabel = joining
    ? t('eventDetailJoining')
    : hasActiveBooking
    ? t('eventDetailViewTicket')
    : selectedTicketSoldOut
    ? t('eventDetailTicketSoldOutCta')
    : t('eventDetailJoinCta');

  const handleCreateOuting = () => {
    router.push({
      pathname: '/outing',
      params: {
        title: t('eventDetailOutingTitle', { title: event.title }),
        placeId: event.Place?.id || undefined,
        scheduledDate: event.startTime,
        sourceLabel: event.title,
      },
    });
  };

  const handleJoinEvent = async () => {
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

    if ((event.TicketType || []).length > 0 && !selectedTicketTypeId) {
      Alert.alert(t('commonErrorTitle'), t('eventDetailTicketTypeRequired'));
      return;
    }

    setJoining(true);
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
      Alert.alert(t('commonErrorTitle'), getApiErrorMessage(error, t('eventDetailJoinFailed')));
    } finally {
      setJoining(false);
    }
  };

  const handleCancelBooking = () => {
    if (!booking?.id || !canCancelBooking || cancelling) {
      return;
    }

    Alert.alert(
      t('eventDetailCancelConfirmTitle'),
      t('eventDetailCancelConfirmMessage'),
      [
        {
          text: t('genericCancel'),
          style: 'cancel',
        },
        {
          text: t('eventDetailCancelAction'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setCancelling(true);
              try {
                const cancelled = await cancelEventBooking(booking.id);
                setBooking(cancelled);
                await fetchEvent();
                Alert.alert(
                  t('eventDetailCancelSuccessTitle'),
                  t('eventDetailCancelSuccessMessage'),
                );
              } catch (error) {
                Alert.alert(
                  t('commonErrorTitle'),
                  getApiErrorMessage(error, t('eventDetailCancelFailed')),
                );
              } finally {
                setCancelling(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="relative">
        <Image source={{ uri: heroImage }} className="h-80 w-full" resizeMode="cover" />
        <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5 pt-14">
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-full bg-black/45 p-3"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View className="rounded-full bg-black/45 px-3 py-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-white">
              {t('eventDetailTypeLabel')}
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
          <View className="rounded-full bg-gray-200 px-3 py-2 dark:bg-gray-800">
            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {event.Place?.City?.name || t('eventDetailCityUnknown')}
            </Text>
          </View>
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('eventDetailActionTitle')}
          </Text>
          <Text className="mt-2 text-base leading-7 text-gray-700 dark:text-gray-200">
            {t('eventDetailActionDescription')}
          </Text>

          {ticketTypes.length > 0 ? (
            <View className="mt-4">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailTicketTypesTitle')}
              </Text>
              <View className="mt-3 gap-3">
                {ticketTypes.map((ticketType) => {
                  const isSelected = ticketType.id === selectedTicketTypeId;
                  const isSoldOut = ticketType.quantity <= 0;
                  const isBestValue =
                    !isSoldOut &&
                    cheapestAvailableTicket &&
                    cheapestAvailableTicket.id === ticketType.id;
                  return (
                    <TouchableOpacity
                      key={ticketType.id}
                      onPress={() => setSelectedTicketTypeId(ticketType.id)}
                      disabled={isSoldOut}
                      className={isSoldOut
                        ? 'rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 opacity-70 dark:border-gray-700 dark:bg-gray-800'
                        : isSelected
                          ? 'rounded-2xl border border-[#ff4757] bg-red-50 px-4 py-3 dark:bg-red-950/30'
                          : 'rounded-2xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900'}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className={isSoldOut
                          ? 'flex-1 text-sm font-semibold text-gray-500 dark:text-gray-400'
                          : 'flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100'}>
                          {ticketType.name}
                        </Text>
                        <Text className={isSoldOut
                          ? 'text-sm font-bold text-gray-500 dark:text-gray-400'
                          : 'text-sm font-bold text-[#ff4757]'}>
                          {formatPrice(ticketType.price, locale, t('homePriceFree'))}
                        </Text>
                      </View>

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
                        <Text className={isSoldOut
                          ? 'text-[11px] text-gray-500 dark:text-gray-400'
                          : 'text-[11px] text-gray-600 dark:text-gray-300'}>
                          {isSoldOut
                            ? t('eventDetailTicketSoldOut')
                            : t('eventDetailTicketRemaining', { count: ticketType.quantity })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View className="mt-4">
            <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('eventDetailPromoCodeTitle')}
            </Text>
            <TextInput
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
              placeholder={t('eventDetailPromoCodePlaceholder')}
              placeholderTextColor="#9CA3AF"
              className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('eventDetailPromoCodeHint')}
            </Text>
          </View>

        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <View className="flex-row items-start">
            <Ionicons name="time-outline" size={20} color="#ff4757" />
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
            <Ionicons name="hourglass-outline" size={20} color="#4c669f" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailEnd')}
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {formatEventDate(event.endTime, locale, t('eventDetailDateToConfirm'))}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <Ionicons name="location-outline" size={20} color="#2ecc71" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailPlace')}
              </Text>
              {event.Place ? (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/place/[id]',
                      params: { id: event.Place?.id || '' },
                    })
                  }
                >
                  <Text className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100">
                    {event.Place.name || t('homeLocationToConfirm')}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {event.Place.address || event.address || t('homeAddressToConfirm')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                  {event.address || t('homeLocationToConfirm')}
                </Text>
              )}
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <Ionicons name="person-outline" size={20} color="#f39c12" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailOrganizer')}
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {event.User?.displayName ||
                  event.User?.username ||
                  t('eventDetailUnknownOrganizer')}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {t('eventDetailAbout')}
          </Text>

          <Text className="mt-4 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('eventDetailAboutDescriptionTitle')}
          </Text>
          <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
            {event.description || t('eventDetailDescriptionFallback')}
          </Text>

          <Text className="mt-5 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('eventDetailPoliciesTitle')}
          </Text>
          <Text className="mt-3 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('eventDetailCancellationPolicyTitle')}
          </Text>
          <Text className="mt-1 text-base leading-7 text-gray-600 dark:text-gray-300">
            {event.cancellationPolicy || t('eventDetailPolicyNotProvided')}
          </Text>

          <Text className="mt-4 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('eventDetailRefundPolicyTitle')}
          </Text>
          <Text className="mt-1 text-base leading-7 text-gray-600 dark:text-gray-300">
            {event.refundPolicy || t('eventDetailPolicyNotProvided')}
          </Text>
        </View>

        <View className="mt-6 pb-24">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {t('eventDetailGallery')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
          >
            {gallery.map((image, index) => (
              <Image
                key={`${event.id}-gallery-${index}`}
                source={{ uri: image }}
                className="mr-3 h-28 w-40 rounded-2xl bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
        </View>
      </ScrollView>

      <View className="border-t border-gray-200 bg-white px-4 pb-5 pt-3 dark:border-gray-800 dark:bg-gray-950">
        <TouchableOpacity
          onPress={handleJoinEvent}
          disabled={joining || (!hasActiveBooking && selectedTicketSoldOut)}
          className={`items-center rounded-2xl px-4 py-4 ${
            joining || (!hasActiveBooking && selectedTicketSoldOut)
              ? 'bg-[#ff9aa3]'
              : 'bg-[#ff4757]'
          }`}
        >
          <Text className="text-sm font-semibold text-white">{primaryActionLabel}</Text>
        </TouchableOpacity>

        <View className="mt-3 flex-row gap-3">
          {canCancelBooking ? (
            <TouchableOpacity
              onPress={handleCancelBooking}
              disabled={cancelling}
              className="flex-1 items-center rounded-2xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-900/20"
            >
              <Text className="text-sm font-semibold text-red-700 dark:text-red-300">
                {cancelling ? t('eventDetailCancelling') : t('eventDetailCancelAction')}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleCreateOuting}
            className="flex-1 items-center rounded-2xl bg-[#4c669f] px-4 py-3"
          >
            <Text className="text-sm font-semibold text-white">
              {t('profileOrganizeOutingCta')}
            </Text>
          </TouchableOpacity>

          {event.Place ? (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: event.Place?.id || '' },
                })
              }
              className="flex-1 items-center rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('eventDetailViewPlace')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
