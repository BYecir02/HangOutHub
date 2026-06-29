import React, { useState, useMemo } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomSheetModal from '@/shared/ui/BottomSheetModal';
import { formatPrice } from '@/services/shared/formatters';
import type { EventDetail } from '@/features/events/hooks/useEventDetail';
import type { TranslationKey } from '@/services/shared/i18n';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

type EventBookingConfirmSheetProps = {
  visible: boolean;
  onClose: () => void;
  event: EventDetail;
  t: TranslateFn;
  locale: string;
  selectedTicketType: NonNullable<EventDetail['TicketType']>[number] | undefined;
  displayPrice: number | string | null | undefined;
  promoCode: string;
  onChangePromoCode: (value: string) => void;
  promoError: string;
  joining: boolean;
  onConfirm: () => Promise<void>;
};

export default function EventBookingConfirmSheet({
  visible,
  onClose,
  event,
  t,
  locale,
  selectedTicketType,
  displayPrice,
  promoCode,
  onChangePromoCode,
  promoError,
  joining,
  onConfirm,
}: EventBookingConfirmSheetProps) {
  const [localPromo, setLocalPromo] = useState(promoCode);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [localPromoError, setLocalPromoError] = useState('');

  const originalPrice = Number(selectedTicketType?.price || displayPrice || 0);

  // Client-side validation of the promotion code if event.Promotion exists
  const handleApplyPromo = () => {
    setLocalPromoError('');
    if (!localPromo.trim()) {
      setAppliedPromo(null);
      onChangePromoCode('');
      return;
    }

    const codeToSearch = localPromo.trim().toUpperCase();
    const promotion = event.Promotion?.find(
      (p) => (p.code || '').toUpperCase() === codeToSearch
    );

    if (promotion) {
      setAppliedPromo(promotion);
      onChangePromoCode(promotion.code || localPromo);
      setLocalPromoError('');
    } else {
      setAppliedPromo(null);
      setLocalPromoError(
        locale === 'fr-FR' ? 'Code promo invalide' : 'Invalid promo code'
      );
    }
  };

  const finalPrice = useMemo(() => {
    if (!appliedPromo) return originalPrice;

    const discountValue = Number(appliedPromo.discountValue || 0);
    if (appliedPromo.discountType === 'PERCENTAGE') {
      const discount = originalPrice * (discountValue / 100);
      return Math.max(0, originalPrice - discount);
    } else {
      return Math.max(0, originalPrice - discountValue);
    }
  }, [appliedPromo, originalPrice]);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={t('eventDetailBookingSummaryTitle')}
      subtitle={locale === 'fr-FR' ? 'Finalisez votre réservation' : 'Finalize your booking'}
      contentMode="auto"
      maxHeight={500}
    >
      <View className="gap-5">
        {/* Ticket Recap Box */}
        <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {selectedTicketType?.name || t('eventDetailBookingSummaryTicketLabel')}
              </Text>
              {selectedTicketType?.description ? (
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedTicketType.description}
                </Text>
              ) : null}
            </View>
            <Text className="text-sm font-bold text-gray-900 dark:text-white">
              {formatPrice(originalPrice, locale, {
                freeLabel: t('homePriceFree'),
              })}
            </Text>
          </View>
        </View>

        {/* Promo Code Section */}
        <View className="px-1">
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('eventDetailPromoCodeTitle')}
          </Text>
          <View className="mt-2 flex-row gap-2">
            <TextInput
              value={localPromo}
              onChangeText={(val) => {
                setLocalPromo(val);
                if (localPromoError) setLocalPromoError('');
              }}
              placeholder={t('eventDetailPromoCodePlaceholder')}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-base text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              editable={!joining}
            />
            <TouchableOpacity
              onPress={handleApplyPromo}
              disabled={joining}
              className="justify-center rounded-xl bg-gray-900 px-4 dark:bg-gray-100"
            >
              <Text className="text-sm font-semibold text-white dark:text-gray-900">
                {locale === 'fr-FR' ? 'Appliquer' : 'Apply'}
              </Text>
            </TouchableOpacity>
          </View>

          {appliedPromo ? (
            <Text className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              {locale === 'fr-FR'
                ? `Code appliqué : -${appliedPromo.discountValue}${
                    appliedPromo.discountType === 'PERCENTAGE' ? '%' : '€'
                  }`
                : `Code applied: -${appliedPromo.discountValue}${
                    appliedPromo.discountType === 'PERCENTAGE' ? '%' : '€'
                  }`}
            </Text>
          ) : null}

          {localPromoError || promoError ? (
            <Text className="mt-2 text-xs text-red-500 dark:text-red-400">
              {localPromoError || promoError}
            </Text>
          ) : null}
        </View>

        {/* Divider separator */}
        <View className="h-px bg-gray-100 dark:bg-gray-800" />

        {/* Pricing Summary */}
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-base font-bold text-gray-900 dark:text-white">Total</Text>
          <View className="flex-row items-center gap-2">
            {appliedPromo && originalPrice !== finalPrice ? (
              <Text className="text-sm text-gray-400 line-through dark:text-gray-500">
                {formatPrice(originalPrice, locale, {
                  freeLabel: t('homePriceFree'),
                })}
              </Text>
            ) : null}
            <Text className="text-lg font-black text-[#ff4757]">
              {formatPrice(finalPrice, locale, {
                freeLabel: t('homePriceFree'),
              })}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          onPress={onConfirm}
          disabled={joining}
          className="items-center rounded-[28px] bg-[#ff4757] py-4"
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-white">
              {locale === 'fr-FR' ? 'Confirmer la réservation' : 'Confirm reservation'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}
