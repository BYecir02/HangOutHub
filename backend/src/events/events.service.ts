import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

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

    return this.prisma.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        startTime: new Date(createEventDto.startTime),
        endTime: createEventDto.endTime
          ? new Date(createEventDto.endTime)
          : null,
        entryFee: createEventDto.entryFee || 0,
        coverUrl,
        images: galleryUrls,
        organizerId: userId,
        placeId: createEventDto.placeId || null,
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
      },
    });

    if (!event) {
      throw new NotFoundException('Evenement introuvable');
    }

    return event;
  }
}
