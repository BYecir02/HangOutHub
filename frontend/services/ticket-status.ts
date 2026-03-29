import type { TranslationKey } from '@/services/i18n';

export type TicketStatusBadgeContext = 'myTickets' | 'eventScans';

const DEFAULT_TONE_CLASS =
  'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300';

const STATUS_TONE_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  CONFIRMED:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  USED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CHECKED_IN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CANCELLED: DEFAULT_TONE_CLASS,
};

const STATUS_LABEL_KEY_BY_CONTEXT: Record<
  TicketStatusBadgeContext,
  Record<string, TranslationKey>
> = {
  myTickets: {
    PENDING: 'myTicketsStatusPending',
    CONFIRMED: 'myTicketsStatusConfirmed',
    PAID: 'myTicketsStatusPaid',
    USED: 'myTicketsStatusUsed',
    CHECKED_IN: 'myTicketsStatusCheckedIn',
    CANCELLED: 'myTicketsStatusCancelled',
  },
  eventScans: {
    USED: 'organizerEventScansStatusUsed',
    CHECKED_IN: 'organizerEventScansStatusCheckedIn',
  },
};

const UNKNOWN_LABEL_KEY_BY_CONTEXT: Record<TicketStatusBadgeContext, TranslationKey> = {
  myTickets: 'myTicketsStatusUnknown',
  eventScans: 'organizerEventScansStatusUnknown',
};

export function normalizeTicketStatus(status: string | null | undefined): string {
  return (status || '').toUpperCase().trim() || 'PENDING';
}

export function getTicketStatusToneClass(status: string | null | undefined): string {
  const normalized = normalizeTicketStatus(status);
  return STATUS_TONE_CLASS[normalized] || DEFAULT_TONE_CLASS;
}

export function getTicketStatusTranslationKey(
  status: string | null | undefined,
  context: TicketStatusBadgeContext = 'myTickets',
): TranslationKey {
  const normalized = normalizeTicketStatus(status);
  const key = STATUS_LABEL_KEY_BY_CONTEXT[context][normalized];
  if (key) {
    return key;
  }

  return UNKNOWN_LABEL_KEY_BY_CONTEXT[context];
}
