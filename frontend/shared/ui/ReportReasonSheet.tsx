import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import BottomSheetModal from '@/shared/ui/BottomSheetModal';
import type { TranslationKey } from '@/services/shared/i18n';
import { useI18n } from '@/shared/hooks/use-i18n';

type ReportReasonSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmitReason: (reason: string) => Promise<void> | void;
};

const REASON_KEYS: TranslationKey[] = [
  'reportReasonSpam',
  'reportReasonHarassment',
  'reportReasonInappropriate',
  'reportReasonScam',
  'reportReasonOther',
];

export default function ReportReasonSheet({
  visible,
  onClose,
  onSubmitReason,
}: ReportReasonSheetProps) {
  const { t } = useI18n();
  const [pendingReason, setPendingReason] = useState<string | null>(null);

  const reasons = useMemo(() => REASON_KEYS.map((key) => t(key)), [t]);

  const handleSelectReason = async (reason: string) => {
    setPendingReason(reason);
    try {
      await onSubmitReason(reason);
      onClose();
    } finally {
      setPendingReason(null);
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={t('reportTitle')}
      subtitle={t('reportPrompt')}
      contentMode="auto"
      maxHeight={420}
    >
      <View className="gap-2">
        {reasons.map((reason) => {
          const isPending = pendingReason === reason;
          return (
            <TouchableOpacity
              key={reason}
              onPress={() => {
                void handleSelectReason(reason);
              }}
              disabled={Boolean(pendingReason)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              {isPending ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#4c669f" />
                  <Text className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {reason}
                  </Text>
                </View>
              ) : (
                <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {reason}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={onClose}
          disabled={Boolean(pendingReason)}
          className="mt-1 items-center rounded-2xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-900"
        >
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('genericCancel')}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}
