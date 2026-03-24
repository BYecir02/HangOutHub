import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.city.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        imageUrl: true,
        country: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
