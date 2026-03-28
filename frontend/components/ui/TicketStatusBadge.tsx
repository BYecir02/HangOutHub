import React from 'react';
import { Text, View } from 'react-native';

import { useI18n } from '@/hooks/use-i18n';
import {
  getTicketStatusToneClass,
  getTicketStatusTranslationKey,
  type TicketStatusBadgeContext,
} from '@/services/ticket-status';

type TicketStatusBadgeProps = {
  status: string | null | undefined;
  context?: TicketStatusBadgeContext;
  size?: 'sm' | 'md';
  className?: string;
};

export default function TicketStatusBadge({
  status,
  context = 'myTickets',
  size = 'md',
  className = '',
}: TicketStatusBadgeProps) {
  const { t } = useI18n();
  const toneClass = getTicketStatusToneClass(status);
  const label = t(getTicketStatusTranslationKey(status, context));

  return (
    <View
      className={`rounded-full ${
        size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1'
      } ${toneClass} ${className}`.trim()}
    >
      <Text className="text-xs font-semibold">{label}</Text>
    </View>
  );
}
