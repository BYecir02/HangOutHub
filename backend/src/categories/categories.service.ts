import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // Récupérer toutes les catégories
  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' }, // Trié par ordre alphabétique
    });
  }
}