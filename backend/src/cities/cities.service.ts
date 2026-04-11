import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

  async create(dto: CreateCityDto) {
    const name = dto.name.trim();
    const country = dto.country.trim();

    if (!name) {
      throw new BadRequestException('Le nom de la ville est obligatoire.');
    }

    if (!country) {
      throw new BadRequestException('Le pays est obligatoire.');
    }

    const existing = await this.prisma.city.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      const existingCountry = (existing.country ?? '').trim().toLowerCase();
      if (existingCountry === country.toLowerCase()) {
        return existing;
      }

      throw new ConflictException('Une ville avec ce nom existe deja.');
    }

    const baseSlug = slugify(`${name}-${country}`) || slugify(name);

    if (!baseSlug) {
      throw new BadRequestException('Le nom de la ville est invalide.');
    }

    let slug = baseSlug;
    let suffix = 1;

    while (await this.prisma.city.findFirst({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return this.prisma.city.create({
      data: {
        name,
        country,
        slug,
      },
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
    });
  }
}
