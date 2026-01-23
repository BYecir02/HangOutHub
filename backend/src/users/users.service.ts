import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { Prisma } from '@prisma/client'; 

@Injectable()
export class UsersService {
  // On injecte le PrismaService pour pouvoir l'utiliser
  constructor(private readonly prisma: PrismaService) {}

  // CRÉER un utilisateur
  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
    });
  }

  // LIRE tous les utilisateurs (C'est ça qu'on veut tester !)
  async findAll() {
    return this.prisma.user.findMany();
  }

  // LIRE un seul utilisateur (Note: l'id est un string car c'est un UUID)
  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // METTRE À JOUR (On garde simple pour l'instant)
  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // SUPPRIMER
  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}