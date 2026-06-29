import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomSheetModal from '@/shared/ui/BottomSheetModal';
import LogoLoader from '@/shared/ui/LogoLoader';
import { useI18n } from '@/shared/hooks/use-i18n';
import {
  getBookingPaymentMethods,
  payForBooking,
  type PaymentMethodOption,
  type PaymentStatusResponse,
} from '@/services/events/event-payments';

interface PaymentSheetProps {
  visible: boolean;
  bookingId: string | null;
  amountLabel?: string;
  onClose: () => void;
  onPaid: (result: PaymentStatusResponse) => void;
}

const KIND_ICON: Record<PaymentMethodOption['kind'], keyof typeof Ionicons.glyphMap> = {
  mobile_money: 'phone-portrait-outline',
  card: 'card-outline',
};

export default function PaymentSheet({
  visible,
  bookingId,
  amountLabel,
  onClose,
  onPaid,
}: PaymentSheetProps) {
  const { locale } = useI18n();
  const fr = locale === 'fr-FR';
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!visible || !bookingId) {
      return;
    }
    let active = true;
    void getBookingPaymentMethods(bookingId)
      .then((res) => {
        if (active) setMethods(res.methods);
      })
      .catch(() => {
        if (active) setMethods([]);
      });
    return () => {
      active = false;
    };
  }, [visible, bookingId]);

  const handlePay = async () => {
    if (!bookingId || paying) {
      return;
    }
    setPaying(true);
    try {
      const result = await payForBooking(bookingId);
      onPaid(result);
    } catch {
      // erreur silencieuse : on garde la feuille ouverte
    } finally {
      setPaying(false);
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={fr ? 'Paiement' : 'Payment'}
      subtitle={amountLabel}
      contentMode="auto"
      maxHeight={440}
    >
      {paying ? (
        <View className="items-center justify-center py-10">
          <LogoLoader
            size={96}
            message={fr ? 'Redirection vers le paiement…' : 'Redirecting to payment…'}
          />
        </View>
      ) : (
      <View className="gap-5">
        <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {fr ? 'Moyens acceptés' : 'Accepted methods'}
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {methods.map((m) => (
            <View
              key={m.id}
              className="flex-row items-center gap-1.5 rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800"
            >
              <Ionicons name={KIND_ICON[m.kind]} size={14} color="#4c669f" />
              <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {m.label}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row items-start gap-2 rounded-2xl bg-blue-50 p-3 dark:bg-blue-900/20">
          <Ionicons name="shield-checkmark-outline" size={16} color="#2563eb" />
          <Text className="flex-1 text-xs text-blue-700 dark:text-blue-300">
            {fr
              ? 'Paiement sécurisé via FedaPay. Tu seras redirigé pour finaliser (Mobile Money ou carte).'
              : 'Secure payment via FedaPay. You will be redirected to complete it (Mobile Money or card).'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => void handlePay()}
          disabled={paying}
          className="items-center rounded-[28px] bg-[#ff4757] py-4"
        >
          <Text className="text-sm font-semibold text-white">
            {fr ? 'Payer maintenant' : 'Pay now'}
          </Text>
        </TouchableOpacity>
      </View>
      )}
    </BottomSheetModal>
  );
}
