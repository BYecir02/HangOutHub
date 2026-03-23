import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

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
