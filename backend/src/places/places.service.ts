import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaceDto } from './dto/create-place.dto';

@Injectable()
export class PlacesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createPlaceDto: CreatePlaceDto,
    files: { cover?: Express.Multer.File[]; gallery?: Express.Multer.File[] },
  ) {
    const coverFile = files.cover ? files.cover[0] : null;
    const coverUrl = coverFile ? `/uploads/${coverFile.filename}` : null;

    const galleryUrls = files.gallery
      ? files.gallery.map((file) => `/uploads/${file.filename}`)
      : [];

    return this.prisma.place.create({
      data: {
        name: createPlaceDto.name,
        description: createPlaceDto.description,
        address: createPlaceDto.address,
        latitude: createPlaceDto.latitude,
        longitude: createPlaceDto.longitude,
        coverUrl: coverUrl,
        images: galleryUrls,

        // Gestion du priceLevel (Défaut 1 si pas envoyé)
        priceLevel: createPlaceDto.priceLevel || 1,

        // ⚠️ ATTENTION : Ta table dit que cityId est OBLIGATOIRE (Int).
        // On doit s'assurer que l'ID 1 (Cotonou) existe bien dans ta table City.
        cityId: createPlaceDto.cityId || 1,
      },
    });
  }

  findAll() {
    return this.prisma.place.findMany({
      include: {
        City: true, // Pour afficher "Cotonou" au lieu de "1"
        PlaceTag: { include: { Tag: true } }, // Si tu veux voir les tags (Bar, Resto...)
      },
    });
  }

  findOne(id: string) {
    return this.prisma.place.findUnique({
      where: { id },
      include: {
        City: true,
        PlaceTag: { include: { Tag: true } },
      },
    });
  }
}
