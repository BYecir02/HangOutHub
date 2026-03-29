import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { hasPlaceTeamRoleAtLeast } from '../permissions/place-team-permissions';
import { PrismaService } from '../prisma/prisma.service';

const ORGANIZER_NOTIFICATION_TYPES = [
  'ORGANIZER_BOOKING_CREATED',
  'ORGANIZER_EVENT_UPDATED',
  'ORGANIZER_COLLABORATOR_UPDATED',
  'ORGANIZER_EVENT_REMINDER',
  'ORGANIZER_SYSTEM',
];

export interface OrganizerNotificationItem {
  id: string;
  type: string;
  title: string | null;
  message: string | null;
  severity: string;
  targetPath: string | null;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
  actor: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
}

export interface OrganizerActivityPage {
  items: OrganizerNotificationItem[];
  nextCursor: string | null;
}

export interface OrganizerReminderSweepResult {
  eventsChecked: number;
  notificationsCreated: number;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private remindersInterval: ReturnType<typeof setInterval> | null = null;
  private readonly remindersSweepWindowMs = 15 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async hasOrganizerOrTeamAccess(userId: string, role: string) {
    const normalizedRole = role.toUpperCase();
    if (
      normalizedRole === 'ADMIN' ||
      normalizedRole === 'ORGANIZER' ||
      normalizedRole === 'PLACE_OWNER'
    ) {
      return true;
    }

    const membershipRows = await this.prisma.$queryRaw<
      Array<{ role: string | null }>
    >`
      SELECT "role"
      FROM "PlaceTeamMember"
      WHERE "userId" = ${userId}::uuid
    `;

    return membershipRows.some((membership) =>
      hasPlaceTeamRoleAtLeast(membership.role, 'STAFF'),
    );
  }

  private normalizeReminderOffsets(
    offsets: number[] | null | undefined,
  ): number[] {
    if (!Array.isArray(offsets)) {
      return [];
    }

    return Array.from(
      new Set(
        offsets
          .filter((offset) => Number.isInteger(offset))
          .map((offset) => Number(offset))
          .filter((offset) => offset >= 15 && offset <= 10080),
      ),
    )
      .sort((a, b) => b - a)
      .slice(0, 3);
  }

  private resolveReminderOffsets(
    settings?: {
      organizerReminderMode?: string | null;
      organizerReminderOffsetsMin?: number[] | null;
      organizerNotifyReminderD1?: boolean | null;
      organizerNotifyReminderH3?: boolean | null;
      organizerNotifyReminderH1?: boolean | null;
    } | null,
  ): number[] {
    const customOffsets =
      settings?.organizerReminderMode === 'custom'
        ? this.normalizeReminderOffsets(settings.organizerReminderOffsetsMin)
        : [];

    if (customOffsets.length > 0) {
      return customOffsets;
    }

    const legacyOffsets: number[] = [];

    if (settings?.organizerNotifyReminderD1 !== false) {
      legacyOffsets.push(1440);
    }
    if (settings?.organizerNotifyReminderH3 !== false) {
      legacyOffsets.push(180);
    }
    if (settings?.organizerNotifyReminderH1 !== false) {
      legacyOffsets.push(60);
    }

    return this.normalizeReminderOffsets(legacyOffsets);
  }

  onModuleInit() {
    this.remindersInterval = setInterval(
      () => {
        void this.emitUpcomingEventReminders();
      },
      15 * 60 * 1000,
    );

    // Premier passage au boot pour limiter le délai de prise en compte.
    void this.emitUpcomingEventReminders();
  }

  onModuleDestroy() {
    if (this.remindersInterval) {
      clearInterval(this.remindersInterval);
      this.remindersInterval = null;
    }
  }

  private mapOrganizerNotification(item: {
    id: string;
    type: string;
    title: string | null;
    message: string | null;
    severity: string | null;
    targetPath: string | null;
    payload: unknown;
    isRead: boolean | null;
    createdAt: Date | null;
    User_Notification_actorIdToUser: {
      id: string;
      username: string;
      displayName: string | null;
    } | null;
  }): OrganizerNotificationItem {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      severity: item.severity || 'INFO',
      targetPath: item.targetPath,
      payload:
        item.payload &&
        typeof item.payload === 'object' &&
        !Array.isArray(item.payload)
          ? (item.payload as Record<string, unknown>)
          : null,
      isRead: Boolean(item.isRead),
      createdAt: item.createdAt || new Date(),
      actor: item.User_Notification_actorIdToUser
        ? {
            id: item.User_Notification_actorIdToUser.id,
            username: item.User_Notification_actorIdToUser.username,
            displayName: item.User_Notification_actorIdToUser.displayName,
          }
        : null,
    };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async getOrganizerUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        type: {
          in: ORGANIZER_NOTIFICATION_TYPES,
        },
      },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  async markOrganizerAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        type: {
          in: ORGANIZER_NOTIFICATION_TYPES,
        },
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  async getOrganizerActivity(
    userId: string,
    options?: {
      limit?: number;
      cursor?: string;
      unreadOnly?: boolean;
      urgentOnly?: boolean;
    },
  ): Promise<OrganizerActivityPage> {
    const requestedLimit = Number(options?.limit || 20);
    const limit = Math.max(1, Math.min(requestedLimit, 50));

    const whereClause = {
      userId,
      type: {
        in: ORGANIZER_NOTIFICATION_TYPES,
      },
      ...(options?.unreadOnly ? { isRead: false } : {}),
      ...(options?.urgentOnly ? { severity: 'URGENT' } : {}),
    };

    const items = await this.prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      ...(options?.cursor
        ? {
            cursor: {
              id: options.cursor,
            },
            skip: 1,
          }
        : {}),
      take: limit + 1,
      include: {
        User_Notification_actorIdToUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    const hasMore = items.length > limit;
    const slice = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? slice[slice.length - 1].id : null;

    return {
      items: slice.map((item) => this.mapOrganizerNotification(item)),
      nextCursor,
    };
  }

  async markOrganizerOneRead(userId: string, notificationId: string) {
    const updated = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        type: {
          in: ORGANIZER_NOTIFICATION_TYPES,
        },
      },
      data: {
        isRead: true,
      },
    });

    return {
      success: true,
      updated: updated.count,
    };
  }

  async markOrganizerBatchRead(userId: string, notificationIds: string[]) {
    const normalizedIds = Array.from(
      new Set(
        (notificationIds || []).filter(
          (notificationId) =>
            typeof notificationId === 'string' && notificationId.length > 0,
        ),
      ),
    ).slice(0, 100);

    if (normalizedIds.length === 0) {
      return {
        success: true,
        updated: 0,
      };
    }

    const updated = await this.prisma.notification.updateMany({
      where: {
        id: {
          in: normalizedIds,
        },
        userId,
        type: {
          in: ORGANIZER_NOTIFICATION_TYPES,
        },
      },
      data: {
        isRead: true,
      },
    });

    return {
      success: true,
      updated: updated.count,
    };
  }

  async emitUpcomingEventReminders(): Promise<OrganizerReminderSweepResult> {
    const now = new Date();
    const maxReminderHorizonMs = 7 * 24 * 60 * 60 * 1000;
    const horizon = new Date(now.getTime() + maxReminderHorizonMs);
    let notificationsCreated = 0;

    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        startTime: {
          gte: now,
          lte: horizon,
        },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        organizerId: true,
        User: {
          select: {
            UserSettings: {
              select: {
                organizerNotifyReminderD1: true,
                organizerNotifyReminderH3: true,
                organizerNotifyReminderH1: true,
                organizerReminderMode: true,
                organizerReminderOffsetsMin: true,
                organizerNotificationPriorityMin: true,
              },
            },
          },
        },
      },
    });

    for (const event of upcomingEvents) {
      const deltaMs = event.startTime.getTime() - now.getTime();
      const settings = event.User?.UserSettings;
      const reminderOffsetsMin = this.resolveReminderOffsets(settings);

      for (const reminderOffsetMin of reminderOffsetsMin) {
        const reminderOffsetMs = reminderOffsetMin * 60 * 1000;
        const minWindowMs = Math.max(
          0,
          reminderOffsetMs - this.remindersSweepWindowMs,
        );
        const maxWindowMs = reminderOffsetMs;
        const reminderSeverity =
          reminderOffsetMin <= 90
            ? ('URGENT' as const)
            : ('IMPORTANT' as const);
        const reminderLabel =
          reminderOffsetMin >= 60
            ? `dans ${Math.floor(reminderOffsetMin / 60)}h`
            : `dans ${reminderOffsetMin}min`;

        const minPriority =
          settings?.organizerNotificationPriorityMin === 'URGENT'
            ? 'URGENT'
            : 'IMPORTANT';
        const severityRank: Record<'IMPORTANT' | 'URGENT', number> = {
          IMPORTANT: 1,
          URGENT: 2,
        };

        if (severityRank[reminderSeverity] < severityRank[minPriority]) {
          continue;
        }

        if (deltaMs < minWindowMs || deltaMs > maxWindowMs) {
          continue;
        }

        const title = `Rappel evenement M-${reminderOffsetMin}`;
        const message = `${event.title} commence ${reminderLabel}.`;
        const targetPath = `/event/${event.id}`;

        const existing = await this.prisma.notification.findFirst({
          where: {
            userId: event.organizerId,
            type: 'ORGANIZER_EVENT_REMINDER',
            title,
            targetPath,
          },
          select: {
            id: true,
          },
        });

        if (existing) {
          continue;
        }

        await this.prisma.notification.create({
          data: {
            userId: event.organizerId,
            type: 'ORGANIZER_EVENT_REMINDER',
            title,
            message,
            severity: reminderSeverity,
            targetPath,
            payload: {
              eventId: event.id,
              eventTitle: event.title,
              reminderOffsetMin,
            },
            isRead: false,
          },
        });

        notificationsCreated += 1;
      }
    }

    if (upcomingEvents.length > 0 || notificationsCreated > 0) {
      this.logger.debug(
        `Reminder sweep execute: ${upcomingEvents.length} evenement(s) verifies, ${notificationsCreated} notification(s) creee(s).`,
      );
    }

    return {
      eventsChecked: upcomingEvents.length,
      notificationsCreated,
    };
  }

  async getActivity(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { notificationSavedPlacesActivity: true },
    });

    if (settings?.notificationSavedPlacesActivity === false) {
      return [];
    }

    const savedPlaces = await this.prisma.savedPlace.findMany({
      where: { userId },
      select: { placeId: true },
    });

    if (savedPlaces.length === 0) {
      return [];
    }

    const savedPlaceIds = savedPlaces.map((place) => place.placeId);

    const events = await this.prisma.event.findMany({
      where: {
        placeId: { in: savedPlaceIds },
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: 'asc' },
      take: 12,
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            City: { select: { id: true, name: true } },
          },
        },
      },
    });

    return events.map((event) => ({
      id: `event-${event.id}`,
      type: 'EVENT_SAVED_PLACE',
      title: event.title,
      date: event.startTime,
      place: event.Place
        ? {
            id: event.Place.id,
            name: event.Place.name,
            city: event.Place.City?.name || null,
          }
        : null,
      eventId: event.id,
    }));
  }
}
