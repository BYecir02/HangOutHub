import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { OPERATOR_LABELS, resolveCountry } from './countries';
import { FedaPayService } from './fedapay.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fedapay: FedaPayService,
  ) {}

  /** Moyens de paiement disponibles pour une réservation, selon le pays de l'event. */
  async getBookingPaymentMethods(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        userId: true,
        Event: {
          select: {
            City: { select: { country: true } },
            Place: { select: { City: { select: { country: true } } } },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Réservation introuvable.');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas.');
    }

    const country = resolveCountry(
      booking.Event.City?.country ?? booking.Event.Place?.City?.country,
    );

    const methods = [
      ...country.methods.map((id) => ({
        id,
        label: OPERATOR_LABELS[id] ?? id,
        kind: 'mobile_money' as const,
      })),
      { id: 'card', label: 'Carte bancaire', kind: 'card' as const },
    ];

    return {
      country: { code: country.code, name: country.name, currency: country.currency },
      methods,
    };
  }

  private resolveCallbackUrl(): string {
    const base = (process.env.APP_PUBLIC_URL || 'https://hangouthub.app').replace(
      /\/$/,
      '',
    );
    return `${base}/payment-callback`;
  }

  /**
   * Démarre le paiement d'une réservation PENDING : crée une transaction FedaPay
   * et renvoie l'URL de paiement. Si le billet est gratuit, confirme directement.
   */
  async startBookingPayment(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        Event: {
          select: {
            title: true,
            entryFee: true,
            City: { select: { country: true } },
            Place: { select: { City: { select: { country: true } } } },
          },
        },
        TicketType: { select: { price: true, name: true } },
        User: {
          select: {
            displayName: true,
            username: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Réservation introuvable.');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas.');
    }
    if ((booking.status || '').toUpperCase() === 'CONFIRMED') {
      throw new BadRequestException('Cette réservation est déjà payée.');
    }

    const amount = Number(booking.TicketType?.price ?? booking.Event.entryFee ?? 0);

    if (amount <= 0) {
      const confirmed = await this.confirmBooking(bookingId);
      return {
        free: true,
        status: confirmed.status,
        qrCode: confirmed.qrCode,
        paymentUrl: null,
      };
    }

    const fullName = (
      booking.User.displayName ||
      booking.User.username ||
      'Client'
    ).trim();
    const [firstname, ...rest] = fullName.split(' ');
    const lastname = rest.join(' ') || 'HangOutHub';

    const callbackUrl = this.resolveCallbackUrl();
    const country = resolveCountry(
      booking.Event.City?.country ?? booking.Event.Place?.City?.country,
    );
    const tx = await this.fedapay.createTransaction({
      amount,
      description: `Billet - ${booking.Event.title}`.slice(0, 255),
      callbackUrl,
      currency: country.currency,
      customer: {
        firstname,
        lastname,
        email: booking.User.email || undefined,
        phoneNumber: booking.User.phoneNumber || undefined,
        phoneCountry: country.phone,
      },
    });

    await this.prisma.payment.create({
      data: {
        bookingId,
        amount,
        provider: 'fedapay',
        status: 'PENDING',
        transactionId: tx.transactionId,
        reference: tx.reference,
        paymentUrl: tx.url,
        currency: 'XOF',
      },
    });

    return {
      free: false,
      status: 'PENDING',
      paymentUrl: tx.url,
      callbackUrl,
      transactionId: tx.transactionId,
    };
  }

  /**
   * Vérifie l'état du paiement auprès de FedaPay (fallback au webhook).
   * Si approuvé -> confirme la réservation + génère le QR.
   */
  async checkBookingPayment(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { Payment: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!booking) {
      throw new NotFoundException('Réservation introuvable.');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas.');
    }

    if ((booking.status || '').toUpperCase() === 'CONFIRMED') {
      return { status: 'CONFIRMED', qrCode: booking.qrCode };
    }

    const payment = booking.Payment[0];
    if (payment?.transactionId) {
      const fedaStatus = await this.fedapay.getStatus(payment.transactionId);

      if (fedaStatus === 'approved') {
        const confirmed = await this.confirmBooking(bookingId, payment.id);
        return { status: 'CONFIRMED', qrCode: confirmed.qrCode };
      }

      if (fedaStatus === 'declined' || fedaStatus === 'canceled') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: fedaStatus.toUpperCase() },
        });
      }
    }

    return { status: 'PENDING', qrCode: null };
  }

  /**
   * Webhook FedaPay : on ne fait PAS confiance au payload, on re-vérifie le
   * statut via l'API avant de confirmer (sécurité).
   */
  async handleWebhook(transactionId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionId },
    });
    if (!payment) {
      return;
    }

    const status = await this.fedapay.getStatus(transactionId);
    if (status === 'approved') {
      await this.confirmBooking(payment.bookingId, payment.id);
    } else if (status === 'declined' || status === 'canceled') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: status.toUpperCase() },
      });
    }
  }

  /** Passe une réservation PENDING -> CONFIRMED + génère le QR. Idempotent. */
  private async confirmBooking(bookingId: string, paymentId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true, qrCode: true },
    });

    if (booking && (booking.status || '').toUpperCase() === 'CONFIRMED') {
      if (paymentId) {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'APPROVED' },
        });
      }
      return { status: 'CONFIRMED', qrCode: booking.qrCode };
    }

    const qrCode = booking?.qrCode || randomUUID();
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', qrCode },
      select: { status: true, qrCode: true },
    });

    if (paymentId) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED' },
      });
    }

    return updated;
  }
}
