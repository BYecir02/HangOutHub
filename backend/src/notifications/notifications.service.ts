import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

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

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.remindersInterval = setInterval(() => {
      void this.emitUpcomingEventReminders();
    }, 15 * 60 * 1000);

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
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    let notificationsCreated = 0;

    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        startTime: {
          gte: now,
          lte: in24h,
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
                organizerNotificationPriorityMin: true,
              },
            },
          },
        },
      },
    });

    const reminders = [
      {
        key: 'D-1',
        label: 'dans 24h',
        minMs: 23 * 60 * 60 * 1000,
        maxMs: 24 * 60 * 60 * 1000,
        severity: 'IMPORTANT' as const,
      },
      {
        key: 'H-3',
        label: 'dans 3h',
        minMs: 2 * 60 * 60 * 1000 + 45 * 60 * 1000,
        maxMs: 3 * 60 * 60 * 1000,
        severity: 'IMPORTANT' as const,
      },
      {
        key: 'H-1',
        label: 'dans 1h',
        minMs: 45 * 60 * 1000,
        maxMs: 60 * 60 * 1000,
        severity: 'URGENT' as const,
      },
    ];

    for (const event of upcomingEvents) {
      const deltaMs = event.startTime.getTime() - now.getTime();

      for (const reminder of reminders) {
        const settings = event.User?.UserSettings;
        if (reminder.key === 'D-1' && settings?.organizerNotifyReminderD1 === false) {
          continue;
        }
        if (reminder.key === 'H-3' && settings?.organizerNotifyReminderH3 === false) {
          continue;
        }
        if (reminder.key === 'H-1' && settings?.organizerNotifyReminderH1 === false) {
          continue;
        }

        const minPriority =
          settings?.organizerNotificationPriorityMin === 'URGENT'
            ? 'URGENT'
            : 'IMPORTANT';
        const severityRank: Record<'IMPORTANT' | 'URGENT', number> = {
          IMPORTANT: 1,
          URGENT: 2,
        };

        if (severityRank[reminder.severity] < severityRank[minPriority]) {
          continue;
        }

        if (deltaMs < reminder.minMs || deltaMs > reminder.maxMs) {
          continue;
        }

        const title = `Rappel evenement ${reminder.key}`;
        const message = `${event.title} commence ${reminder.label}.`;
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
            severity: reminder.severity,
            targetPath,
            payload: {
              eventId: event.id,
              eventTitle: event.title,
              reminderKey: reminder.key,
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
