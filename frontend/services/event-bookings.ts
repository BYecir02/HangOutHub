import api from './api';

export interface EventBookingTicket {
  id: string;
  eventId: string | null;
  status: string;
  qrCode: string | null;
  event: {
    id: string;
    title: string;
    startTime: string;
    endTime: string | null;
    coverUrl: string | null;
    organizerId: string;
    place: {
      id: string;
      name: string;
    } | null;
  } | null;
  ticketType: {
    id: string;
    name: string;
  } | null;
}

export interface EventScansResponse {
  event: {
    id: string;
    title: string;
  };
  counters: {
    expectedCount: number;
    scannedCount: number;
    pendingCount: number;
    remainingCount: number;
  };
  scans: Array<{
    bookingId: string;
    status: string;
    attendee: {
      id: string;
      displayName: string | null;
      username: string | null;
      avatarUrl: string | null;
    };
    ticket: {
      ticketTypeId: string | null;
      ticketTypeName: string | null;
    };
  }>;
}

export const createEventBooking = async (
  eventId: string,
  ticketTypeId?: string,
): Promise<EventBookingTicket> => {
  const response = await api.post<EventBookingTicket>(`/events/${eventId}/book`, {
    ticketTypeId,
  });

  return response.data;
};

export const getMyEventBookings = async (): Promise<EventBookingTicket[]> => {
  const response = await api.get<EventBookingTicket[]>('/events/my-bookings');
  return response.data;
};

export const getEventScans = async (eventId: string): Promise<EventScansResponse> => {
  const response = await api.get<EventScansResponse>(`/events/${eventId}/scans`);
  return response.data;
};
