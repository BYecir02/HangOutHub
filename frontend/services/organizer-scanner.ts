import api from '@/services/api';

export type ScannerVerificationStatus =
  | 'VALID_CHECKED_IN_NOW'
  | 'VALID_ALREADY_CHECKED_IN'
  | 'INVALID_CODE'
  | 'BOOKING_NOT_FOUND'
  | 'NOT_FOR_THIS_EVENT'
  | 'BOOKING_NOT_CONFIRMED'
  | 'EVENT_EXPIRED'
  | 'UNAUTHORIZED_SCANNER';

export interface ScannerVerificationResult {
  status: ScannerVerificationStatus;
  bookingId: string | null;
  eventId: string | null;
  attendee: {
    id: string;
    displayName: string | null;
    username: string | null;
  } | null;
  ticket: {
    ticketTypeId: string | null;
    ticketTypeName: string | null;
  } | null;
  checkedInAt: string | null;
  message: string;
}

interface VerifyScanPayload {
  code: string;
  eventId?: string;
  source?: 'ios' | 'android' | 'web';
}

export const verifyOrganizerScan = async (
  payload: VerifyScanPayload,
): Promise<ScannerVerificationResult> => {
  const response = await api.post<ScannerVerificationResult>(
    '/organizer/scanner/verify',
    payload,
  );

  return response.data;
};
