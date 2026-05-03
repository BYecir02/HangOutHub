import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { formatPrice } from '@/services/formatters';
import type { EventDetail } from '@/hooks/useEventDetail';
import type { TranslationKey } from '@/services/i18n';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

type EventDetailTicketsTabProps = {
  event: EventDetail;
  t: TranslateFn;
  locale: string;
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
};

export default function EventDetailTicketsTab({
  event,
  t,
  locale,
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

      <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
        <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t('eventDetailPromoCodeTitle')}
        </Text>
        <TextInput
          value={promoCode}
          onChangeText={onChangePromoCode}
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
        <View className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
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
  );
}
