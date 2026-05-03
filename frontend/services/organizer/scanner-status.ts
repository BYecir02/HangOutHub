import type { ScannerVerificationStatus } from '@/services/organizer/organizer-scanner';
import type { TranslationKey } from '@/services/shared/i18n';

export const scannerStatusToneClass: Record<ScannerVerificationStatus, string> = {
  VALID_CHECKED_IN_NOW:
    'border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20',
  VALID_ALREADY_CHECKED_IN:
    'border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20',
  INVALID_CODE:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  BOOKING_NOT_FOUND:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  NOT_FOR_THIS_EVENT:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  BOOKING_NOT_CONFIRMED:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  EVENT_EXPIRED:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
  UNAUTHORIZED_SCANNER:
    'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20',
};

export const scannerStatusTitleKey: Record<ScannerVerificationStatus, TranslationKey> = {
  VALID_CHECKED_IN_NOW: 'scannerStatusValidNow',
  VALID_ALREADY_CHECKED_IN: 'scannerStatusAlreadyUsed',
  INVALID_CODE: 'scannerStatusInvalid',
  BOOKING_NOT_FOUND: 'scannerStatusNotFound',
  NOT_FOR_THIS_EVENT: 'scannerStatusWrongEvent',
  BOOKING_NOT_CONFIRMED: 'scannerStatusNotConfirmed',
  EVENT_EXPIRED: 'scannerStatusExpired',
  UNAUTHORIZED_SCANNER: 'scannerStatusUnauthorized',
};

export const scannerStatusMessageKey: Record<ScannerVerificationStatus, TranslationKey> = {
  VALID_CHECKED_IN_NOW: 'scannerStatusMessageValidNow',
  VALID_ALREADY_CHECKED_IN: 'scannerStatusMessageAlreadyUsed',
  INVALID_CODE: 'scannerStatusMessageInvalid',
  BOOKING_NOT_FOUND: 'scannerStatusMessageNotFound',
  NOT_FOR_THIS_EVENT: 'scannerStatusMessageWrongEvent',
  BOOKING_NOT_CONFIRMED: 'scannerStatusMessageNotConfirmed',
  EVENT_EXPIRED: 'scannerStatusMessageExpired',
  UNAUTHORIZED_SCANNER: 'scannerStatusMessageUnauthorized',
};
