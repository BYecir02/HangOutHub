import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Tabs, { type TabItem } from '@/shared/ui/Tabs';
import EventDetailInfoTab from '@/features/events/components/EventDetailInfoTab';
import EventDetailTicketsTab from '@/features/events/components/EventDetailTicketsTab';
import EventDetailGalleryTab from '@/features/events/components/EventDetailGalleryTab';
import EventAttendeesRow from '@/features/events/components/EventAttendeesRow';
import type { EventDetail, EventDetailTab } from '@/features/events/hooks/useEventDetail';
import type { EventAttendeesPreview } from '@/services/social/activity';
import type { TranslationKey } from '@/services/shared/i18n';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

type EventDetailContentProps = {
  event: EventDetail;
  attendeesPreview: EventAttendeesPreview;
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
  attendeesPreview,
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
      <EventAttendeesRow
        count={attendeesPreview.count}
        attendees={attendeesPreview.attendees}
      />

      <View className="mt-4">
        <TouchableOpacity
          onPress={onCreateOuting}
          className="flex-row items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3.5 dark:border-blue-900/30 dark:bg-blue-900/20"
        >
          <Ionicons name="people-outline" size={15} color="#2563eb" />
          <Text className="ml-2 text-sm font-semibold text-blue-700 dark:text-blue-200">
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

      <TouchableOpacity
        onPress={onReportEvent}
        className="mt-6 flex-row items-center justify-center py-2"
        activeOpacity={0.7}
      >
        <Ionicons name="flag-outline" size={14} color="#9ca3af" />
        <Text className="ml-1.5 text-xs text-gray-400 dark:text-gray-500 underline">
          {t('reportAction')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
