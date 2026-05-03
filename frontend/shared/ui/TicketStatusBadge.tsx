import React from 'react';

import { useI18n } from '@/hooks/use-i18n';
import Badge from '@/components/ui/primitives/Badge';
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
  const label = t(getTicketStatusTranslationKey(status, context));
  const toneClass = getTicketStatusToneClass(status);
  const tone =
    toneClass.includes('emerald')
      ? 'success'
      : toneClass.includes('amber')
        ? 'warning'
        : toneClass.includes('red')
          ? 'danger'
          : toneClass.includes('blue')
            ? 'brand'
            : 'neutral';

  return (
    <Badge
      label={label}
      tone={tone}
      variant="soft"
      size={size}
      className={className}
    />
  );
}
