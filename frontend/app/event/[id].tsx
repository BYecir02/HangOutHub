import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import MediaFrame from '@/components/ui/MediaFrame';
import ReportReasonSheet from '@/components/ui/ReportReasonSheet';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
import { formatEventDate, formatPrice } from '@/services/formatters';
import { createReport } from '@/services/reports';
import { getOrCreateDirectChat } from '@/services/direct-chats';
import { isVideoUrl } from '@/services/media';
import {
  EventBookingTicket,
  createEventBooking,
  cancelEventBooking,
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
    id?: string;
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

const generateBookingRequestId = () => {
  const cryptoApi = globalThis.crypto as
    | {
        randomUUID?: () => string;
      }
    | undefined;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  const bytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  const hex = bytes.map(toHex).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
};

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; tab?: string }>();
  const { locale, t } = useI18n();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [booking, setBooking] = useState<EventBookingTicket | null>(null);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [heroMuted, setHeroMuted] = useState(true);
  const [joining, setJoining] = useState(false);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [showCancellationDetails, setShowCancellationDetails] = useState(false);
  const [showRefundDetails, setShowRefundDetails] = useState(false);
  const bookingRequestIdRef = useRef<string | null>(null);
  const bookingSubmissionLockRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'details' | 'tickets' | 'gallery'>(() =>
    params.tab === 'tickets' ? 'tickets' : 'details',
  );
  const heroImage = getImageUrl(event?.coverUrl) || EVENT_PLACEHOLDER;
  const heroIsVideo = isVideoUrl(heroImage);

  useEffect(() => {
    setHeroMuted(true);
  }, [heroImage]);

  useEffect(() => {
    if (params.tab === 'tickets') {
      setActiveTab('tickets');
    }
  }, [params.tab]);

  useEffect(() => {
    if (hasActiveBooking) {
      bookingRequestIdRef.current = null;
    }
  }, [hasActiveBooking]);

  const fetchEvent = useCallback(async () => {
    if (!params.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<EventDetail>(`/events/${params.id}`);
      setEvent(response.data);
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

  const ticketTypes = [...(event?.TicketType || [])].sort((a, b) => {
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
  const isSoldOut = ticketTypes.length > 0 && ticketTypes.every((item) => item.quantity <= 0);
  const hasActiveBooking = Boolean(
    booking && (booking.status || '').toUpperCase() !== 'CANCELLED',
  );
  const bookingStatus = (booking?.status || '').toUpperCase();
  const canCancelBooking =
    Boolean(event) &&
    hasActiveBooking &&
    !['USED', 'CHECKED_IN'].includes(bookingStatus) &&
    new Date(event?.startTime || Date.now()).getTime() > Date.now();
  const displayPrice =
    cheapestAvailableTicket
      ? Number(cheapestAvailableTicket.price || 0)
      : ticketTypes.length > 0
      ? Math.min(...ticketTypes.map((ticketType) => Number(ticketType.price || 0)))
      : event?.entryFee;
  const hasMultipleTicketPrices =
    new Set(ticketTypes.map((ticketType) => Number(ticketType.price || 0))).size > 1;
  const availableTicketTypes = ticketTypes.filter((ticketType) => ticketType.quantity > 0);
  const selectedTicketType = ticketTypes.find(
    (ticketType) => ticketType.id === selectedTicketTypeId,
  );
  const selectedTicketSoldOut = Boolean(
    selectedTicketType && selectedTicketType.quantity <= 0,
  );
  const heroPriceLabel =
    isSoldOut && ticketTypes.length > 0
      ? t('eventDetailTicketSoldOutCta')
      : hasMultipleTicketPrices
      ? t('homePriceFrom', {
          price: Number(displayPrice || 0).toLocaleString(locale),
        })
      : formatPrice(displayPrice, locale, { freeLabel: t('homePriceFree') });
  const eventImages = event?.images || [];
  const gallery =
    eventImages.length > 0
      ? eventImages.map((image) => getImageUrl(image) || EVENT_PLACEHOLDER)
      : [heroImage];
  const { height: screenHeight } = Dimensions.get('window');
  const heroBadgeBottom = Math.max(44, Math.min(68, Math.round(screenHeight * 0.055)));
  const eventLocationLabel =
    event?.Place?.name || event?.address || t('homeLocationToConfirm');
  const eventCityLabel = event?.Place?.City?.name || t('eventDetailCityUnknown');
  const primaryActionLabel = hasActiveBooking
    ? t('eventDetailViewTicket')
    : activeTab === 'tickets' && !isSoldOut
    ? t('eventDetailConfirmCta')
    : isSoldOut
    ? t('eventDetailTicketSoldOutCta')
    : t('eventDetailBookCta');
  const tabItems: TabItem[] = [
    { id: 'details', label: t('eventDetailTabDetails') },
    { id: 'tickets', label: t('eventDetailTabTickets') },
    { id: 'gallery', label: t('eventDetailGallery') },
  ];

  useEffect(() => {
    if (selectedTicketTypeId || ticketTypes.length === 0) {
      return;
    }

    const firstAvailable = ticketTypes.find((ticketType) => ticketType.quantity > 0);
    setSelectedTicketTypeId(firstAvailable?.id || ticketTypes[0]?.id || '');
  }, [selectedTicketTypeId, ticketTypes]);

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

  const handleCreateOuting = () => {
    router.push({
      pathname: '/outing',
      params: {
        title: t('eventDetailOutingTitle', { title: event.title }),
        eventId: event.id,
        placeId: event.Place?.id || undefined,
        scheduledDate: event.startTime,
        sourceLabel: event.title,
      },
    });
  };

  const handleContactOrganizer = async () => {
    const organizerId = event.User?.id;
    if (!organizerId) {
      return;
    }

    try {
      const chat = await getOrCreateDirectChat(organizerId);
      router.push({
        pathname: '/direct-chat/[id]',
        params: { id: chat.id },
      });
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('directChatStartFailed')),
      );
    }
  };

  const handlePrimaryAction = () => {
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

    if (activeTab !== 'tickets') {
      if (!isSoldOut) {
        setActiveTab('tickets');
      } else {
        Alert.alert(t('commonErrorTitle'), t('eventDetailTicketSoldOutCta'));
      }
      return;
    }

    if (isSoldOut || selectedTicketSoldOut) {
      Alert.alert(t('commonErrorTitle'), t('eventDetailTicketSoldOutCta'));
      return;
    }

    void handleConfirmBooking();
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
                bookingRequestIdRef.current = null;
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

  const handleReportEvent = () => {
    setReportSheetVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!event) {
      return;
    }

    if (bookingSubmissionLockRef.current || joining) {
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

    const clientRequestId =
      bookingRequestIdRef.current || generateBookingRequestId();
    bookingRequestIdRef.current = clientRequestId;
    bookingSubmissionLockRef.current = true;
    setJoining(true);
    setPromoError('');
    try {
      const reserved = await createEventBooking(
        event.id,
        selectedTicketTypeId || undefined,
        promoCode.trim() || undefined,
        clientRequestId,
      );
      setBooking(reserved);
      bookingRequestIdRef.current = null;

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
      bookingSubmissionLockRef.current = false;
    }
  };

  const handlePromoChange = (value: string) => {
    setPromoCode(value);
    if (promoError) {
      setPromoError('');
    }
  };

  const handleSubmitReportReason = async (reason: string) => {
    if (!event) {
      return;
    }

    try {
      await createReport(event.id, 'EVENT', reason);
      Alert.alert(t('reportSuccessTitle'), t('reportSuccessMessage'));
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('reportFailed')),
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Image */}
        <View className="relative overflow-hidden rounded-b-[34px] bg-black">
          <MediaFrame
            source={heroImage}
            className="w-full"
            shouldPlay
            muted={heroMuted}
            loop
            showControls
            adaptiveHeight
            minHeight={280}
            maxHeight={480}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.84)']}
            locations={[0, 0.62, 1]}
            className="absolute inset-x-0 bottom-0 h-44"
          />
          <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5 pt-14">
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-full bg-black/45 p-3"
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              {heroIsVideo ? (
                <TouchableOpacity
                  onPress={() => setHeroMuted((value) => !value)}
                  className="rounded-full bg-black/45 p-3"
                  accessibilityRole="button"
                  accessibilityLabel={heroMuted ? t('mediaUnmute') : t('mediaMute')}
                >
                  <Ionicons
                    name={heroMuted ? 'volume-mute' : 'volume-high'}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
              ) : null}
              <View className="rounded-full bg-black/45 px-3 py-2">
                <Text className="text-xs font-semibold uppercase tracking-widest text-white">
                  {t('eventDetailTypeLabel')}
                </Text>
              </View>
            </View>
          </View>
          <View className="absolute inset-x-0 px-5" style={{ bottom: heroBadgeBottom }}>
            <View className="max-w-[92%] flex-row flex-wrap gap-2">
              <View className="rounded-full bg-black/55 px-3 py-2">
                <Text className="text-xs font-semibold text-white">
                  {eventCityLabel}
                </Text>
              </View>
              <View className="rounded-full bg-black/55 px-3 py-2">
                <Text className="text-xs font-semibold text-white">
                  {formatEventDate(event.startTime, locale, {
                    includeWeekday: true,
                    fallback: t('eventDetailDateToConfirm'),
                  })}
                </Text>
              </View>
              <View className="rounded-full bg-black/55 px-3 py-2">
                <Text className="text-xs font-semibold text-white">
                  {heroPriceLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="-mt-8 rounded-t-[28px] bg-gray-50 px-5 pt-6 dark:bg-black">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            {event.title}
          </Text>
          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {eventLocationLabel}
            {event.Place?.City?.name ? ` • ${event.Place.City.name}` : ''}
          </Text>

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={handleReportEvent}
              className="flex-1 flex-row items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/30 dark:bg-rose-900/20"
            >
              <Ionicons name="flag-outline" size={14} color="#e11d48" />
              <Text className="ml-2 text-xs font-semibold text-rose-600">
                {t('reportAction')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreateOuting}
              className="flex-1 flex-row items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-900/20"
            >
              <Ionicons name="people-outline" size={14} color="#2563eb" />
              <Text className="ml-2 text-xs font-semibold text-blue-700 dark:text-blue-200">
                {t('profileOrganizeOutingCta')}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mt-4 rounded-3xl bg-white p-4 dark:bg-gray-900">
            <Tabs
              items={tabItems}
              activeTab={activeTab}
              onTabChange={(id) => setActiveTab(id as 'details' | 'tickets' | 'gallery')}
            />

            {activeTab === 'details' ? (
              <View className="pt-5">
                <View className="mt-5 flex-row items-start">
                  <Ionicons name="calendar-outline" size={20} color="#ff4757" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      {t('eventDetailStart')}
                    </Text>
                    <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                      {formatEventDate(event.startTime, locale, {
                        includeWeekday: true,
                        fallback: t('eventDetailDateToConfirm'),
                      })}
                    </Text>
                  </View>
                </View>

                <View className="mt-5 flex-row items-start">
                  <Ionicons name="location-outline" size={20} color="#ff4757" />
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                          {t('eventDetailPlace')}
                        </Text>
                        <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                          {eventLocationLabel}
                          {event.Place?.City?.name ? ` — ${event.Place.City.name}` : ''}
                        </Text>
                      </View>
                      {event.Place ? (
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: '/place/[id]',
                              params: { id: event.Place?.id || '' },
                            })
                          }
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-900/25"
                        >
                          <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                            {t('eventDetailViewPlace')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="mt-5 flex-row items-start">
                  <Ionicons name="person-outline" size={20} color="#f39c12" />
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                          {t('eventDetailOrganizer')}
                        </Text>
                        <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                          {event.User?.displayName ||
                            event.User?.username ||
                            t('eventDetailUnknownOrganizer')}
                        </Text>
                      </View>
                      {event.User?.id ? (
                        <TouchableOpacity
                          onPress={handleContactOrganizer}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-900/40 dark:bg-blue-900/25"
                        >
                          <Text className="text-xs font-semibold text-blue-700 dark:text-blue-200">
                            {t('directChatContactOrganizer')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="mt-6 rounded-3xl bg-gray-50 p-5 dark:bg-gray-800">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    {t('eventDetailAbout')}
                  </Text>
                  <Text className="mt-4 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {t('eventDetailAboutDescriptionTitle')}
                  </Text>
                  <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
                    {event.description || t('eventDetailDescriptionFallback')}
                  </Text>
                </View>
              </View>
            ) : null}

            {activeTab === 'tickets' ? (
              <View className="pt-5">
                <View className="mt-3 gap-3">
                  {ticketTypes.length > 0 ? (
                    ticketTypes.map((ticketType) => {
                      const soldOut = ticketType.quantity <= 0;
                      const selected = ticketType.id === selectedTicketTypeId;
                      const isBestValue =
                        !soldOut &&
                        availableTicketTypes.length > 0 &&
                        availableTicketTypes[0]?.id === ticketType.id;
                      return (
                        <TouchableOpacity
                          key={ticketType.id}
                          onPress={() => setSelectedTicketTypeId(ticketType.id)}
                          disabled={soldOut}
                          className={
                            soldOut
                              ? 'rounded-2xl border border-gray-200 bg-gray-100 p-4 opacity-70 dark:border-gray-800 dark:bg-gray-900'
                              : selected
                              ? 'rounded-2xl border border-[#ff4757] bg-red-50 p-4 dark:bg-red-950/30'
                              : 'rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900'
                          }
                        >
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-3">
                              <Text
                                className={
                                  soldOut
                                    ? 'text-base font-bold text-gray-500 dark:text-gray-400'
                                    : 'text-base font-bold text-gray-900 dark:text-white'
                                }
                              >
                                {ticketType.name}
                              </Text>
                              {ticketType.description ? (
                                <Text
                                  className={
                                    soldOut
                                      ? 'mt-1 text-sm text-gray-500 dark:text-gray-400'
                                      : 'mt-1 text-sm text-gray-500 dark:text-gray-400'
                                  }
                                >
                                  {ticketType.description}
                                </Text>
                              ) : null}
                            </View>
                            <View className="items-end">
                              <Text
                                className={
                                  soldOut
                                    ? 'text-sm font-semibold text-gray-500 dark:text-gray-400'
                                    : 'text-sm font-semibold text-[#ff4757]'
                                }
                              >
                                {formatPrice(ticketType.price, locale, {
                                  freeLabel: t('homePriceFree'),
                                })}
                              </Text>
                              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {soldOut
                                  ? t('eventDetailTicketSoldOutCta')
                                  : t('eventDetailTicketRemaining', {
                                      count: ticketType.quantity,
                                    })}
                              </Text>
                            </View>
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
                            <Text className="text-[11px] text-gray-600 dark:text-gray-300">
                              {soldOut
                                ? t('eventDetailTicketSoldOut')
                                : t('eventDetailTicketRemaining', { count: ticketType.quantity })}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-800">
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {t('eventDetailDescriptionFallback')}
                      </Text>
                    </View>
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
                        {formatPrice(selectedTicketType?.price || displayPrice, locale, {
                          freeLabel: t('homePriceFree'),
                        })}
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

                {event.Promotion?.length ? (
                  <View className="mt-6 rounded-3xl bg-gray-50 p-5 dark:bg-gray-800">
                    <Text className="text-lg font-bold text-gray-900 dark:text-white">
                      Promotions
                    </Text>
                    <View className="mt-3 gap-2">
                      {event.Promotion.map((promotion) => (
                        <View
                          key={promotion.id}
                          className="rounded-2xl bg-white px-4 py-3 dark:bg-gray-900"
                        >
                          <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                            {promotion.code || promotion.id}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {activeTab === 'gallery' ? (
              <View className="pt-5 pb-2">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
                >
                  {gallery.map((image, index) => (
                    <MediaFrame
                      key={`${event.id}-gallery-${index}`}
                      source={image}
                      className="mr-3 w-44 shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-800"
                      adaptiveHeight
                      minHeight={120}
                      maxHeight={220}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="border-t border-gray-200 bg-white/95 px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-gray-950/95">
        <TouchableOpacity
          onPress={handlePrimaryAction}
          disabled={joining || cancelling}
          className={`items-center rounded-[28px] px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ${
            joining || cancelling || (!hasActiveBooking && isSoldOut)
              ? 'bg-[#ff9aa3]'
              : 'bg-[#ff4757]'
          }`}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-white">{primaryActionLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ReportReasonSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        onSubmitReason={handleSubmitReportReason}
      />
    </View>
  );
}
 



