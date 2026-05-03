import type { TranslationKey } from '@/services/shared/i18n';
import {
  getTicketStatusTranslationKey,
  type TicketStatusBadgeContext,
} from '@/services/shared/ticket-status';

export type TranslationFn = (key: TranslationKey, params?: Record<string, unknown>) => string;

type DateInput = string | number | Date | null | undefined;

interface EventDateFormatOptions {
  includeWeekday?: boolean;
  fallback?: string;
}

interface PriceFormatOptions {
  freeLabel?: string;
  currency?: string;
  fallback?: string;
  prefix?: string;
}

export interface EventCardTicketTypeLike {
  price?: number | string | null;
  quantity?: number | string | null;
}

export interface EventCardPriceSource {
  entryFee?: number | string | null;
  TicketType?: EventCardTicketTypeLike[] | null;
}

interface EventCardPriceLabelOptions extends PriceFormatOptions {
  soldOutLabel?: string;
  minimumPrefix?: string;
}

interface RelativeDateFormatOptions {
  fallback?: string;
}

function toDate(value: DateInput): Date | null {
  if (!value && value !== 0) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function normalizeStatus(
  status: string | null | undefined,
  fallback = 'UNKNOWN',
): string {
  const normalized = (status || '').toUpperCase().trim();
  return normalized || fallback;
}

export function formatEventDate(
  value: DateInput,
  locale: string,
  options: EventDateFormatOptions = {},
): string {
  const parsed = toDate(value);
  if (!parsed) {
    return options.fallback ?? '--';
  }

  return new Intl.DateTimeFormat(locale, {
    ...(options.includeWeekday ? { weekday: 'short' as const } : undefined),
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function formatPrice(
  value: number | string | null | undefined,
  locale: string,
  options: PriceFormatOptions = {},
): string {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return options.fallback ?? '--';
  }

  if (numericValue <= 0) {
    return options.freeLabel ?? 'Free';
  }

  const currencyLabel = options.currency || 'FCFA';
  const formattedPrice = `${numericValue.toLocaleString(locale)} ${currencyLabel}`;
  return options.prefix ? `${options.prefix}${formattedPrice}` : formattedPrice;
}

export function formatEventCardPriceLabel(
  event: EventCardPriceSource,
  locale: string,
  options: EventCardPriceLabelOptions = {},
): string {
  const { soldOutLabel = 'Sold out', minimumPrefix = '+ ', ...priceOptions } = options;
  const ticketTypes = event.TicketType || [];

  if (ticketTypes.length > 0) {
    const availableTicketTypes = ticketTypes.filter((ticketType) => Number(ticketType.quantity || 0) > 0);

    if (availableTicketTypes.length === 0) {
      return soldOutLabel;
    }

    const minimumPrice = Math.min(
      ...availableTicketTypes.map((ticketType) => Number(ticketType.price || 0)),
    );

    if (minimumPrice <= 0) {
      return priceOptions.freeLabel ?? 'Free';
    }

    return formatPrice(minimumPrice, locale, {
      ...priceOptions,
      prefix: minimumPrefix,
    });
  }

  return formatPrice(event.entryFee, locale, priceOptions);
}

export function formatRelativeDate(
  value: DateInput,
  locale: string,
  options: RelativeDateFormatOptions = {},
): string {
  const parsed = toDate(value);
  if (!parsed) {
    return options.fallback ?? '--';
  }

  const now = new Date();
  const diffMs = parsed.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (absMs < hourMs) {
    const minutes = Math.round(diffMs / minuteMs);
    return formatter.format(minutes, 'minute');
  }

  if (absMs < dayMs) {
    const hours = Math.round(diffMs / hourMs);
    return formatter.format(hours, 'hour');
  }

  const days = Math.round(diffMs / dayMs);
  return formatter.format(days, 'day');
}

export function formatStatusLabel(
  status: string | null | undefined,
  labels: Partial<Record<string, string>>,
  fallbackLabel: string,
): string {
  const normalized = normalizeStatus(status);
  return labels[normalized] || fallbackLabel;
}

export function formatTicketStatusLabel(
  status: string | null | undefined,
  t: TranslationFn,
  context: TicketStatusBadgeContext = 'myTickets',
): string {
  return t(getTicketStatusTranslationKey(status, context));
}
