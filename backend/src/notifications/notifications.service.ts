import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
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
