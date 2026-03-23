import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateEventBookingDto } from './dto/create-event-booking.dto';
import { CreateEventCollaboratorDto } from './dto/create-event-collaborator.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

export interface OrganizerAnalyticsOverview {
  summary: {
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
  };
  topEvents: Array<{
    eventId: string;
    title: string;
    startTime: Date;
    bookingsTotal: number;
    bookingsConfirmed: number;
    bookingsPending: number;
    scannedCount: number;
    grossRevenue: number;
    promoRedemptions: number;
  }>;
  salesByTicket: Array<{
    ticketTypeId: string;
    name: string;
    eventId: string;
    eventTitle: string;
    unitsSold: number;
    revenue: number;
  }>;
  salesByPeriod: Array<{
    period: string;
    eventsCount: number;
    bookingsConfirmed: number;
    revenue: number;
  }>;
}

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  private async captureEventSnapshot(
    tx: Prisma.TransactionClient | PrismaService,
    eventId: string,
  ) {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        description: true,
        cancellationPolicy: true,
        refundPolicy: true,
        startTime: true,
        endTime: true,
        checkInOpensAtOffsetMin: true,
        checkInClosesAtOffsetMin: true,
        maxTicketsPerUser: true,
        entryFee: true,
        coverUrl: true,
        images: true,
        address: true,
        organizerId: true,
        placeId: true,
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
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
        Promotion: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            maxRedemptions: true,
            redeemedCount: true,
            endDate: true,
          },
          orderBy: {
            id: 'desc',
          },
        },
        EventTag: {
          select: {
            tagId: true,
            Tag: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            tagId: 'asc',
          },
        },
        EventCollaborator: {
          select: {
            userId: true,
            permission: true,
            User: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      cancellationPolicy: event.cancellationPolicy,
      refundPolicy: event.refundPolicy,
      startTime: event.startTime,
      endTime: event.endTime,
      checkInOpensAtOffsetMin: event.checkInOpensAtOffsetMin,
      checkInClosesAtOffsetMin: event.checkInClosesAtOffsetMin,
      maxTicketsPerUser: event.maxTicketsPerUser,
      entryFee: Number(event.entryFee || 0),
      coverUrl: event.coverUrl,
      images: event.images,
      address: event.address,
      organizerId: event.organizerId,
      placeId: event.placeId,
      place: event.Place,
      ticketTypes: event.TicketType.map((ticketType) => ({
        id: ticketType.id,
        name: ticketType.name,
        price: Number(ticketType.price || 0),
        quantity: ticketType.quantity,
      })),
      promotions: event.Promotion.map((promotion) => ({
        id: promotion.id,
        code: promotion.code,
        discountType: promotion.discountType,
        discountValue: Number(promotion.discountValue || 0),
        maxRedemptions: promotion.maxRedemptions,
        redeemedCount: promotion.redeemedCount,
        endDate: promotion.endDate,
      })),
      tags: event.EventTag.map((eventTag) => ({
        id: eventTag.tagId,
        name: eventTag.Tag.name,
      })),
      collaborators: event.EventCollaborator.map((collaborator) => ({
        userId: collaborator.userId,
        permission: collaborator.permission,
        username: collaborator.User.username,
        displayName: collaborator.User.displayName,
      })),
    };
  }

  private async recordEventRevision(
    tx: Prisma.TransactionClient | PrismaService,
    eventId: string,
    actorUserId: string,
    action: 'CREATE' | 'UPDATE' | 'COLLABORATOR_UPSERT' | 'COLLABORATOR_REMOVE',
  ) {
    const snapshot = await this.captureEventSnapshot(tx, eventId);

    await tx.eventRevision.create({
      data: {
        eventId,
        actorUserId,
        action,
        snapshot: snapshot as Prisma.InputJsonValue,
      },
    });
  }

  private async createOrganizerNotification(payload: {
    organizerId: string;
    actorUserId: string;
    type:
      | 'ORGANIZER_BOOKING_CREATED'
      | 'ORGANIZER_EVENT_UPDATED'
      | 'ORGANIZER_COLLABORATOR_UPDATED'
      | 'ORGANIZER_SYSTEM';
    title: string;
    message: string;
    severity?: 'URGENT' | 'IMPORTANT' | 'INFO';
    targetPath: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!payload.organizerId || payload.organizerId === payload.actorUserId) {
      return;
    }

    const settings = await this.prisma.userSettings.findUnique({
      where: {
        userId: payload.organizerId,
      },
      select: {
        organizerNotifyBookings: true,
        organizerNotifyTeamUpdates: true,
        organizerNotificationPriorityMin: true,
      },
    });

    if (
      payload.type === 'ORGANIZER_BOOKING_CREATED' &&
      settings?.organizerNotifyBookings === false
    ) {
      return;
    }

    if (
      payload.type === 'ORGANIZER_COLLABORATOR_UPDATED' &&
      settings?.organizerNotifyTeamUpdates === false
    ) {
      return;
    }

    const severityOrder: Record<'INFO' | 'IMPORTANT' | 'URGENT', number> = {
      INFO: 1,
      IMPORTANT: 2,
      URGENT: 3,
    };
    const effectiveSeverity = payload.severity || 'IMPORTANT';
    const minSeverity =
      settings?.organizerNotificationPriorityMin === 'URGENT'
        ? 'URGENT'
        : 'IMPORTANT';

    if (severityOrder[effectiveSeverity] < severityOrder[minSeverity]) {
      return;
    }

    await this.prisma.notification.create({
      data: {
        userId: payload.organizerId,
        actorId: payload.actorUserId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        severity: effectiveSeverity,
        targetPath: payload.targetPath,
        payload: payload.metadata as Prisma.InputJsonValue | undefined,
        isRead: false,
      },
    });
  }

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

  private async getEventAuthorizationContext(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizerId: true,
        Place: {
          select: {
            ownerId: true,
          },
        },
        EventCollaborator: {
          where: {
            userId,
          },
          select: {
            permission: true,
          },
          take: 1,
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }

    const collaboratorPermission =
      event.EventCollaborator[0]?.permission?.toUpperCase() || null;

    return {
      event,
      collaboratorPermission,
    };
  }

  async listCollaborators(eventId: string, userId: string, role: string) {
    const normalizedRole = role.toUpperCase();
    const { event, collaboratorPermission } =
      await this.getEventAuthorizationContext(eventId, userId);

    const canReadCollaborators =
      (normalizedRole === 'ORGANIZER' && event.organizerId === userId) ||
      (normalizedRole === 'PLACE_OWNER' && event.Place?.ownerId === userId) ||
      Boolean(collaboratorPermission);

    if (!canReadCollaborators) {
      throw new ForbiddenException(
        'Vous ne pouvez pas consulter les collaborateurs de cet evenement.',
      );
    }

    return this.prisma.eventCollaborator.findMany({
      where: {
        eventId,
      },
      select: {
        userId: true,
        permission: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async addCollaborator(
    eventId: string,
    userId: string,
    role: string,
    payload: CreateEventCollaboratorDto,
  ) {
    const normalizedRole = role.toUpperCase();
    const { event } = await this.getEventAuthorizationContext(eventId, userId);

    const canManageCollaborators =
      (normalizedRole === 'ORGANIZER' && event.organizerId === userId) ||
      (normalizedRole === 'PLACE_OWNER' && event.Place?.ownerId === userId);

    if (!canManageCollaborators) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier les collaborateurs de cet evenement.',
      );
    }

    if (payload.userId === event.organizerId) {
      throw new BadRequestException(
        'L organisateur principal ne peut pas etre ajoute en collaborateur.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Utilisateur collaborateur introuvable.');
    }

    const permission = (payload.permission || 'EDIT').toUpperCase();

    await this.prisma.eventCollaborator.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: payload.userId,
        },
      },
      create: {
        eventId,
        userId: payload.userId,
        permission,
      },
      update: {
        permission,
      },
    });

    await this.recordEventRevision(
      this.prisma,
      eventId,
      userId,
      'COLLABORATOR_UPSERT',
    );

    await this.createOrganizerNotification({
      organizerId: event.organizerId,
      actorUserId: userId,
      type: 'ORGANIZER_COLLABORATOR_UPDATED',
      title: 'Equipe mise a jour',
      message: `${targetUser.displayName || targetUser.username || targetUser.id} a ete ajoute/modifie sur cet evenement.`,
      severity: 'IMPORTANT',
      targetPath: `/organizer/event-team?id=${eventId}`,
      metadata: {
        eventId,
        collaboratorUserId: targetUser.id,
        permission,
        action: 'COLLABORATOR_UPSERT',
      },
    });

    return this.listCollaborators(eventId, userId, role);
  }

  async removeCollaborator(
    eventId: string,
    userId: string,
    role: string,
    collaboratorUserId: string,
  ) {
    const normalizedRole = role.toUpperCase();
    const { event } = await this.getEventAuthorizationContext(eventId, userId);

    const canManageCollaborators =
      (normalizedRole === 'ORGANIZER' && event.organizerId === userId) ||
      (normalizedRole === 'PLACE_OWNER' && event.Place?.ownerId === userId);

    if (!canManageCollaborators) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier les collaborateurs de cet evenement.',
      );
    }

    const removedUser = await this.prisma.user.findUnique({
      where: {
        id: collaboratorUserId,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    await this.prisma.eventCollaborator.deleteMany({
      where: {
        eventId,
        userId: collaboratorUserId,
      },
    });

    await this.recordEventRevision(
      this.prisma,
      eventId,
      userId,
      'COLLABORATOR_REMOVE',
    );

    await this.createOrganizerNotification({
      organizerId: event.organizerId,
      actorUserId: userId,
      type: 'ORGANIZER_COLLABORATOR_UPDATED',
      title: 'Collaborateur retire',
      message: `${removedUser?.displayName || removedUser?.username || collaboratorUserId} a ete retire de cet evenement.`,
      severity: 'IMPORTANT',
      targetPath: `/organizer/event-team?id=${eventId}`,
      metadata: {
        eventId,
        collaboratorUserId,
        action: 'COLLABORATOR_REMOVE',
      },
    });

    return this.listCollaborators(eventId, userId, role);
  }

  async listEventRevisions(eventId: string, userId: string, role: string) {
    const normalizedRole = role.toUpperCase();
    const { event, collaboratorPermission } =
      await this.getEventAuthorizationContext(eventId, userId);

    const canReadRevisions =
      (normalizedRole === 'ORGANIZER' && event.organizerId === userId) ||
      (normalizedRole === 'PLACE_OWNER' && event.Place?.ownerId === userId) ||
      Boolean(collaboratorPermission);

    if (!canReadRevisions) {
      throw new ForbiddenException(
        'Vous ne pouvez pas consulter l historique de cet evenement.',
      );
    }

    const revisions = await this.prisma.eventRevision.findMany({
      where: {
        eventId,
      },
      include: {
        Actor: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return revisions.map((revision) => ({
      id: revision.id,
      action: revision.action,
      createdAt: revision.createdAt,
      actor: revision.Actor,
      snapshot: revision.snapshot,
    }));
  }

  private parseTagIdsPayload(raw?: string) {
    if (!raw) {
      return [] as number[];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Format tagIds invalide.');
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException('tagIds doit etre une liste.');
    }

    const normalized = parsed.map((item) => Number(item));
    if (normalized.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new BadRequestException('Chaque tag doit avoir un id entier positif.');
    }

    return Array.from(new Set(normalized));
  }

  private normalizePromotionPayload(payload: {
    promoCode?: string;
    promoType?: 'PERCENT' | 'FIXED';
    promoValue?: number;
    promoMaxRedemptions?: number;
    promoEndsAt?: string;
  }) {
    const code = (payload.promoCode || '').trim().toUpperCase();

    if (!code) {
      return null;
    }

    if (code.length < 3 || code.length > 32) {
      throw new BadRequestException(
        'Le code promo doit contenir entre 3 et 32 caracteres.',
      );
    }

    const promoType = payload.promoType || 'PERCENT';
    const promoValue = Number(payload.promoValue || 0);

    if (!Number.isFinite(promoValue) || promoValue <= 0) {
      throw new BadRequestException('La valeur du promo code est invalide.');
    }

    if (promoType === 'PERCENT' && promoValue > 100) {
      throw new BadRequestException(
        'Le pourcentage du promo code doit etre inferieur ou egal a 100.',
      );
    }

    const promoMaxRedemptions =
      payload.promoMaxRedemptions !== undefined
        ? Number(payload.promoMaxRedemptions)
        : null;

    if (
      promoMaxRedemptions !== null &&
      (!Number.isInteger(promoMaxRedemptions) || promoMaxRedemptions < 1)
    ) {
      throw new BadRequestException('Le quota du promo code est invalide.');
    }

    const promoEndsAt = payload.promoEndsAt ? new Date(payload.promoEndsAt) : null;
    if (promoEndsAt && Number.isNaN(promoEndsAt.getTime())) {
      throw new BadRequestException('La date de fin du promo code est invalide.');
    }

    return {
      code,
      discountType: promoType,
      discountValue: promoValue,
      maxRedemptions: promoMaxRedemptions,
      endDate: promoEndsAt,
    };
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
    const tagIds = this.parseTagIdsPayload(createEventDto.tagIds);
    const checkInOpensAtOffsetMin =
      createEventDto.checkInOpensAtOffsetMin ?? -60;
    const checkInClosesAtOffsetMin =
      createEventDto.checkInClosesAtOffsetMin ?? 180;
    const maxTicketsPerUser = createEventDto.maxTicketsPerUser ?? 1;
    const promotion = this.normalizePromotionPayload(createEventDto);

    if (checkInClosesAtOffsetMin <= checkInOpensAtOffsetMin) {
      throw new BadRequestException(
        'La fenetre check-in est invalide: la fermeture doit etre apres l ouverture.',
      );
    }

    const fallbackEntryFee = Number(createEventDto.entryFee || 0);
    const minTicketPrice =
      ticketTypes.length > 0
        ? Math.min(...ticketTypes.map((ticketType) => ticketType.price))
        : fallbackEntryFee;

    if (tagIds.length > 0) {
      const existingTags = await this.prisma.tag.count({
        where: {
          id: {
            in: tagIds,
          },
          OR: [
            {
              status: 'APPROVED',
            },
            {
              submittedByUserId: userId,
            },
          ],
        },
      });

      if (existingTags !== tagIds.length) {
        throw new BadRequestException('Un ou plusieurs tags sont invalides.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          title: createEventDto.title,
          description: createEventDto.description,
          cancellationPolicy: createEventDto.cancellationPolicy,
          refundPolicy: createEventDto.refundPolicy,
          startTime: new Date(createEventDto.startTime),
          endTime: createEventDto.endTime
            ? new Date(createEventDto.endTime)
            : null,
          checkInOpensAtOffsetMin,
          checkInClosesAtOffsetMin,
          maxTicketsPerUser,
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
          ...(tagIds.length > 0
            ? {
                EventTag: {
                  create: tagIds.map((tagId) => ({
                    tagId,
                  })),
                },
              }
            : {}),
          ...(promotion
            ? {
                Promotion: {
                  create: [promotion],
                },
              }
            : {}),
        },
      });

      await this.recordEventRevision(tx, created.id, userId, 'CREATE');

      return created;
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

  async remove(eventId: string, userId: string, role: string) {
    const normalizedRole = role.toUpperCase();
    const { event } = await this.getEventAuthorizationContext(eventId, userId);

    const canDeleteAsOrganizer =
      normalizedRole === 'ORGANIZER' && event.organizerId === userId;
    const canDeleteAsPlaceOwner =
      normalizedRole === 'PLACE_OWNER' && event.Place?.ownerId === userId;

    if (!canDeleteAsOrganizer && !canDeleteAsPlaceOwner) {
      throw new ForbiddenException(
        'Vous ne pouvez pas supprimer cet evenement.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const bookingsCount = await tx.booking.count({
        where: {
          eventId,
        },
      });

      if (bookingsCount > 0) {
        throw new BadRequestException(
          'Impossible de supprimer un evenement ayant deja des reservations.',
        );
      }

      await tx.eventTag.deleteMany({
        where: {
          eventId,
        },
      });

      await tx.promotion.deleteMany({
        where: {
          eventId,
        },
      });

      await tx.ticketType.deleteMany({
        where: {
          eventId,
        },
      });

      await tx.event.delete({
        where: {
          id: eventId,
        },
      });
    });

    return {
      success: true,
      id: eventId,
    };
  }

  async getOrganizerAnalytics(
    userId: string,
    role: string,
  ): Promise<OrganizerAnalyticsOverview> {
    const normalizedRole = role.toUpperCase();
    const now = Date.now();
    const confirmedStatuses = ['CONFIRMED', 'PAID', 'USED', 'CHECKED_IN'];
    const scannedStatuses = ['USED', 'CHECKED_IN'];

    const events = await this.prisma.event.findMany({
      where:
        normalizedRole === 'PLACE_OWNER'
          ? {
              OR: [
                { organizerId: userId },
                {
                  Place: {
                    ownerId: userId,
                  },
                },
              ],
            }
          : {
              organizerId: userId,
            },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        entryFee: true,
        Booking: {
          select: {
            id: true,
            status: true,
            userId: true,
            ticketTypeId: true,
          },
        },
        TicketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        Promotion: {
          select: {
            redeemedCount: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    const ticketPriceById = new Map<string, number>();
    const ticketMetaById = new Map<string, { name: string; eventId: string; eventTitle: string }>();
    const salesByTicketMap = new Map<
      string,
      {
        ticketTypeId: string;
        name: string;
        eventId: string;
        eventTitle: string;
        unitsSold: number;
        revenue: number;
      }
    >();
    const salesByPeriodMap = new Map<
      string,
      { period: string; eventsCount: number; bookingsConfirmed: number; revenue: number }
    >();
    const attendees = new Set<string>();

    let upcomingEvents = 0;
    let liveEvents = 0;
    let pastEvents = 0;
    let totalBookings = 0;
    let confirmedBookings = 0;
    let pendingBookings = 0;
    let cancelledBookings = 0;
    let scannedBookings = 0;
    let grossRevenue = 0;
    let promoRedemptions = 0;

    const topEvents = events.map((event) => {
      const eventStartTs = new Date(event.startTime).getTime();
      const eventEndTs = event.endTime ? new Date(event.endTime).getTime() : Number.NaN;

      if (Number.isFinite(eventStartTs) && eventStartTs > now) {
        upcomingEvents += 1;
      } else if (Number.isFinite(eventEndTs) && eventEndTs < now) {
        pastEvents += 1;
      } else {
        liveEvents += 1;
      }

      for (const ticket of event.TicketType) {
        const normalizedPrice = Number(ticket.price || 0);
        ticketPriceById.set(ticket.id, Number.isFinite(normalizedPrice) ? normalizedPrice : 0);
        ticketMetaById.set(ticket.id, {
          name: ticket.name,
          eventId: event.id,
          eventTitle: event.title,
        });
      }

      const period = event.startTime.toISOString().slice(0, 7);
      if (!salesByPeriodMap.has(period)) {
        salesByPeriodMap.set(period, {
          period,
          eventsCount: 0,
          bookingsConfirmed: 0,
          revenue: 0,
        });
      }
      salesByPeriodMap.get(period)!.eventsCount += 1;

      let eventBookingsTotal = 0;
      let eventBookingsConfirmed = 0;
      let eventBookingsPending = 0;
      let eventScannedCount = 0;
      let eventRevenue = 0;

      for (const booking of event.Booking) {
        const status = (booking.status || 'PENDING').toUpperCase();
        const isConfirmed = confirmedStatuses.includes(status);
        const isScanned = scannedStatuses.includes(status);

        totalBookings += 1;
        eventBookingsTotal += 1;

        if (status === 'PENDING') {
          pendingBookings += 1;
          eventBookingsPending += 1;
        }

        if (status === 'CANCELLED') {
          cancelledBookings += 1;
        }

        if (isConfirmed) {
          confirmedBookings += 1;
          eventBookingsConfirmed += 1;
          attendees.add(booking.userId);

          const ticketRevenue = booking.ticketTypeId
            ? ticketPriceById.get(booking.ticketTypeId) ?? Number(event.entryFee || 0)
            : Number(event.entryFee || 0);
          const normalizedRevenue = Number.isFinite(ticketRevenue) ? ticketRevenue : 0;

          grossRevenue += normalizedRevenue;
          eventRevenue += normalizedRevenue;

          const periodEntry = salesByPeriodMap.get(period);
          if (periodEntry) {
            periodEntry.bookingsConfirmed += 1;
            periodEntry.revenue += normalizedRevenue;
          }

          if (booking.ticketTypeId) {
            const ticketMeta = ticketMetaById.get(booking.ticketTypeId);
            if (ticketMeta) {
              const existingTicketSales = salesByTicketMap.get(booking.ticketTypeId) || {
                ticketTypeId: booking.ticketTypeId,
                name: ticketMeta.name,
                eventId: ticketMeta.eventId,
                eventTitle: ticketMeta.eventTitle,
                unitsSold: 0,
                revenue: 0,
              };

              existingTicketSales.unitsSold += 1;
              existingTicketSales.revenue += normalizedRevenue;
              salesByTicketMap.set(booking.ticketTypeId, existingTicketSales);
            }
          }
        }

        if (isScanned) {
          scannedBookings += 1;
          eventScannedCount += 1;
        }
      }

      const eventPromoRedemptions = event.Promotion.reduce((acc, promotion) => {
        return acc + Number(promotion.redeemedCount || 0);
      }, 0);

      promoRedemptions += eventPromoRedemptions;

      return {
        eventId: event.id,
        title: event.title,
        startTime: event.startTime,
        bookingsTotal: eventBookingsTotal,
        bookingsConfirmed: eventBookingsConfirmed,
        bookingsPending: eventBookingsPending,
        scannedCount: eventScannedCount,
        grossRevenue: Number(eventRevenue.toFixed(2)),
        promoRedemptions: eventPromoRedemptions,
      };
    });

    const checkInRate =
      confirmedBookings > 0
        ? Number(((scannedBookings / confirmedBookings) * 100).toFixed(1))
        : 0;

    return {
      summary: {
        totalEvents: events.length,
        upcomingEvents,
        liveEvents,
        pastEvents,
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        scannedBookings,
        checkInRate,
        uniqueAttendees: attendees.size,
        promoRedemptions,
        grossRevenue: Number(grossRevenue.toFixed(2)),
      },
      topEvents: topEvents
        .slice()
        .sort((a, b) => b.bookingsTotal - a.bookingsTotal)
        .slice(0, 5),
      salesByTicket: Array.from(salesByTicketMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8)
        .map((item) => ({
          ...item,
          revenue: Number(item.revenue.toFixed(2)),
        })),
      salesByPeriod: Array.from(salesByPeriodMap.values())
        .sort((a, b) => b.period.localeCompare(a.period))
        .slice(0, 6)
        .map((item) => ({
          ...item,
          revenue: Number(item.revenue.toFixed(2)),
        })),
    };
  }

  async update(
    eventId: string,
    userId: string,
    role: string,
    payload: UpdateEventDto,
    files: {
      cover?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    } = {},
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizerId: true,
        placeId: true,
        startTime: true,
        endTime: true,
        checkInOpensAtOffsetMin: true,
        checkInClosesAtOffsetMin: true,
        maxTicketsPerUser: true,
        Promotion: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            maxRedemptions: true,
            endDate: true,
          },
          orderBy: {
            id: 'desc',
          },
          take: 1,
        },
        coverUrl: true,
        images: true,
        Place: {
          select: {
            ownerId: true,
          },
        },
        EventCollaborator: {
          where: {
            userId,
          },
          select: {
            permission: true,
          },
          take: 1,
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
    const canEditAsCollaborator =
      event.EventCollaborator[0]?.permission?.toUpperCase() === 'EDIT';

    if (!canEditAsOrganizer && !canEditAsPlaceOwner && !canEditAsCollaborator) {
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

    const nextCheckInOpensAtOffsetMin =
      payload.checkInOpensAtOffsetMin ?? event.checkInOpensAtOffsetMin ?? -60;
    const nextCheckInClosesAtOffsetMin =
      payload.checkInClosesAtOffsetMin ?? event.checkInClosesAtOffsetMin ?? 180;

    if (nextCheckInClosesAtOffsetMin <= nextCheckInOpensAtOffsetMin) {
      throw new BadRequestException(
        'La fenetre check-in est invalide: la fermeture doit etre apres l ouverture.',
      );
    }

    const ticketTypes = this.parseTicketTypesPayload(payload.ticketTypes);
    const shouldUpdatePromotion =
      payload.promoCode !== undefined ||
      payload.promoType !== undefined ||
      payload.promoValue !== undefined ||
      payload.promoMaxRedemptions !== undefined ||
      payload.promoEndsAt !== undefined;
    const nextPromotion = shouldUpdatePromotion
      ? this.normalizePromotionPayload({
          promoCode:
            payload.promoCode !== undefined
              ? payload.promoCode
              : event.Promotion[0]?.code || '',
          promoType:
            payload.promoType !== undefined
              ? payload.promoType
              : ((event.Promotion[0]?.discountType as 'PERCENT' | 'FIXED' | undefined) ||
                undefined),
          promoValue:
            payload.promoValue !== undefined
              ? payload.promoValue
              : Number(event.Promotion[0]?.discountValue || 0),
          promoMaxRedemptions:
            payload.promoMaxRedemptions !== undefined
              ? payload.promoMaxRedemptions
              : event.Promotion[0]?.maxRedemptions || undefined,
          promoEndsAt:
            payload.promoEndsAt !== undefined
              ? payload.promoEndsAt
              : event.Promotion[0]?.endDate?.toISOString(),
        })
      : null;
    const coverFile = files?.cover?.[0] ?? null;
    const uploadedCoverUrl = coverFile
      ? await this.storageService.uploadFile('events', coverFile)
      : null;
    const uploadedGalleryUrls =
      files?.gallery && files.gallery.length > 0
        ? await this.storageService.uploadFiles('events', files.gallery)
        : [];

    let existingImages: string[] | null = null;
    if (payload.existingImages !== undefined) {
      try {
        const parsed = JSON.parse(payload.existingImages);
        if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
          throw new Error('invalid');
        }
        existingImages = parsed;
      } catch {
        throw new BadRequestException('existingImages invalide.');
      }
    }

    let nextCoverUrl: string | null | undefined;
    if (uploadedCoverUrl) {
      nextCoverUrl = uploadedCoverUrl;
    } else if (payload.existingCoverUrl !== undefined) {
      nextCoverUrl = payload.existingCoverUrl || null;
    }

    let nextImages: string[] | undefined;
    if (existingImages !== null || uploadedGalleryUrls.length > 0) {
      const baseImages = existingImages !== null ? existingImages : event.images;
      nextImages = [...baseImages, ...uploadedGalleryUrls];
    }

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

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id: eventId },
        data: {
          ...(payload.title !== undefined ? { title: payload.title } : {}),
          ...(payload.description !== undefined
            ? { description: payload.description }
            : {}),
          ...(payload.cancellationPolicy !== undefined
            ? { cancellationPolicy: payload.cancellationPolicy }
            : {}),
          ...(payload.refundPolicy !== undefined
            ? { refundPolicy: payload.refundPolicy }
            : {}),
          ...(payload.startTime !== undefined
            ? { startTime: new Date(payload.startTime) }
            : {}),
          ...(payload.endTime !== undefined
            ? { endTime: new Date(payload.endTime) }
            : {}),
          ...(payload.checkInOpensAtOffsetMin !== undefined
            ? { checkInOpensAtOffsetMin: payload.checkInOpensAtOffsetMin }
            : {}),
          ...(payload.checkInClosesAtOffsetMin !== undefined
            ? { checkInClosesAtOffsetMin: payload.checkInClosesAtOffsetMin }
            : {}),
          ...(payload.maxTicketsPerUser !== undefined
            ? { maxTicketsPerUser: payload.maxTicketsPerUser }
            : {}),
          ...(payload.entryFee !== undefined ? { entryFee: payload.entryFee } : {}),
          ...(payload.placeId !== undefined ? { placeId: payload.placeId } : {}),
          ...(nextCoverUrl !== undefined ? { coverUrl: nextCoverUrl } : {}),
          ...(nextImages !== undefined ? { images: nextImages } : {}),
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
          ...(shouldUpdatePromotion
            ? {
                Promotion: nextPromotion
                  ? {
                      deleteMany: {},
                      create: [nextPromotion],
                    }
                  : {
                      deleteMany: {},
                    },
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

      await this.recordEventRevision(tx, eventId, userId, 'UPDATE');

      return updated;
    });

    await this.createOrganizerNotification({
      organizerId: event.organizerId,
      actorUserId: userId,
      type: 'ORGANIZER_EVENT_UPDATED',
      title: 'Evenement mis a jour',
      message: `${updated.title} a ete modifie.`,
      severity: 'IMPORTANT',
      targetPath: `/event/${eventId}`,
      metadata: {
        eventId,
        eventTitle: updated.title,
      },
    });

    return updated;
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
        organizerId: true,
        title: true,
        startTime: true,
        endTime: true,
        maxTicketsPerUser: true,
        entryFee: true,
        Promotion: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            maxRedemptions: true,
            redeemedCount: true,
            endDate: true,
          },
          orderBy: {
            id: 'desc',
          },
        },
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

    const requestedPromoCode = (payload.promoCode || '').trim().toUpperCase();
    const selectedPromotion = requestedPromoCode
      ? event.Promotion.find(
          (promotion) =>
            (promotion.code || '').toUpperCase() === requestedPromoCode,
        )
      : null;

    if (requestedPromoCode && !selectedPromotion) {
      throw new BadRequestException('Code promo invalide pour cet evenement.');
    }

    if (
      selectedPromotion?.endDate &&
      new Date(selectedPromotion.endDate).getTime() < Date.now()
    ) {
      throw new BadRequestException('Ce code promo a expire.');
    }

    if (
      selectedPromotion?.maxRedemptions &&
      Number(selectedPromotion.redeemedCount || 0) >= selectedPromotion.maxRedemptions
    ) {
      throw new BadRequestException('Ce code promo a atteint son quota.');
    }

    const maxTicketsPerUser = Math.max(1, Number(event.maxTicketsPerUser || 1));

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

    const activeBookingsCount = await this.prisma.booking.count({
      where: {
        userId,
        eventId,
        NOT: {
          status: 'CANCELLED',
        },
      },
    });

    if (activeBookingsCount >= maxTicketsPerUser) {
      if (maxTicketsPerUser === 1 && existing) {
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

      throw new BadRequestException(
        `Limite atteinte: maximum ${maxTicketsPerUser} billet(s) par utilisateur pour cet evenement.`,
      );
    }

    if (existing && maxTicketsPerUser === 1) {
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
    const basePrice = ticketPrice > 0 ? ticketPrice : !selectedTicketType && hasEntryFee ? Number(event.entryFee || 0) : 0;
    let discountAmount = 0;

    if (selectedPromotion) {
      const promoValue = Number(selectedPromotion.discountValue || 0);
      const promoType = (selectedPromotion.discountType || 'PERCENT').toUpperCase();
      discountAmount =
        promoType === 'FIXED'
          ? promoValue
          : (basePrice * promoValue) / 100;

      discountAmount = Math.max(0, Math.min(discountAmount, basePrice));
    }

    const finalPrice = Math.max(basePrice - discountAmount, 0);
    const paymentRequired = finalPrice > 0;
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

      if (selectedPromotion) {
        const promoUpdate = await tx.promotion.updateMany({
          where: {
            id: selectedPromotion.id,
            ...(selectedPromotion.maxRedemptions
              ? {
                  redeemedCount: {
                    lt: selectedPromotion.maxRedemptions,
                  },
                }
              : {}),
            ...(selectedPromotion.endDate
              ? {
                  endDate: {
                    gte: new Date(),
                  },
                }
              : {}),
          },
          data: {
            redeemedCount: {
              increment: 1,
            },
          },
        });

        if (promoUpdate.count === 0) {
          throw new BadRequestException(
            'Ce code promo est expire ou n est plus disponible.',
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

    await this.createOrganizerNotification({
      organizerId: event.organizerId,
      actorUserId: userId,
      type: 'ORGANIZER_BOOKING_CREATED',
      title: 'Nouvelle reservation',
      message: `Nouvelle reservation sur ${event.title}.`,
      severity: 'IMPORTANT',
      targetPath: `/event/${eventId}`,
      metadata: {
        eventId,
        eventTitle: event.title,
      },
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
        EventCollaborator: {
          where: {
            userId,
          },
          select: {
            permission: true,
          },
          take: 1,
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }

    const normalizedRole = role.toUpperCase();
    const canReadScans =
      (normalizedRole === 'ORGANIZER' && event.organizerId === userId) ||
      (normalizedRole === 'PLACE_OWNER' && event.Place?.ownerId === userId) ||
      ['SCAN', 'EDIT'].includes(
        event.EventCollaborator[0]?.permission?.toUpperCase() || '',
      );

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
        Promotion: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            maxRedemptions: true,
            redeemedCount: true,
            endDate: true,
          },
          orderBy: {
            id: 'desc',
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
