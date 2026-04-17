import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Tabs, { type TabItem } from '@/components/ui/Tabs';
import EventDetailInfoTab from '@/components/event/EventDetailInfoTab';
import EventDetailTicketsTab from '@/components/event/EventDetailTicketsTab';
import EventDetailGalleryTab from '@/components/event/EventDetailGalleryTab';
import type { EventDetail, EventDetailTab } from '@/hooks/useEventDetail';

type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

type EventDetailContentProps = {
  event: EventDetail;
  t: TranslateFn;
  locale: string;
  tabItems: TabItem[];
  activeTab: EventDetailTab;
  onTabChange: (tab: EventDetailTab) => void;
  eventLocationLabel: string;
  eventAddressLabel: string;
  eventStartTime: string;
  ticketTypes: NonNullable<EventDetail['TicketType']>;
  selectedTicketTypeId: string;
  setSelectedTicketTypeId: (id: string) => void;
  availableTicketTypes: NonNullable<EventDetail['TicketType']>;
  promoCode: string;
  onChangePromoCode: (value: string) => void;
  promoError: string;
  joining: boolean;
  hasActiveBooking: boolean;
  isSoldOut: boolean;
  selectedTicketType: NonNullable<EventDetail['TicketType']>[number] | undefined;
  displayPrice: number | string | null | undefined;
  showCancellationDetails: boolean;
  setShowCancellationDetails: (value: boolean | ((prev: boolean) => boolean)) => void;
  showRefundDetails: boolean;
  setShowRefundDetails: (value: boolean | ((prev: boolean) => boolean)) => void;
  gallery: string[];
  onOpenPlace: () => void;
  onContactOrganizer: () => void;
  onReportEvent: () => void;
  onCreateOuting: () => void;
};

export default function EventDetailContent({
  event,
  t,
  locale,
  tabItems,
  activeTab,
  onTabChange,
  eventLocationLabel,
  eventAddressLabel,
  eventStartTime,
  ticketTypes,
  selectedTicketTypeId,
  setSelectedTicketTypeId,
  availableTicketTypes,
  promoCode,
  onChangePromoCode,
  promoError,
  joining,
  hasActiveBooking,
  isSoldOut,
  selectedTicketType,
  displayPrice,
  showCancellationDetails,
  setShowCancellationDetails,
  showRefundDetails,
  setShowRefundDetails,
  gallery,
  onOpenPlace,
  onContactOrganizer,
  onReportEvent,
  onCreateOuting,
}: EventDetailContentProps) {
  return (
    <View className="-mt-3 rounded-t-[28px] bg-gray-50 px-5 pt-6 dark:bg-black">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white">{event.title}</Text>
      <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {eventLocationLabel}
        {event.Place?.City?.name ? ` • ${event.Place.City.name}` : ''}
      </Text>

      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          onPress={onReportEvent}
          className="flex-1 flex-row items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/30 dark:bg-rose-900/20"
        >
          <Ionicons name="flag-outline" size={14} color="#e11d48" />
          <Text className="ml-2 text-xs font-semibold text-rose-600">{t('reportAction')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCreateOuting}
          className="flex-1 flex-row items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-900/20"
        >
          <Ionicons name="people-outline" size={14} color="#2563eb" />
          <Text className="ml-2 text-xs font-semibold text-blue-700 dark:text-blue-200">
            {t('profileOrganizeOutingCta')}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-4 rounded-3xl bg-white p-4 dark:bg-gray-900">
        <Tabs items={tabItems} activeTab={activeTab} onTabChange={(id) => onTabChange(id as EventDetailTab)} />

        {activeTab === 'details' ? (
          <EventDetailInfoTab
            event={event}
            t={t}
            locale={locale}
            eventStartTime={eventStartTime}
            eventLocationLabel={eventLocationLabel}
            eventAddressLabel={eventAddressLabel}
            onOpenPlace={onOpenPlace}
            onContactOrganizer={onContactOrganizer}
          />
        ) : null}

        {activeTab === 'tickets' ? (
          <EventDetailTicketsTab
            event={event}
            t={t}
            locale={locale}
            ticketTypes={ticketTypes}
            selectedTicketTypeId={selectedTicketTypeId}
            setSelectedTicketTypeId={setSelectedTicketTypeId}
            availableTicketTypes={availableTicketTypes}
            promoCode={promoCode}
            onChangePromoCode={onChangePromoCode}
            promoError={promoError}
            joining={joining}
            hasActiveBooking={hasActiveBooking}
            isSoldOut={isSoldOut}
            selectedTicketType={selectedTicketType}
            displayPrice={displayPrice}
            showCancellationDetails={showCancellationDetails}
            setShowCancellationDetails={setShowCancellationDetails}
            showRefundDetails={showRefundDetails}
            setShowRefundDetails={setShowRefundDetails}
          />
        ) : null}

        {activeTab === 'gallery' ? (
          <EventDetailGalleryTab eventId={event.id} gallery={gallery} />
        ) : null}
      </View>
    </View>
  );
}
