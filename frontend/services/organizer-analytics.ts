import api from './api';

export interface OrganizerAnalyticsSummary {
  totalEvents: number;
  upcomingEvents: number;
  liveEvents: number;
  pastEvents: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  scannedBookings: number;
  checkInRate: number;
  uniqueAttendees: number;
  promoRedemptions: number;
  grossRevenue: number;
}

export interface OrganizerTopEventAnalytics {
  eventId: string;
  title: string;
  startTime: string;
  bookingsTotal: number;
  bookingsConfirmed: number;
  bookingsPending: number;
  scannedCount: number;
  grossRevenue: number;
  promoRedemptions: number;
}

export interface OrganizerTicketSalesAnalytics {
  ticketTypeId: string;
  name: string;
  eventId: string;
  eventTitle: string;
  unitsSold: number;
  revenue: number;
}

export interface OrganizerPeriodSalesAnalytics {
  period: string;
  eventsCount: number;
  bookingsConfirmed: number;
  revenue: number;
}

export interface OrganizerAnalyticsResponse {
  summary: OrganizerAnalyticsSummary;
  topEvents: OrganizerTopEventAnalytics[];
  salesByTicket: OrganizerTicketSalesAnalytics[];
  salesByPeriod: OrganizerPeriodSalesAnalytics[];
}

export async function fetchOrganizerAnalytics() {
  const response = await api.get<OrganizerAnalyticsResponse>('/events/analytics/overview');
  return response.data;
}
