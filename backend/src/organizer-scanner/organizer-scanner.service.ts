import { ForbiddenException, Injectable } from '@nestjs/common';

import { hasPlaceTeamRoleAtLeast } from '../permissions/place-team-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyScanDto } from './dto/verify-scan.dto';

export type ScanStatus =
  | 'VALID_CHECKED_IN_NOW'
  | 'VALID_ALREADY_CHECKED_IN'
  | 'INVALID_CODE'
  | 'BOOKING_NOT_FOUND'
  | 'NOT_FOR_THIS_EVENT'
  | 'BOOKING_NOT_CONFIRMED'
  | 'EVENT_EXPIRED'
  | 'UNAUTHORIZED_SCANNER';

export interface VerifyScanResult {
  status: ScanStatus;
  bookingId: string | null;
  eventId: string | null;
  checkInWindow: {
    opensAt: string;
    closesAt: string;
    reason: 'TOO_EARLY' | 'TOO_LATE';
  } | null;
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

@Injectable()
export class OrganizerScannerService {
  constructor(private readonly prisma: PrismaService) {}

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private buildResult(
    status: ScanStatus,
    message: string,
    extra?: Partial<Omit<VerifyScanResult, 'status' | 'message'>>,
  ): VerifyScanResult {
    return {
      status,
      message,
      bookingId: extra?.bookingId ?? null,
      eventId: extra?.eventId ?? null,
      checkInWindow: extra?.checkInWindow ?? null,
      attendee: extra?.attendee ?? null,
      ticket: extra?.ticket ?? null,
      checkedInAt: extra?.checkedInAt ?? null,
    };
  }

  async verify(
    userId: string,
    role: string,
    input: VerifyScanDto,
  ): Promise<VerifyScanResult> {
    const normalizedRole = role.toUpperCase();
    const isProfessionalScannerRole =
      normalizedRole === 'ORGANIZER' || normalizedRole === 'PLACE_OWNER';

    if (isProfessionalScannerRole) {
      const scannerUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          OrganizerProfile: {
            select: {
              status: true,
            },
          },
        },
      });

      const organizerStatus =
        scannerUser?.OrganizerProfile?.status || 'PENDING';
      if (['PENDING', 'REJECTED', 'SUSPENDED'].includes(organizerStatus)) {
        throw new ForbiddenException('UNAUTHORIZED_SCANNER');
      }
    }

    const normalizedCode = input.code?.trim();

    if (!normalizedCode) {
      return this.buildResult('INVALID_CODE', 'Code QR invalide.');
    }

    const booking = await this.prisma.booking.findFirst({
      where: this.isUuid(normalizedCode)
        ? {
            OR: [{ id: normalizedCode }, { qrCode: normalizedCode }],
          }
        : {
            qrCode: normalizedCode,
          },
      include: {
        User: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
        TicketType: {
          select: {
            id: true,
            name: true,
          },
        },
        Event: {
          select: {
            id: true,
            organizerId: true,
            placeId: true,
            startTime: true,
            endTime: true,
            checkInOpensAtOffsetMin: true,
            checkInClosesAtOffsetMin: true,
            EventCollaborator: {
              where: {
                userId,
              },
              select: {
                permission: true,
              },
              take: 1,
            },
            Place: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!booking || !booking.Event) {
      return this.buildResult('BOOKING_NOT_FOUND', 'Reservation introuvable.');
    }

    const bookingStatus = (booking.status || 'PENDING').toUpperCase();
    const basePayload = {
      bookingId: booking.id,
      eventId: booking.Event.id,
      attendee: {
        id: booking.User.id,
        displayName: booking.User.displayName,
        username: booking.User.username,
      },
      ticket: {
        ticketTypeId: booking.TicketType?.id ?? null,
        ticketTypeName: booking.TicketType?.name ?? null,
      },
    };

    if (input.eventId && booking.Event.id !== input.eventId) {
      return this.buildResult(
        'NOT_FOR_THIS_EVENT',
        'Ce billet ne correspond pas a cet evenement.',
        basePayload,
      );
    }

    const placeTeamRole = booking.Event.placeId
      ? (
          await this.prisma.$queryRaw<Array<{ role: string | null }>>`
            SELECT "role"
            FROM "PlaceTeamMember"
            WHERE "placeId" = ${booking.Event.placeId}::uuid
              AND "userId" = ${userId}::uuid
            LIMIT 1
          `
        )[0]?.role || null
      : null;

    const isAuthorizedForEvent =
      normalizedRole === 'ADMIN' ||
      (normalizedRole === 'ORGANIZER' &&
        booking.Event.organizerId === userId) ||
      (normalizedRole === 'PLACE_OWNER' &&
        booking.Event.Place?.ownerId === userId) ||
      hasPlaceTeamRoleAtLeast(placeTeamRole, 'SCANNER') ||
      ['SCAN', 'EDIT'].includes(
        booking.Event.EventCollaborator[0]?.permission?.toUpperCase() || '',
      );

    if (!isAuthorizedForEvent) {
      return this.buildResult(
        'UNAUTHORIZED_SCANNER',
        'Vous ne pouvez pas scanner cet evenement.',
        basePayload,
      );
    }

    const now = new Date();
    const checkInOpensAtOffsetMin =
      booking.Event.checkInOpensAtOffsetMin ?? -60;
    const checkInClosesAtOffsetMin =
      booking.Event.checkInClosesAtOffsetMin ?? 180;
    const checkInOpensAt = new Date(
      booking.Event.startTime.getTime() + checkInOpensAtOffsetMin * 60_000,
    );
    const checkInClosesAt = new Date(
      booking.Event.startTime.getTime() + checkInClosesAtOffsetMin * 60_000,
    );

    if (now < checkInOpensAt || now > checkInClosesAt) {
      const reason = now < checkInOpensAt ? 'TOO_EARLY' : 'TOO_LATE';

      return this.buildResult(
        'EVENT_EXPIRED',
        'Le scan n est pas disponible a ce moment.',
        {
          ...basePayload,
          checkInWindow: {
            opensAt: checkInOpensAt.toISOString(),
            closesAt: checkInClosesAt.toISOString(),
            reason,
          },
        },
      );
    }

    if (bookingStatus === 'USED' || bookingStatus === 'CHECKED_IN') {
      return this.buildResult(
        'VALID_ALREADY_CHECKED_IN',
        'Billet deja utilise.',
        basePayload,
      );
    }

    if (!['CONFIRMED', 'PAID'].includes(bookingStatus)) {
      return this.buildResult(
        'BOOKING_NOT_CONFIRMED',
        'Reservation non confirmee.',
        basePayload,
      );
    }

    const updated = await this.prisma.booking.updateMany({
      where: {
        id: booking.id,
        status: {
          in: ['CONFIRMED', 'PAID'],
        },
      },
      data: {
        status: 'USED',
      },
    });

    if (updated.count === 0) {
      const latest = await this.prisma.booking.findUnique({
        where: { id: booking.id },
        select: { status: true },
      });

      const latestStatus = (latest?.status || 'PENDING').toUpperCase();
      if (latestStatus === 'USED' || latestStatus === 'CHECKED_IN') {
        return this.buildResult(
          'VALID_ALREADY_CHECKED_IN',
          'Billet deja utilise.',
          basePayload,
        );
      }

      return this.buildResult(
        'BOOKING_NOT_CONFIRMED',
        'Reservation non confirmee.',
        basePayload,
      );
    }

    return this.buildResult('VALID_CHECKED_IN_NOW', 'Check-in valide.', {
      ...basePayload,
      checkedInAt: new Date().toISOString(),
    });
  }
}
