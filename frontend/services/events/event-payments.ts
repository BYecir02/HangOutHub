import * as WebBrowser from 'expo-web-browser';

import api from '@/services/api';
import type { EventBookingTicket } from '@/services/events/event-bookings';

export interface StartPaymentResponse {
  free: boolean;
  status: string;
  paymentUrl: string | null;
  callbackUrl?: string;
  transactionId?: string;
}

export interface PaymentStatusResponse {
  status: string; // PENDING | CONFIRMED
  qrCode: string | null;
}

export interface PaymentMethodOption {
  id: string;
  label: string;
  kind: 'mobile_money' | 'card';
}

export interface PaymentMethodsResponse {
  country: { code: string; name: string; currency: string };
  methods: PaymentMethodOption[];
}

export async function getBookingPaymentMethods(
  bookingId: string,
): Promise<PaymentMethodsResponse> {
  const { data } = await api.get<PaymentMethodsResponse>(
    `/bookings/${bookingId}/payment-methods`,
  );
  return data;
}

export async function startBookingPayment(
  bookingId: string,
): Promise<StartPaymentResponse> {
  const { data } = await api.post<StartPaymentResponse>(
    `/bookings/${bookingId}/pay`,
  );
  return data;
}

export async function getBookingPaymentStatus(
  bookingId: string,
): Promise<PaymentStatusResponse> {
  const { data } = await api.get<PaymentStatusResponse>(
    `/bookings/${bookingId}/payment-status`,
  );
  return data;
}

/**
 * Flux de paiement complet : crée la transaction, ouvre la page FedaPay
 * (Mobile Money / carte), attend le retour, puis vérifie le statut.
 * Renvoie le statut final ('CONFIRMED' | 'PENDING').
 */
export async function payForBooking(
  bookingId: string,
): Promise<PaymentStatusResponse> {
  const start = await startBookingPayment(bookingId);

  // Billet gratuit -> déjà confirmé côté serveur.
  if (start.free || !start.paymentUrl) {
    return { status: start.status, qrCode: null };
  }

  const returnUrl =
    start.callbackUrl || 'https://hangouthub.app/payment-callback';

  // Ouvre la page de paiement ; se ferme quand FedaPay redirige vers returnUrl,
  // ou quand l'utilisateur ferme la fenêtre.
  await WebBrowser.openAuthSessionAsync(start.paymentUrl, returnUrl);

  // Le webhook a peut-être déjà confirmé ; sinon on poll quelques fois.
  return pollPaymentStatus(bookingId);
}

/**
 * Si la réservation nécessite un paiement, lance FedaPay puis met à jour la
 * réservation locale si elle est confirmée. Renvoie la réservation finale.
 */
export async function settleBookingPayment(
  reserved: EventBookingTicket,
  onUpdate: (booking: EventBookingTicket) => void,
): Promise<EventBookingTicket> {
  if ((reserved.status || '').toUpperCase() === 'CONFIRMED') {
    return reserved;
  }

  const result = await payForBooking(reserved.id);

  if ((result.status || '').toUpperCase() === 'CONFIRMED') {
    const updated: EventBookingTicket = {
      ...reserved,
      status: 'CONFIRMED',
      qrCode: result.qrCode ?? reserved.qrCode,
    };
    onUpdate(updated);
    return updated;
  }

  return reserved;
}

async function pollPaymentStatus(
  bookingId: string,
  attempts = 5,
  delayMs = 1500,
): Promise<PaymentStatusResponse> {
  let last: PaymentStatusResponse = { status: 'PENDING', qrCode: null };

  for (let i = 0; i < attempts; i += 1) {
    try {
      last = await getBookingPaymentStatus(bookingId);
      if ((last.status || '').toUpperCase() === 'CONFIRMED') {
        return last;
      }
    } catch {
      // on réessaie
    }

    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return last;
}
