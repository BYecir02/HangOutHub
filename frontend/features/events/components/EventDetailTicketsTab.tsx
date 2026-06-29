import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { formatPrice } from '@/services/shared/formatters';
import type { EventDetail } from '@/features/events/hooks/useEventDetail';
import type { TranslationKey } from '@/services/shared/i18n';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

type EventDetailTicketsTabProps = {
  event: EventDetail;
  t: TranslateFn;
  locale: string;
  ticketTypes: NonNullable<EventDetail['TicketType']>;
  selectedTicketTypeId: string;
  setSelectedTicketTypeId: (id: string) => void;
  availableTicketTypes: NonNullable<EventDetail['TicketType']>;
  showCancellationDetails: boolean;
  setShowCancellationDetails: (value: boolean | ((prev: boolean) => boolean)) => void;
  showRefundDetails: boolean;
  setShowRefundDetails: (value: boolean | ((prev: boolean) => boolean)) => void;
};

export default function EventDetailTicketsTab({
  event,
  t,
  locale,
  ticketTypes,
  selectedTicketTypeId,
  setSelectedTicketTypeId,
  availableTicketTypes,
  showCancellationDetails,
  setShowCancellationDetails,
  showRefundDetails,
  setShowRefundDetails,
}: EventDetailTicketsTabProps) {
  return (
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
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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

      <View className="h-px bg-gray-100 dark:bg-gray-800 mt-6" />

      <View className="mt-6 px-1">
        <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t('eventDetailPoliciesTitle')}
        </Text>
        <View className="mt-3 overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800">
          <TouchableOpacity
            onPress={() => setShowCancellationDetails((prev) => !prev)}
            className="flex-row items-center p-4"
          >
            <Ionicons name="information-circle-outline" size={22} color="#ff4757" />
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
            className="flex-row items-center border-t border-gray-200 p-4 dark:border-gray-700"
          >
            <Ionicons name="information-circle-outline" size={22} color="#ff4757" />
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
        <>
          <View className="h-px bg-gray-100 dark:bg-gray-800 mt-6" />
          <View className="mt-6 px-1">
            <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Promotions
            </Text>
            <View className="mt-3 gap-2">
              {event.Promotion.map((promotion) => (
                <View
                  key={promotion.id}
                  className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800"
                >
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    {promotion.code || promotion.id}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
