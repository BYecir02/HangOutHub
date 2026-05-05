import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const ACTIVITY_WINDOW_DAYS = 14;
const MAX_ACTIVITY_ITEMS = 20;

export interface FriendAttendee {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface FriendActivityItem {
  id: string;
  actionType: 'outing_created' | 'place_saved' | 'event_saved';
  actors: FriendAttendee[];
  entity: {
    id: string;
    type: 'event' | 'place';
    title: string;
    imageUrl: string | null;
    scheduledAt: string | null;
  };
  createdAt: string;
}

export interface MapFriendsActivityItem {
  entityId: string;
  entityType: 'event' | 'place';
  friendsCount: number;
}

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  private async getFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    });
    return friendships.map((f) =>
      f.requesterId === userId ? f.receiverId : f.requesterId,
    );
  }

  async getActivity(userId: string): Promise<{ items: FriendActivityItem[] }> {
    const friendIds = await this.getFriendIds(userId);
    if (friendIds.length === 0) return { items: [] };

    const since = new Date(
      Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const [outings, savedPlaces, bookings] = await Promise.all([
      this.prisma.outing.findMany({
        where: {
          creatorId: { in: friendIds },
          status: { not: 'CANCELLED' },
          scheduledDate: { gte: since },
        },
        select: {
          id: true,
          title: true,
          scheduledDate: true,
          placeId: true,
          Place: { select: { id: true, name: true, coverUrl: true } },
          User: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        take: MAX_ACTIVITY_ITEMS,
      }),

      this.prisma.savedPlace.findMany({
        where: {
          userId: { in: friendIds },
          savedAt: { gte: since },
        },
        select: {
          savedAt: true,
          Place: { select: { id: true, name: true, coverUrl: true } },
          User: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { savedAt: 'desc' },
        take: MAX_ACTIVITY_ITEMS,
      }),

      this.prisma.booking.findMany({
        where: {
          userId: { in: friendIds },
          status: { not: 'CANCELLED' },
          clientRequestId: { not: 'QUICK_ATTEND' },
          Event: { startTime: { gte: since } },
        },
        select: {
          userId: true,
          Event: {
            select: {
              id: true,
              title: true,
              startTime: true,
              coverUrl: true,
            },
          },
          User: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { Event: { startTime: 'desc' } },
        take: MAX_ACTIVITY_ITEMS,
      }),
    ]);

    // Group place saves by placeId
    const placeMap = new Map<
      string,
      {
        actors: FriendAttendee[];
        place: { id: string; name: string; coverUrl: string | null };
        savedAt: Date;
      }
    >();
    for (const sp of savedPlaces) {
      if (!sp.Place) continue;
      const key = sp.Place.id;
      const existing = placeMap.get(key);
      if (existing) {
        existing.actors.push(sp.User as FriendAttendee);
      } else {
        placeMap.set(key, {
          actors: [sp.User as FriendAttendee],
          place: sp.Place,
          savedAt: sp.savedAt ?? new Date(),
        });
      }
    }

    // Group bookings by eventId
    const eventMap = new Map<
      string,
      {
        actors: FriendAttendee[];
        event: { id: string; title: string; startTime: Date; coverUrl: string | null };
      }
    >();
    for (const b of bookings) {
      if (!b.Event) continue;
      const key = b.Event.id;
      const existing = eventMap.get(key);
      if (existing) {
        existing.actors.push(b.User as FriendAttendee);
      } else {
        eventMap.set(key, {
          actors: [b.User as FriendAttendee],
          event: b.Event,
        });
      }
    }

    const items: FriendActivityItem[] = [];

    for (const outing of outings) {
      items.push({
        id: `outing-${outing.id}`,
        actionType: 'outing_created',
        actors: [outing.User as FriendAttendee],
        entity: {
          id: outing.Place?.id ?? outing.id,
          type: 'place',
          title: outing.title,
          imageUrl: outing.Place?.coverUrl ?? null,
          scheduledAt: outing.scheduledDate.toISOString(),
        },
        createdAt: outing.scheduledDate.toISOString(),
      });
    }

    for (const [, data] of placeMap) {
      items.push({
        id: `place-${data.place.id}`,
        actionType: 'place_saved',
        actors: data.actors,
        entity: {
          id: data.place.id,
          type: 'place',
          title: data.place.name,
          imageUrl: data.place.coverUrl,
          scheduledAt: null,
        },
        createdAt: data.savedAt.toISOString(),
      });
    }

    for (const [, data] of eventMap) {
      items.push({
        id: `event-${data.event.id}`,
        actionType: 'event_saved',
        actors: data.actors,
        entity: {
          id: data.event.id,
          type: 'event',
          title: data.event.title,
          imageUrl: data.event.coverUrl,
          scheduledAt: data.event.startTime.toISOString(),
        },
        createdAt: data.event.startTime.toISOString(),
      });
    }

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return { items: items.slice(0, MAX_ACTIVITY_ITEMS) };
  }

  async getMapFriendsActivity(
    userId: string,
  ): Promise<{ items: MapFriendsActivityItem[] }> {
    const friendIds = await this.getFriendIds(userId);
    if (friendIds.length === 0) return { items: [] };

    const now = new Date();
    const futureWindow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [bookings, savedPlaces] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          userId: { in: friendIds },
          status: { not: 'CANCELLED' },
          Event: { startTime: { gte: now, lte: futureWindow } },
        },
        select: {
          userId: true,
          Event: { select: { id: true } },
        },
      }),

      this.prisma.savedPlace.findMany({
        where: { userId: { in: friendIds } },
        select: { placeId: true, userId: true },
      }),
    ]);

    const eventFriendCounts = new Map<string, Set<string>>();
    for (const b of bookings) {
      if (!b.Event) continue;
      const s = eventFriendCounts.get(b.Event.id) ?? new Set<string>();
      s.add(b.userId);
      eventFriendCounts.set(b.Event.id, s);
    }

    const placeFriendCounts = new Map<string, Set<string>>();
    for (const sp of savedPlaces) {
      const s = placeFriendCounts.get(sp.placeId) ?? new Set<string>();
      s.add(sp.userId);
      placeFriendCounts.set(sp.placeId, s);
    }

    const items: MapFriendsActivityItem[] = [];

    for (const [entityId, users] of eventFriendCounts) {
      items.push({ entityId, entityType: 'event', friendsCount: users.size });
    }

    for (const [entityId, users] of placeFriendCounts) {
      items.push({ entityId, entityType: 'place', friendsCount: users.size });
    }

    return { items };
  }
}
