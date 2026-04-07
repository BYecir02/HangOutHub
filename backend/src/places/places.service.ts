import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { hasPlaceTeamRoleAtLeast } from '../permissions/place-team-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { CreatePlaceTeamMemberDto } from './dto/create-place-team-member.dto';
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
        ...createPlaceDto,
        moderationStatus: this.normalizeModerationStatus(
          createPlaceDto.moderationStatus,
        ),
        externalProvider: this.normalizeOptionalString(
          createPlaceDto.externalProvider,
        ),
        externalProviderId: this.normalizeOptionalString(
          createPlaceDto.externalProviderId,
        ),
        externalUrl: this.normalizeOptionalString(createPlaceDto.externalUrl),
        coverUrl,
        images: galleryUrls,
        ownerId,
        priceLevel: createPlaceDto.priceLevel || 1,
        cityId: createPlaceDto.cityId || 1,
        providerMatchedAt: this.hasProviderMetadata(createPlaceDto)
          ? new Date()
          : undefined,
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

    const {
      tagIds: rawTagIds,
      existingImages: rawExistingImages,
      ...rest
    } = updatePlaceDto as UpdatePlaceDto & {
      tagIds?: string;
      existingImages?: string;
    };
    const data: Prisma.PlaceUpdateInput = { ...rest };

    if (rest.moderationStatus !== undefined) {
      data.moderationStatus = this.normalizeModerationStatus(
        rest.moderationStatus,
      );
    }

    if (rest.externalProvider !== undefined) {
      data.externalProvider = this.normalizeOptionalString(
        rest.externalProvider,
      );
    }

    if (rest.externalProviderId !== undefined) {
      data.externalProviderId = this.normalizeOptionalString(
        rest.externalProviderId,
      );
    }

    if (rest.externalUrl !== undefined) {
      data.externalUrl = this.normalizeOptionalString(rest.externalUrl);
    }

    if (rest.providerMatchConfidence !== undefined) {
      data.providerMatchConfidence = rest.providerMatchConfidence;
    }

    if (this.hasProviderMetadata(rest)) {
      data.providerMatchedAt = new Date();
    }

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
        const parsed: unknown = JSON.parse(rawExistingImages);
        if (
          !Array.isArray(parsed) ||
          parsed.some((item) => typeof item !== 'string')
        ) {
          throw new Error('invalid');
        }
        existingImages = parsed;
      } catch {
        throw new BadRequestException('existingImages invalide.');
      }
    }

    if (existingImages !== null || uploadedGalleryUrls.length > 0) {
      const baseImages =
        existingImages !== null ? existingImages : place.images;
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

  async remove(id: string, userId: string, role: string) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!place) {
      throw new NotFoundException('Lieu introuvable');
    }

    const normalizedRole = role.toUpperCase();
    if (place.ownerId !== userId && normalizedRole !== 'ADMIN') {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a supprimer ce lieu.",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.placeTeamMember.deleteMany({
        where: {
          placeId: id,
        },
      });

      await tx.placeTag.deleteMany({
        where: {
          placeId: id,
        },
      });

      await tx.placeClaim.deleteMany({
        where: {
          placeId: id,
        },
      });

      await tx.savedPlace.deleteMany({
        where: {
          placeId: id,
        },
      });

      await tx.review.deleteMany({
        where: {
          placeId: id,
        },
      });

      await tx.subscription.deleteMany({
        where: {
          placeId: id,
        },
      });

      await tx.event.updateMany({
        where: {
          placeId: id,
        },
        data: {
          placeId: null,
        },
      });

      await tx.outing.updateMany({
        where: {
          placeId: id,
        },
        data: {
          placeId: null,
        },
      });

      await tx.post.updateMany({
        where: {
          placeId: id,
        },
        data: {
          placeId: null,
        },
      });

      await tx.story.updateMany({
        where: {
          placeId: id,
        },
        data: {
          placeId: null,
        },
      });

      const placePromotions = await tx.promotion.findMany({
        where: {
          placeId: id,
        },
        select: {
          id: true,
          eventId: true,
        },
      });

      const placeOnlyPromotionIds = placePromotions
        .filter((promotion) => !promotion.eventId)
        .map((promotion) => promotion.id);

      if (placeOnlyPromotionIds.length > 0) {
        await tx.promotion.deleteMany({
          where: {
            id: {
              in: placeOnlyPromotionIds,
            },
          },
        });
      }

      const eventLinkedPromotionIds = placePromotions
        .filter((promotion) => Boolean(promotion.eventId))
        .map((promotion) => promotion.id);

      if (eventLinkedPromotionIds.length > 0) {
        await tx.promotion.updateMany({
          where: {
            id: {
              in: eventLinkedPromotionIds,
            },
          },
          data: {
            placeId: null,
          },
        });
      }

      await tx.place.delete({
        where: {
          id,
        },
      });
    });

    return {
      success: true,
      id,
    };
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
      throw new BadRequestException(
        'Chaque tag doit etre un id entier positif.',
      );
    }

    return Array.from(new Set(normalized));
  }

  private hasProviderMetadata(payload: {
    externalProvider?: string | null;
    externalProviderId?: string | null;
    externalUrl?: string | null;
    providerMatchConfidence?: number | null;
  }) {
    return (
      Boolean(this.normalizeOptionalString(payload.externalProvider)) ||
      Boolean(this.normalizeOptionalString(payload.externalProviderId)) ||
      Boolean(this.normalizeOptionalString(payload.externalUrl)) ||
      payload.providerMatchConfidence !== undefined
    );
  }

  private normalizeOptionalString(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeModerationStatus(value?: string | null) {
    const trimmed = value?.trim().toUpperCase();
    return trimmed || 'PENDING';
  }

  private async getPlaceAuthorizationContext(placeId: string) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!place) {
      throw new NotFoundException('Lieu introuvable');
    }

    return place;
  }

  private canManagePlaceTeam(
    role: string,
    place: { ownerId: string | null },
    userId: string,
    placeTeamRole: string | null,
  ) {
    const normalizedRole = role.toUpperCase();
    return (
      normalizedRole === 'ADMIN' ||
      place.ownerId === userId ||
      hasPlaceTeamRoleAtLeast(placeTeamRole, 'MANAGER')
    );
  }

  private canReadPlaceTeam(
    role: string,
    place: { ownerId: string | null },
    userId: string,
    placeTeamRole: string | null,
  ) {
    const normalizedRole = role.toUpperCase();
    return (
      normalizedRole === 'ADMIN' ||
      place.ownerId === userId ||
      hasPlaceTeamRoleAtLeast(placeTeamRole, 'STAFF')
    );
  }

  private async findPlaceTeamRole(placeId: string, userId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ role: string | null }>>`
      SELECT "role"
      FROM "PlaceTeamMember"
      WHERE "placeId" = ${placeId}::uuid
        AND "userId" = ${userId}::uuid
      LIMIT 1
    `;

    return rows[0]?.role || null;
  }

  async listPlaceTeam(placeId: string, userId: string, role: string) {
    const place = await this.getPlaceAuthorizationContext(placeId);
    const placeTeamRole = await this.findPlaceTeamRole(placeId, userId);
    if (!this.canReadPlaceTeam(role, place, userId, placeTeamRole)) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a consulter l'equipe de ce lieu.",
      );
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        placeId: string;
        userId: string;
        role: string | null;
        createdAt: Date | null;
      }>
    >`SELECT "placeId", "userId", "role", "createdAt"
      FROM "PlaceTeamMember"
      WHERE "placeId" = ${placeId}::uuid
      ORDER BY "createdAt" ASC`;

    if (rows.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: rows.map((row) => row.userId),
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    const userById = new Map(users.map((entry) => [entry.id, entry]));

    return rows
      .map((row) => {
        const teamUser = userById.get(row.userId);
        if (!teamUser) {
          return null;
        }
        return {
          ...row,
          User: teamUser,
        };
      })
      .filter((entry) => Boolean(entry));
  }

  async listMyPlaceTeams(userId: string) {
    const rows = await this.prisma.placeTeamMember.findMany({
      where: {
        userId,
      },
      select: {
        placeId: true,
        role: true,
        createdAt: true,
        Place: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            City: {
              select: {
                id: true,
                name: true,
                country: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return rows.map((row) => ({
      placeId: row.placeId,
      role: row.role,
      createdAt: row.createdAt,
      Place: row.Place,
    }));
  }

  async upsertPlaceTeamMember(
    placeId: string,
    userId: string,
    role: string,
    payload: CreatePlaceTeamMemberDto,
  ) {
    const place = await this.getPlaceAuthorizationContext(placeId);
    const actorPlaceTeamRole = await this.findPlaceTeamRole(placeId, userId);
    if (!this.canManagePlaceTeam(role, place, userId, actorPlaceTeamRole)) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a modifier l'equipe de ce lieu.",
      );
    }

    const normalizedActorRole = role.toUpperCase();
    const actorIsAdminOrOwner =
      normalizedActorRole === 'ADMIN' || place.ownerId === userId;
    const targetRole = (payload.role || 'STAFF').toUpperCase();
    if (!actorIsAdminOrOwner && targetRole === 'MANAGER') {
      throw new ForbiddenException(
        'Seul le proprietaire du lieu peut nommer un manager.',
      );
    }

    if (payload.userId === place.ownerId) {
      throw new BadRequestException(
        'Le gerant principal du lieu ne peut pas etre ajoute comme membre secondaire.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    await this.prisma.$executeRaw`
      INSERT INTO "PlaceTeamMember" ("placeId", "userId", "role")
      VALUES (${placeId}::uuid, ${payload.userId}::uuid, ${targetRole})
      ON CONFLICT ("placeId", "userId")
      DO UPDATE SET "role" = EXCLUDED."role"
    `;

    return this.listPlaceTeam(placeId, userId, role);
  }

  async removePlaceTeamMember(
    placeId: string,
    userId: string,
    role: string,
    placeMemberUserId: string,
  ) {
    const place = await this.getPlaceAuthorizationContext(placeId);
    const actorPlaceTeamRole = await this.findPlaceTeamRole(placeId, userId);
    if (!this.canManagePlaceTeam(role, place, userId, actorPlaceTeamRole)) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a modifier l'equipe de ce lieu.",
      );
    }

    const normalizedActorRole = role.toUpperCase();
    const actorIsAdminOrOwner =
      normalizedActorRole === 'ADMIN' || place.ownerId === userId;
    if (!actorIsAdminOrOwner) {
      const targetRows = await this.prisma.$queryRaw<
        Array<{ role: string | null }>
      >`
        SELECT "role"
        FROM "PlaceTeamMember"
        WHERE "placeId" = ${placeId}::uuid
          AND "userId" = ${placeMemberUserId}::uuid
        LIMIT 1
      `;
      if (hasPlaceTeamRoleAtLeast(targetRows[0]?.role || null, 'MANAGER')) {
        throw new ForbiddenException(
          'Seul le proprietaire du lieu peut retirer un manager.',
        );
      }
    }

    await this.prisma.$executeRaw`
      DELETE FROM "PlaceTeamMember"
      WHERE "placeId" = ${placeId}::uuid
        AND "userId" = ${placeMemberUserId}::uuid
    `;

    const placeEventIds = await this.prisma.event.findMany({
      where: { placeId },
      select: { id: true },
    });

    if (placeEventIds.length > 0) {
      await this.prisma.eventCollaborator.deleteMany({
        where: {
          userId: placeMemberUserId,
          eventId: {
            in: placeEventIds.map((event) => event.id),
          },
        },
      });
    }

    return this.listPlaceTeam(placeId, userId, role);
  }

  findAll() {
    return this.prisma.place.findMany({
      include: {
        City: true,
        PlaceTag: { include: { Tag: { include: { Category: true } } } },
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
      await this.prisma.savedPlace.deleteMany({
        where: {
          userId,
          placeId: id,
        },
      });

      return { placeId: id, saved: false };
    }

    try {
      await this.prisma.savedPlace.create({
        data: {
          userId,
          placeId: id,
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        return { placeId: id, saved: true };
      }

      throw error;
    }

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
        PlaceTag: { include: { Tag: { include: { Category: true } } } },
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

  async upsertReview(
    placeId: string,
    userId: string,
    dto: CreatePlaceReviewDto,
  ) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
    });

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
