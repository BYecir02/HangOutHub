import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';

@Injectable()
export class PlacesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async create(
    createPlaceDto: CreatePlaceDto,
    files: {
      cover?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    } = {},
    ownerId: string,
  ) {
    const coverFile = files?.cover?.[0] ?? null;
    const coverUrl = coverFile
      ? await this.storageService.uploadFile('places', coverFile)
      : null;

    const galleryUrls = files?.gallery
      ? await this.storageService.uploadFiles('places', files.gallery)
      : [];

    return this.prisma.place.create({
      data: {
        name: createPlaceDto.name,
        description: createPlaceDto.description,
        address: createPlaceDto.address,
        latitude: createPlaceDto.latitude,
        longitude: createPlaceDto.longitude,
        coverUrl,
        images: galleryUrls,
        ownerId,
        priceLevel: createPlaceDto.priceLevel || 1,
        cityId: createPlaceDto.cityId || 1,
      },
    });
  }

  async update(
    id: string,
    updatePlaceDto: UpdatePlaceDto,
    files: {
      cover?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
    } = {},
    userId: string,
  ) {
    const place = await this.prisma.place.findUnique({ where: { id } });

    if (!place) {
      throw new NotFoundException('Lieu introuvable');
    }

    if (place.ownerId !== userId) {
      throw new ForbiddenException(
        "Vous n'etes pas le proprietaire de ce lieu",
      );
    }

    const data: Prisma.PlaceUpdateInput = { ...updatePlaceDto };

    if (files?.cover?.[0]) {
      data.coverUrl = await this.storageService.uploadFile(
        'places',
        files.cover[0],
      );
    }

    if (files?.gallery && files.gallery.length > 0) {
      data.images = await this.storageService.uploadFiles(
        'places',
        files.gallery,
      );
    }

    return this.prisma.place.update({ where: { id }, data });
  }

  findAll() {
    return this.prisma.place.findMany({
      include: {
        City: true,
        PlaceTag: { include: { Tag: true } },
      },
    });
  }

  async toggleSave(id: string, userId: string) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!place) {
      throw new NotFoundException('Lieu introuvable');
    }

    const existingSave = await this.prisma.savedPlace.findUnique({
      where: {
        userId_placeId: {
          userId,
          placeId: id,
        },
      },
    });

    if (existingSave) {
      await this.prisma.savedPlace.delete({
        where: {
          userId_placeId: {
            userId,
            placeId: id,
          },
        },
      });

      return { placeId: id, saved: false };
    }

    await this.prisma.savedPlace.create({
      data: {
        userId,
        placeId: id,
      },
    });

    return { placeId: id, saved: true };
  }

  async findSavedByUser(userId: string) {
    const savedPlaces = await this.prisma.savedPlace.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      select: {
        Place: {
          include: {
            City: true,
          },
        },
      },
    });

    return savedPlaces.map((item) => item.Place);
  }

  findOne(id: string) {
    return this.prisma.place.findUnique({
      where: { id },
      include: {
        City: true,
        PlaceTag: { include: { Tag: true } },
        Owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        Event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            coverUrl: true,
            entryFee: true,
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });
  }
}
