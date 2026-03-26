import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { CreatePlaceReviewDto } from './dto/create-place-review.dto';
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
    role: string,
  ) {
    const place = await this.prisma.place.findUnique({ where: { id } });

    if (!place) {
      throw new NotFoundException('Lieu introuvable');
    }

    const normalizedRole = role.toUpperCase();

    if (place.ownerId !== userId && normalizedRole !== 'ADMIN') {
      throw new ForbiddenException(
        "Vous n'etes pas le proprietaire de ce lieu",
      );
    }

    const { tagIds: rawTagIds, existingImages: rawExistingImages, ...rest } =
      updatePlaceDto as UpdatePlaceDto & {
        tagIds?: string;
        existingImages?: string;
      };
    const data: Prisma.PlaceUpdateInput = { ...rest };

    const tagIds =
      rawTagIds !== undefined ? this.parseTagIdsPayload(rawTagIds) : null;

    if (files?.cover?.[0]) {
      data.coverUrl = await this.storageService.uploadFile(
        'places',
        files.cover[0],
      );
    }

    const uploadedGalleryUrls =
      files?.gallery && files.gallery.length > 0
        ? await this.storageService.uploadFiles('places', files.gallery)
        : [];

    let existingImages: string[] | null = null;
    if (rawExistingImages !== undefined) {
      try {
        const parsed = JSON.parse(rawExistingImages);
        if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
          throw new Error('invalid');
        }
        existingImages = parsed;
      } catch {
        throw new BadRequestException('existingImages invalide.');
      }
    }

    if (existingImages !== null || uploadedGalleryUrls.length > 0) {
      const baseImages = existingImages !== null ? existingImages : place.images;
      data.images = [...baseImages, ...uploadedGalleryUrls];
    }

    if (tagIds !== null) {
      if (tagIds.length > 0) {
        const existingTags = await this.prisma.tag.count({
          where: {
            id: { in: tagIds },
            status: 'APPROVED',
          },
        });

        if (existingTags !== tagIds.length) {
          throw new BadRequestException('Un ou plusieurs tags sont invalides.');
        }
      }
    }

    const updated = await this.prisma.place.update({ where: { id }, data });

    if (tagIds !== null) {
      await this.prisma.placeTag.deleteMany({ where: { placeId: id } });
      if (tagIds.length > 0) {
        await this.prisma.placeTag.createMany({
          data: tagIds.map((tagId) => ({
            placeId: id,
            tagId,
          })),
        });
      }
    }

    return updated;
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
      throw new BadRequestException('Chaque tag doit etre un id entier positif.');
    }

    return Array.from(new Set(normalized));
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

  async getReviews(placeId: string) {
    return this.prisma.review.findMany({
      where: { placeId },
      orderBy: { createdAt: 'desc' },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async upsertReview(placeId: string, userId: string, dto: CreatePlaceReviewDto) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });

    if (!place) {
      throw new NotFoundException('Lieu introuvable');
    }

    const rating = Math.max(1, Math.min(5, Number(dto.rating || 0)));
    const comment = dto.comment?.trim() || null;

    const existing = await this.prisma.review.findFirst({
      where: { placeId, userId },
    });

    const review = existing
      ? await this.prisma.review.update({
          where: { id: existing.id },
          data: { rating, comment },
          include: {
            User: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        })
      : await this.prisma.review.create({
          data: {
            placeId,
            userId,
            rating,
            comment,
          },
          include: {
            User: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });

    const aggregate = await this.prisma.review.aggregate({
      where: { placeId },
      _avg: { rating: true },
    });

    await this.prisma.place.update({
      where: { id: placeId },
      data: {
        avgRating: aggregate._avg.rating || 0,
      },
    });

    return review;
  }
}
