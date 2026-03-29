import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Express } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  findAll() {
    return this.prisma.category.findMany({
      include: {
        Tag: {
          where: {
            status: 'APPROVED',
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.category.findMany({
      include: {
        Tag: {
          select: {
            id: true,
            name: true,
            status: true,
            submittedByUserId: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new ConflictException('Le nom de categorie est obligatoire.');
    }

    return this.prisma.category.create({
      data: {
        name,
        color: dto.color?.trim() || undefined,
        icon: dto.icon?.trim() || undefined,
        animationUrl: dto.animationUrl?.trim() || undefined,
      },
    });
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon.trim() } : {}),
        ...(dto.animationUrl !== undefined
          ? { animationUrl: dto.animationUrl.trim() || null }
          : {}),
      },
    });
  }

  async updateTag(tagId: number, dto: UpdateTagDto) {
    const data: Prisma.TagUpdateInput = {};

    if (dto.name !== undefined) {
      const normalized = dto.name.trim();
      if (!normalized) {
        throw new ConflictException('Le nom du tag est obligatoire.');
      }
      data.name = normalized;
    }

    if (dto.status !== undefined) {
      data.status = dto.status.toUpperCase();
    }

    if (dto.categoryId !== undefined) {
      data.Category = {
        connect: { id: dto.categoryId },
      };
    }

    return this.prisma.tag.update({
      where: { id: tagId },
      data,
    });
  }

  async uploadCategoryAnimation(categoryId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Le fichier est requis.');
    }

    if (!file.mimetype?.includes('json')) {
      throw new BadRequestException('Le fichier doit etre en format JSON.');
    }

    const url = await this.storage.uploadFile('category-animations', file);

    return this.prisma.category.update({
      where: { id: categoryId },
      data: { animationUrl: url },
    });
  }

  async removeCategoryAnimation(categoryId: number) {
    return this.prisma.category.update({
      where: { id: categoryId },
      data: { animationUrl: null },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.category.findMany({
      include: {
        Tag: {
          where: {
            OR: [
              {
                status: 'APPROVED',
              },
              {
                submittedByUserId: userId,
              },
            ],
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createTagForCategory(categoryId: number, userId: string, rawName: string) {
    const normalizedName = rawName.replace(/\s+/g, ' ').trim();

    if (normalizedName.length < 2) {
      throw new ConflictException('Le tag doit contenir au moins 2 caracteres.');
    }

    const category = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Categorie introuvable.');
    }

    const existingTags = await this.prisma.tag.findMany({
      where: {
        categoryId,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
        submittedByUserId: true,
      },
      take: 5,
    });

    if (existingTags.length > 0) {
      const approved = existingTags.find((tag) => tag.status === 'APPROVED');
      if (approved) {
        return {
          ...approved,
          name: approved.name,
          status: 'APPROVED',
        };
      }

      const ownPending = existingTags.find(
        (tag) => tag.submittedByUserId === userId,
      );
      if (ownPending) {
        return ownPending;
      }

      throw new ConflictException(
        'Ce tag existe deja et est en attente de validation.',
      );
    }

    return this.prisma.tag.create({
      data: {
        name: normalizedName,
        categoryId,
        status: 'PENDING',
        submittedByUserId: userId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        submittedByUserId: true,
      },
    });
  }

  async discover(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        Tag: {
          where: {
            status: 'APPROVED',
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categorie introuvable');
    }

    const keywords = Array.from(
      new Set(
        [category.name, ...category.Tag.map((tag) => tag.name)]
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    const eventTextFilters: Prisma.EventWhereInput[] = keywords.flatMap(
      (keyword) => [
        {
          title: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          address: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
      ],
    );

    const placeTextFilters: Prisma.PlaceWhereInput[] = keywords.flatMap(
      (keyword) => [
        {
          name: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          address: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
      ],
    );

    const [events, places] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          OR: [
            {
              EventTag: {
                some: {
                  Tag: {
                    categoryId: id,
                  },
                },
              },
            },
            ...eventTextFilters,
          ],
        },
        include: {
          Place: {
            select: {
              id: true,
              name: true,
              address: true,
              City: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.place.findMany({
        where: {
          OR: [
            {
              PlaceTag: {
                some: {
                  Tag: {
                    categoryId: id,
                  },
                },
              },
            },
            ...placeTextFilters,
          ],
        },
        include: {
          City: true,
        },
        orderBy: [{ avgRating: 'desc' }, { name: 'asc' }],
      }),
    ]);

    return {
      category,
      events,
      places,
    };
  }
}
