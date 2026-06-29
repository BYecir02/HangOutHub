import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Dimensions, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useI18n } from '@/shared/hooks/use-i18n';
import { useVisibleItemAutoplay } from '@/shared/hooks/useVisibleItemAutoplay';
import api, { getApiErrorMessage, getImageUrl, storage } from '@/services/api';
import { formatEventCardPriceLabel } from '@/services/shared/formatters';
import { createReport } from '@/services/social/reports';
import { getOrCreateDirectChat } from '@/services/messaging/direct-chats';
import { isVideoUrl } from '@/services/shared/media';
import { getEventPosts, type PostDetails } from '@/services/social/posts';
import {
  EventBookingTicket,
  createEventBooking,
  getMyEventBookings,
} from '@/services/events/event-bookings';

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

export type EventDetailTab = 'details' | 'tickets' | 'gallery';

export interface EventDetail {
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
    role?: string | null;
  } | null;
  Place?: {
    id: string;
    name?: string | null;
    address?: string | null;
    City?: {
      name?: string | null;
    } | null;
  } | null;
  City?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
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

const generateBookingRequestId = () => {
  const cryptoApi = globalThis.crypto as
    | {
        randomUUID?: () => string;
      }
    | undefined;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  const hex = bytes.map(toHex).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
};

export function useEventDetail(eventId?: string, initialTab?: string) {
  const router = useRouter();
  const { locale, t } = useI18n();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling] = useState(false);
  const [booking, setBooking] = useState<EventBookingTicket | null>(null);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [bookingSheetVisible, setBookingSheetVisible] = useState(false);
  const [heroMuted, setHeroMuted] = useState(true);
  const [joining, setJoining] = useState(false);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [showCancellationDetails, setShowCancellationDetails] = useState(false);
  const [showRefundDetails, setShowRefundDetails] = useState(false);
  const [eventPublications, setEventPublications] = useState<PostDetails[]>([]);
  const [eventPublicationsLoading, setEventPublicationsLoading] = useState(false);
  const [eventPublicationsLoaded, setEventPublicationsLoaded] = useState(false);
  const [eventPublicationsError, setEventPublicationsError] = useState(false);
  const [eventPublicationsAuthRequired, setEventPublicationsAuthRequired] = useState(false);
  const [publicationsGridOffsetY, setPublicationsGridOffsetY] = useState(0);
  const [publicationsOpen, setPublicationsOpen] = useState(false);
  const publicationsScrollRef = useRef<ScrollView | null>(null);
  const eventPublicationsLoadingRef = useRef(false);
  const publicationsPanelProgress = useSharedValue(0);
  const bookingRequestIdRef = useRef<string | null>(null);
  const bookingSubmissionLockRef = useRef(false);
  const [activeTab, setActiveTab] = useState<EventDetailTab>(
    initialTab === 'tickets' ? 'tickets' : 'details',
  );

  const heroImage = getImageUrl(event?.coverUrl) || EVENT_PLACEHOLDER;
  const heroIsVideo = isVideoUrl(heroImage);
  const publicationsCount = eventPublications.length;

  const eventPublicationsVisibility = useVisibleItemAutoplay(
    eventPublications,
    (post) => post.id,
  );

  useEffect(() => {
    setHeroMuted(true);
  }, [heroImage]);

  useEffect(() => {
    if (initialTab === 'tickets') {
      setActiveTab('tickets');
    }
  }, [initialTab]);

  const ticketTypes = useMemo(
    () => [...(event?.TicketType || [])].sort((a, b) => {
      const aSoldOut = a.quantity <= 0;
      const bSoldOut = b.quantity <= 0;

      if (aSoldOut === bSoldOut) {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      return aSoldOut ? 1 : -1;
    }),
    [event?.TicketType],
  );

  const cheapestAvailableTicket = useMemo(
    () => ticketTypes
      .filter((ticketType) => ticketType.quantity > 0)
      .reduce<typeof ticketTypes[number] | null>((current, ticketType) => {
        if (!current) {
          return ticketType;
        }

        return Number(ticketType.price || 0) < Number(current.price || 0)
          ? ticketType
          : current;
      }, null),
    [ticketTypes],
  );

  const isSoldOut = ticketTypes.length > 0 && ticketTypes.every((item) => item.quantity <= 0);
  const hasActiveBooking = Boolean(booking && (booking.status || '').toUpperCase() !== 'CANCELLED');

  const displayPrice = cheapestAvailableTicket
    ? Number(cheapestAvailableTicket.price || 0)
    : ticketTypes.length > 0
    ? Math.min(...ticketTypes.map((ticketType) => Number(ticketType.price || 0)))
    : event?.entryFee;

  const availableTicketTypes = ticketTypes.filter((ticketType) => ticketType.quantity > 0);
  const selectedTicketType = ticketTypes.find((ticketType) => ticketType.id === selectedTicketTypeId);
  const selectedTicketSoldOut = Boolean(selectedTicketType && selectedTicketType.quantity <= 0);

  const heroPriceLabel =
    isSoldOut && ticketTypes.length > 0
      ? t('eventDetailTicketSoldOutCta')
      : formatEventCardPriceLabel(
          {
            entryFee: displayPrice,
            TicketType: ticketTypes,
          },
          locale,
          {
            freeLabel: t('homePriceFree'),
            soldOutLabel: t('eventDetailTicketSoldOutCta'),
          },
        );

  const gallery =
    event?.images?.length && event.images.length > 0
      ? event.images.map((image) => getImageUrl(image) || EVENT_PLACEHOLDER)
      : [heroImage];

  const eventLocationLabel = event?.Place?.name || event?.City?.name || t('eventDetailCityUnknown');
  const eventAddressLabel = event?.Place?.address || event?.address || t('homeAddressToConfirm');
  const eventCityLabel = event?.City?.name || event?.Place?.City?.name || t('eventDetailCityUnknown');
  const eventStartTime = event?.startTime || '';

  const primaryActionLabel = hasActiveBooking
    ? t('eventDetailViewTicket')
    : isSoldOut
    ? t('eventDetailTicketSoldOutCta')
    : activeTab === 'tickets'
    ? t('eventDetailConfirmCta')
    : ticketTypes.length > 0
    ? (locale === 'fr-FR' ? 'Choisir un billet' : 'Choose a ticket')
    : t('eventDetailBookCta');

  const tabItems = useMemo(
    () => [
      { id: 'details', label: t('eventDetailTabDetails') },
      { id: 'tickets', label: t('eventDetailTabTickets') },
      { id: 'gallery', label: t('eventDetailGallery') },
    ],
    [t],
  );

  const loadEventPublications = useCallback(async () => {
    if (!event?.id || eventPublicationsLoadingRef.current || eventPublicationsLoaded) {
      return;
    }

    const token = await storage.getItem('userToken');
    if (!token) {
      setEventPublicationsAuthRequired(true);
      setEventPublicationsError(false);
      setEventPublicationsLoading(false);
      return;
    }

    eventPublicationsLoadingRef.current = true;
    setEventPublicationsLoading(true);
    setEventPublicationsError(false);
    setEventPublicationsAuthRequired(false);

    try {
      const response = await getEventPosts(event.id);
      setEventPublications(response || []);
      setEventPublicationsLoaded(true);
    } catch {
      setEventPublications([]);
      setEventPublicationsError(true);
    } finally {
      eventPublicationsLoadingRef.current = false;
      setEventPublicationsLoading(false);
    }
  }, [event?.id, eventPublicationsLoaded]);

  useEffect(() => {
    if (!event?.id || eventPublicationsLoaded) {
      return;
    }

    void loadEventPublications();
  }, [event?.id, eventPublicationsLoaded, loadEventPublications]);

  const handleClosePublications = useCallback(() => {
    setPublicationsOpen(false);
  }, []);

  const handleOpenPublications = useCallback(() => {
    setPublicationsOpen(true);
    if (!eventPublicationsLoaded && !eventPublicationsLoading) {
      void loadEventPublications();
    }
  }, [eventPublicationsLoaded, eventPublicationsLoading, loadEventPublications]);

  useEffect(() => {
    if (!publicationsOpen) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClosePublications();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [handleClosePublications, publicationsOpen]);

  useEffect(() => {
    publicationsPanelProgress.value = withTiming(publicationsOpen ? 1 : 0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [publicationsOpen, publicationsPanelProgress]);

  const { height: screenHeight } = Dimensions.get('window');
  const publicationsPanelAStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: publicationsPanelProgress.value * screenHeight }],
  }));
  const publicationsPanelBStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - publicationsPanelProgress.value) * screenHeight }],
  }));

  useEffect(() => {
    if (hasActiveBooking) {
      bookingRequestIdRef.current = null;
    }
  }, [hasActiveBooking]);

  const fetchEvent = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<EventDetail>(`/events/${eventId}`);
      setEvent(response.data);
      setEventPublications([]);
      setEventPublicationsLoaded(false);
      setEventPublicationsLoading(false);
      setEventPublicationsError(false);
      setEventPublicationsAuthRequired(false);
      setPublicationsGridOffsetY(0);
      setPublicationsOpen(false);
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchEvent();
  }, [fetchEvent]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadMyBookingForEvent = async () => {
        if (!eventId) {
          return;
        }

        try {
          const bookings = await getMyEventBookings();
          if (!isMounted) {
            return;
          }

          const existingBooking = bookings.find((item) => {
            const status = (item.status || '').toUpperCase();
            return item.eventId === eventId && status !== 'CANCELLED';
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
    }, [eventId]),
  );

  useEffect(() => {
    if (selectedTicketTypeId || ticketTypes.length === 0) {
      return;
    }

    const firstAvailable = ticketTypes.find((ticketType) => ticketType.quantity > 0);
    setSelectedTicketTypeId(firstAvailable?.id || ticketTypes[0]?.id || '');
  }, [selectedTicketTypeId, ticketTypes]);

  const handleCreateOuting = useCallback(() => {
    if (!event) {
      return;
    }

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
  }, [event, router, t]);

  const handleContactOrganizer = useCallback(async () => {
    const organizerId = event?.User?.id;
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
  }, [event?.User?.id, router, t]);

  const handlePrimaryAction = useCallback(async () => {
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

    if (isSoldOut || selectedTicketSoldOut) {
      Alert.alert(t('commonErrorTitle'), t('eventDetailTicketSoldOutCta'));
      return;
    }

    if (ticketTypes.length > 0) {
      if (activeTab !== 'tickets') {
        setActiveTab('tickets');
        return;
      }
      setBookingSheetVisible(true);
      return;
    }

    if (bookingSubmissionLockRef.current || joining) {
      return;
    }

    const clientRequestId = bookingRequestIdRef.current || generateBookingRequestId();
    bookingRequestIdRef.current = clientRequestId;
    bookingSubmissionLockRef.current = true;
    setJoining(true);

    try {
      const reserved = await createEventBooking(
        event.id,
        undefined,
        undefined,
        clientRequestId,
      );
      setBooking(reserved);
      bookingRequestIdRef.current = null;

      if ((reserved.status || '').toUpperCase() === 'CONFIRMED') {
        Alert.alert(t('eventDetailJoinSuccessTitle'), t('eventDetailJoinSuccessMessage'));
      }

      router.push({
        pathname: '/my-ticket/[id]',
        params: {
          id: reserved.id,
        },
      });
    } catch (error) {
      const message = getApiErrorMessage(error, t('eventDetailJoinFailed'));
      Alert.alert(t('commonErrorTitle'), message);
    } finally {
      setJoining(false);
      bookingSubmissionLockRef.current = false;
    }
  }, [
    booking,
    event,
    hasActiveBooking,
    isSoldOut,
    joining,
    router,
    selectedTicketSoldOut,
    ticketTypes.length,
    activeTab,
    t,
  ]);

  const handleConfirmBooking = useCallback(async () => {
    if (!event || bookingSubmissionLockRef.current || joining) {
      return;
    }

    if (ticketTypes.length > 0 && !selectedTicketTypeId) {
      Alert.alert(t('commonErrorTitle'), t('eventDetailTicketTypeRequired'));
      return;
    }

    const clientRequestId = bookingRequestIdRef.current || generateBookingRequestId();
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
      setBookingSheetVisible(false);

      if ((reserved.status || '').toUpperCase() === 'CONFIRMED') {
        Alert.alert(t('eventDetailJoinSuccessTitle'), t('eventDetailJoinSuccessMessage'));
      }

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
  }, [
    event,
    joining,
    promoCode,
    router,
    selectedTicketTypeId,
    t,
    ticketTypes.length,
  ]);

  const handlePromoChange = useCallback((value: string) => {
    setPromoCode(value);
    setPromoError((current) => (current ? '' : current));
  }, []);

  const handleReportEvent = useCallback(() => {
    setReportSheetVisible(true);
  }, []);

  const handleSubmitReportReason = useCallback(async (reason: string) => {
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
  }, [event, t]);

  return {
    t,
    locale,
    event,
    loading,
    cancelling,
    booking,
    reportSheetVisible,
    setReportSheetVisible,
    bookingSheetVisible,
    setBookingSheetVisible,
    heroMuted,
    setHeroMuted,
    joining,
    selectedTicketTypeId,
    setSelectedTicketTypeId,
    promoCode,
    promoError,
    showCancellationDetails,
    setShowCancellationDetails,
    showRefundDetails,
    setShowRefundDetails,
    activeTab,
    setActiveTab,
    heroImage,
    heroIsVideo,
    publicationsOpen,
    eventPublications,
    eventPublicationsLoading,
    eventPublicationsLoaded,
    eventPublicationsError,
    eventPublicationsAuthRequired,
    publicationsGridOffsetY,
    setPublicationsGridOffsetY,
    publicationsCount,
    publicationsScrollRef,
    eventPublicationsVisibility,
    publicationsPanelAStyle,
    publicationsPanelBStyle,
    screenHeight,
    ticketTypes,
    displayPrice,
    availableTicketTypes,
    selectedTicketType,
    hasActiveBooking,
    isSoldOut,
    heroPriceLabel,
    gallery,
    eventLocationLabel,
    eventAddressLabel,
    eventCityLabel,
    eventStartTime,
    primaryActionLabel,
    tabItems,
    handleCreateOuting,
    handleContactOrganizer,
    loadEventPublications,
    handleOpenPublications,
    handleClosePublications,
    handlePrimaryAction,
    handleConfirmBooking,
    handlePromoChange,
    handleReportEvent,
    handleSubmitReportReason,
  };
}
