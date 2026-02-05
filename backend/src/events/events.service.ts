import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    createEventDto: CreateEventDto,
    files: { cover?: Express.Multer.File[]; gallery?: Express.Multer.File[] },
  ) {
    // 1. Gestion de l'image de couverture
    const coverFile = files.cover ? files.cover[0] : null;
    const coverUrl = coverFile ? `/uploads/${coverFile.filename}` : null;

    // 2. Gestion de la galerie
    const galleryUrls = files.gallery
      ? files.gallery.map((file) => `/uploads/${file.filename}`)
      : [];

    // 2. Création dans la base via Prisma
    return this.prisma.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        startTime: new Date(createEventDto.startTime), // Conversion String -> Date
        endTime: createEventDto.endTime
          ? new Date(createEventDto.endTime)
          : null,
        entryFee: createEventDto.entryFee || 0,
        coverUrl: coverUrl,
        images: galleryUrls,
        organizerId: userId, // On lie l'événement à l'user connecté
        placeId: createEventDto.placeId || null,
      },
    });
  }

  findAll() {
    return this.prisma.event.findMany({
      include: {
        User: { select: { username: true, avatarUrl: true } }, // On récupère l'organisateur
        Place: true, // On récupère le lieu si il existe
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
