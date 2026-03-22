import React, { useEffect, useState } from 'react';
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

import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
import {
  EventBookingTicket,
  createEventBooking,
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
  const [booking, setBooking] = useState<EventBookingTicket | null>(null);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>('');
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchEvent = async () => {
      if (!params.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get<EventDetail>(`/events/${params.id}`);
        if (isMounted) {
          setEvent(response.data);
          const ticketTypes = response.data.TicketType || [];
          setSelectedTicketTypeId(ticketTypes[0]?.id || '');
        }
      } catch {
        if (isMounted) {
          setEvent(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

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
  const displayPrice =
    ticketTypes.length > 0
      ? Math.min(...ticketTypes.map((ticketType) => Number(ticketType.price || 0)))
      : event.entryFee;
  const gallery =
    event.images?.length > 0
      ? event.images.map((image) => getImageUrl(image) || EVENT_PLACEHOLDER)
      : [heroImage];

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

    if (booking) {
      router.push({
        pathname: '/my-tickets',
        params: {
          bookingId: booking.id,
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
        pathname: '/my-tickets',
        params: {
          bookingId: reserved.id,
        },
      });
    } catch (error) {
      Alert.alert(t('commonErrorTitle'), getApiErrorMessage(error, t('eventDetailJoinFailed')));
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-black"
      showsVerticalScrollIndicator={false}
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-2"
                contentContainerStyle={{ gap: 8, paddingRight: 8 }}
              >
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
                      className={isSoldOut
                        ? 'rounded-full border border-gray-200 bg-gray-100 px-3 py-2 opacity-70 dark:border-gray-700 dark:bg-gray-800'
                        : isSelected
                          ? 'rounded-full bg-[#ff4757] px-3 py-2'
                          : 'rounded-full border border-gray-300 px-3 py-2 dark:border-gray-700'}
                    >
                      <Text className={isSoldOut
                        ? 'text-xs font-semibold text-gray-500 dark:text-gray-400'
                        : isSelected
                          ? 'text-xs font-semibold text-white'
                          : 'text-xs font-semibold text-gray-700 dark:text-gray-200'}>
                        {ticketType.name} · {formatPrice(ticketType.price, locale, t('homePriceFree'))}
                      </Text>
                      {isBestValue ? (
                        <Text className={isSelected
                          ? 'mt-1 text-[11px] font-semibold text-white/95'
                          : 'mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300'}>
                          {t('eventDetailTicketBestValue')}
                        </Text>
                      ) : null}
                      <Text className={isSoldOut
                        ? 'mt-1 text-[11px] text-gray-500 dark:text-gray-400'
                        : isSelected
                          ? 'mt-1 text-[11px] text-white/90'
                          : 'mt-1 text-[11px] text-gray-500 dark:text-gray-400'}>
                        {isSoldOut
                          ? t('eventDetailTicketSoldOut')
                          : t('eventDetailTicketRemaining', { count: ticketType.quantity })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={handleJoinEvent}
              disabled={joining || selectedTicketSoldOut}
              className={`flex-1 items-center rounded-2xl px-4 py-4 ${
                joining || selectedTicketSoldOut ? 'bg-[#ff9aa3]' : 'bg-[#ff4757]'
              }`}
            >
              <Text className="text-sm font-semibold text-white">
                {selectedTicketSoldOut
                  ? t('eventDetailTicketSoldOutCta')
                  : joining
                  ? t('eventDetailJoining')
                  : booking
                    ? t('eventDetailViewTicket')
                    : t('eventDetailJoinCta')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreateOuting}
              className="flex-1 items-center rounded-2xl bg-[#4c669f] px-4 py-4"
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
                className="flex-1 items-center rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t('eventDetailViewPlace')}
                </Text>
              </TouchableOpacity>
            ) : null}
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

        <View className="mt-6">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {t('eventDetailAbout')}
          </Text>
          <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
            {event.description || t('eventDetailDescriptionFallback')}
          </Text>
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
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
  );
}
