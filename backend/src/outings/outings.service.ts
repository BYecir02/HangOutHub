import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOutingDto } from './dto/create-outing.dto';

@Injectable()
export class OutingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createOutingDto: CreateOutingDto) {
    if (createOutingDto.placeId) {
      const place = await this.prisma.place.findUnique({
        where: { id: createOutingDto.placeId },
        select: { id: true },
      });

      if (!place) {
        throw new NotFoundException('Lieu introuvable');
      }
    }

    return this.prisma.outing.create({
      data: {
        creatorId: userId,
        title: createOutingDto.title,
        scheduledDate: new Date(createOutingDto.scheduledDate),
        placeId: createOutingDto.placeId || null,
        status: 'PLANNED',
        OutingParticipant: {
          create: {
            userId,
            status: 'GOING',
            isAdmin: true,
          },
        },
      },
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
            coverUrl: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            OutingParticipant: true,
          },
        },
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.outing.findMany({
      where: { creatorId: userId },
      orderBy: { scheduledDate: 'asc' },
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
            coverUrl: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            OutingParticipant: true,
          },
        },
      },
    });
  }
}
