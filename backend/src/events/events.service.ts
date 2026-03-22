import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateEventBookingDto } from './dto/create-event-booking.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  private parseTicketTypesPayload(raw?: string) {
    if (!raw) {
      return [] as Array<{ name: string; price: number; quantity: number }>;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Format ticketTypes invalide.');
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException('ticketTypes doit etre une liste.');
    }

    const normalized = parsed.map((item) => {
      const candidate = item as {
        name?: string;
        price?: number | string;
        quantity?: number | string;
      };

      const name = (candidate.name || '').trim();
      const price = Number(candidate.price || 0);
      const quantity = Number(candidate.quantity || 0);

      if (!name) {
        throw new BadRequestException('Chaque tarif doit avoir un nom.');
      }

      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException('Prix de tarif invalide.');
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestException('Quantite de tarif invalide.');
      }

      return { name, price, quantity };
    });

    const dedup = new Set<string>();
    for (const ticketType of normalized) {
      const key = ticketType.name.toLowerCase();
      if (dedup.has(key)) {
        throw new BadRequestException('Les noms de tarifs doivent etre uniques.');
      }
      dedup.add(key);
    }

    return normalized;
  }

  private formatBooking(booking: {
    id: string;
    status: string | null;
    qrCode: string | null;
    eventId: string | null;
    Event: {
      id: string;
      title: string;
      startTime: Date;
      endTime: Date | null;
      coverUrl: string | null;
      organizerId: string;
      Place: {
        id: string;
        name: string;
      } | null;
    } | null;
    TicketType: {
      id: string;
      name: string;
    } | null;
  }) {
    return {
      id: booking.id,
      eventId: booking.eventId,
      status: (booking.status || 'PENDING').toUpperCase(),
      qrCode: booking.qrCode,
      event: booking.Event
        ? {
            id: booking.Event.id,
            title: booking.Event.title,
            startTime: booking.Event.startTime,
            endTime: booking.Event.endTime,
            coverUrl: booking.Event.coverUrl,
            organizerId: booking.Event.organizerId,
            place: booking.Event.Place,
          }
        : null,
      ticketType: booking.TicketType
        ? {
            id: booking.TicketType.id,
            name: booking.TicketType.name,
          }
        : null,
    };
  }

  async create(
    userId: string,
    createEventDto: CreateEventDto,
    files: {
      cover?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    } = {},
  ) {
    const coverFile = files?.cover?.[0] ?? null;
    const coverUrl = coverFile
      ? await this.storageService.uploadFile('events', coverFile)
      : null;

    const galleryUrls =
      files?.gallery && files.gallery.length > 0
        ? await this.storageService.uploadFiles('events', files.gallery)
        : [];

    const ticketTypes = this.parseTicketTypesPayload(createEventDto.ticketTypes);
    const fallbackEntryFee = Number(createEventDto.entryFee || 0);
    const minTicketPrice =
      ticketTypes.length > 0
        ? Math.min(...ticketTypes.map((ticketType) => ticketType.price))
        : fallbackEntryFee;

    return this.prisma.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        startTime: new Date(createEventDto.startTime),
        endTime: createEventDto.endTime
          ? new Date(createEventDto.endTime)
          : null,
        entryFee: minTicketPrice,
        coverUrl,
        images: galleryUrls,
        organizerId: userId,
        placeId: createEventDto.placeId || null,
        ...(ticketTypes.length > 0
          ? {
              TicketType: {
                create: ticketTypes.map((ticketType) => ({
                  name: ticketType.name,
                  price: ticketType.price,
                  quantity: ticketType.quantity,
                })),
              },
            }
          : {}),
      },
    });
  }

  findAll() {
    return this.prisma.event.findMany({
      include: {
        User: { select: { username: true, avatarUrl: true } },
        Place: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  findMine(userId: string) {
    return this.prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async update(
    eventId: string,
    userId: string,
    role: string,
    payload: UpdateEventDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizerId: true,
        placeId: true,
        startTime: true,
        endTime: true,
        Place: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }

    const normalizedRole = role.toUpperCase();
    const canEditAsOrganizer =
      normalizedRole === 'ORGANIZER' && event.organizerId === userId;
    const canEditAsPlaceOwner =
      normalizedRole === 'PLACE_OWNER' && event.Place?.ownerId === userId;

    if (!canEditAsOrganizer && !canEditAsPlaceOwner) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier cet evenement.',
      );
    }

    if (payload.placeId) {
      const place = await this.prisma.place.findUnique({
        where: { id: payload.placeId },
        select: {
          id: true,
          ownerId: true,
        },
      });

      if (!place) {
        throw new BadRequestException('Lieu introuvable pour cet evenement.');
      }

      if (normalizedRole === 'PLACE_OWNER' && place.ownerId !== userId) {
        throw new ForbiddenException('Vous ne pouvez pas lier ce lieu.');
      }
    }

    const nextStartTime = payload.startTime
      ? new Date(payload.startTime)
      : event.startTime;
    const nextEndTime = payload.endTime
      ? new Date(payload.endTime)
      : event.endTime;

    if (nextEndTime && nextEndTime < nextStartTime) {
      throw new BadRequestException(
        'La date de fin doit etre posterieure a la date de debut.',
      );
    }

    const ticketTypes = this.parseTicketTypesPayload(payload.ticketTypes);

    if (payload.ticketTypes !== undefined) {
      const existingTicketBookings = await this.prisma.booking.count({
        where: {
          eventId,
          ticketTypeId: {
            not: null,
          },
          NOT: {
            status: 'CANCELLED',
          },
        },
      });

      if (existingTicketBookings > 0) {
        throw new BadRequestException(
          'Impossible de modifier les tarifs: des reservations existent deja.',
        );
      }

      await this.prisma.ticketType.deleteMany({
        where: {
          eventId,
        },
      });
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description }
          : {}),
        ...(payload.startTime !== undefined
          ? { startTime: new Date(payload.startTime) }
          : {}),
        ...(payload.endTime !== undefined
          ? { endTime: new Date(payload.endTime) }
          : {}),
        ...(payload.entryFee !== undefined ? { entryFee: payload.entryFee } : {}),
        ...(payload.placeId !== undefined ? { placeId: payload.placeId } : {}),
        ...(payload.ticketTypes !== undefined
          ? {
              TicketType: {
                create: ticketTypes.map((ticketType) => ({
                  name: ticketType.name,
                  price: ticketType.price,
                  quantity: ticketType.quantity,
                })),
              },
              entryFee:
                ticketTypes.length > 0
                  ? Math.min(...ticketTypes.map((ticketType) => ticketType.price))
                  : Number(payload.entryFee || 0),
            }
          : {}),
      },
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
  }

  async createBooking(
    userId: string,
    eventId: string,
    payload: CreateEventBookingDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        entryFee: true,
        TicketType: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }

    const eventEnd = event.endTime || event.startTime;
    if (eventEnd < new Date()) {
      throw new BadRequestException('Impossible de reserver un evenement termine.');
    }

    const selectedTicketType = payload.ticketTypeId
      ? event.TicketType.find((ticketType) => ticketType.id === payload.ticketTypeId)
      : null;

    if (!payload.ticketTypeId && event.TicketType.length > 0) {
      throw new BadRequestException(
        'Selectionne un tarif pour reserver cet evenement.',
      );
    }

    if (payload.ticketTypeId && !selectedTicketType) {
      throw new BadRequestException('Type de billet invalide pour cet evenement.');
    }

    if (selectedTicketType && selectedTicketType.quantity <= 0) {
      throw new BadRequestException(
        `Le tarif ${selectedTicketType.name} est epuise.`,
      );
    }

    const existing = await this.prisma.booking.findFirst({
      where: {
        userId,
        eventId,
        NOT: {
          status: 'CANCELLED',
        },
      },
      include: {
        Event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            coverUrl: true,
            organizerId: true,
            Place: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        TicketType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (existing) {
      const existingStatus = (existing.status || 'PENDING').toUpperCase();
      const needsQrCode = ['CONFIRMED', 'PAID', 'USED', 'CHECKED_IN'].includes(
        existingStatus,
      );

      if (!existing.qrCode && needsQrCode) {
        const upgraded = await this.prisma.booking.update({
          where: { id: existing.id },
          data: {
            qrCode: randomUUID(),
          },
          include: {
            Event: {
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                coverUrl: true,
                organizerId: true,
                Place: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            TicketType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return this.formatBooking(upgraded);
      }

      return this.formatBooking(existing);
    }

    const hasEntryFee = Number(event.entryFee || 0) > 0;
    const ticketPrice = Number(selectedTicketType?.price || 0);
    const paymentRequired = ticketPrice > 0 || (!selectedTicketType && hasEntryFee);
    const status = paymentRequired ? 'PENDING' : 'CONFIRMED';
    const qrCode = paymentRequired ? null : randomUUID();

    const created = await this.prisma.$transaction(async (tx) => {
      if (selectedTicketType) {
        const stockUpdate = await tx.ticketType.updateMany({
          where: {
            id: selectedTicketType.id,
            quantity: {
              gt: 0,
            },
          },
          data: {
            quantity: {
              decrement: 1,
            },
          },
        });

        if (stockUpdate.count === 0) {
          throw new BadRequestException(
            `Le tarif ${selectedTicketType.name} est epuise.`,
          );
        }
      }

      return tx.booking.create({
        data: {
          userId,
          eventId,
          ticketTypeId: selectedTicketType?.id || null,
          status,
          qrCode,
        },
        include: {
          Event: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              coverUrl: true,
              organizerId: true,
              Place: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          TicketType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    return this.formatBooking(created);
  }

  async findMyBookings(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        eventId: {
          not: null,
        },
      },
      include: {
        Event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            coverUrl: true,
            organizerId: true,
            Place: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        TicketType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    return bookings.map((booking) => this.formatBooking(booking));
  }

  async findEventScans(eventId: string, userId: string, role: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizerId: true,
        title: true,
        Place: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }

    const normalizedRole = role.toUpperCase();
    const canReadScans =
      (normalizedRole === 'ORGANIZER' && event.organizerId === userId) ||
      (normalizedRole === 'PLACE_OWNER' && event.Place?.ownerId === userId);

    if (!canReadScans) {
      throw new ForbiddenException(
        'Vous ne pouvez pas consulter les scans de cet evenement.',
      );
    }

    const scannedStatuses = ['USED', 'CHECKED_IN'];
    const expectedStatuses = ['CONFIRMED', 'PAID', 'USED', 'CHECKED_IN'];

    const [scans, expectedCount, pendingCount] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          eventId,
          status: {
            in: scannedStatuses,
          },
        },
        select: {
          id: true,
          status: true,
          User: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
          TicketType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          id: 'desc',
        },
      }),
      this.prisma.booking.count({
        where: {
          eventId,
          status: {
            in: expectedStatuses,
          },
        },
      }),
      this.prisma.booking.count({
        where: {
          eventId,
          status: 'PENDING',
        },
      }),
    ]);

    return {
      event: {
        id: event.id,
        title: event.title,
      },
      counters: {
        expectedCount,
        scannedCount: scans.length,
        pendingCount,
        remainingCount: Math.max(expectedCount - scans.length, 0),
      },
      scans: scans.map((scan) => ({
        bookingId: scan.id,
        status: (scan.status || 'USED').toUpperCase(),
        attendee: {
          id: scan.User.id,
          displayName: scan.User.displayName,
          username: scan.User.username,
          avatarUrl: scan.User.avatarUrl,
        },
        ticket: {
          ticketTypeId: scan.TicketType?.id || null,
          ticketTypeName: scan.TicketType?.name || null,
        },
      })),
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
            coverUrl: true,
            cityId: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        TicketType: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }

    return event;
  }
}
