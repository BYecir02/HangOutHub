import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async discover(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        Tag: {
          select: {
            id: true,
            name: true,
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
