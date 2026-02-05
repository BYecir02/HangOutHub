import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // --- CRÉATION (Inscription) ---
  async create(createUserDto: CreateUserDto) {
    // 1. Vérif existant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { phoneNumber: createUserDto.phoneNumber },
          { username: createUserDto.username }
        ]
      }
    });

    if (existingUser) {
      throw new ConflictException('Un·utilisateur·avec·cet·Email,·Téléphone·ou·Pseudo·existe·déjà.');
    }

    // 2. Hachage
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    // 3. Préparation
    const userData = { ...createUserDto };
    delete userData.password;

    // 3.5 Récupérer le rôle "USER"
    const userRole = await this.prisma.role.findUnique({
      where: { name: 'USER' }
    });

    if (!userRole) {
      throw new NotFoundException("Le rôle 'USER' est introuvable en base de données.");
    }

    // 4. Création
    const newUser = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        isVerified: false,
        UserRole: {
          create: {
            roleId: userRole.id
          }
        }
      },
      include: {
        UserRole: {
          include: { Role: true } 
        }
      }
    });

    const result = { ...newUser };
    delete result.passwordHash;
    return result;
  }

  // --- LECTURE (Tous les users) ---
  async findAll() {
    return this.prisma.user.findMany();
  }

  // --- LECTURE (Un seul user par ID) ---
  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // --- LECTURE (Un user par Email - Pour le Login) ---
  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        UserRole: {
          include: {
            Role: true 
          }
        }
      }
    });
  }

  // --- SUPPRESSION ---
  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  // mise à jour du profil utilisateur
  async update(id: string, updateUserDto: Prisma.UserUpdateInput) {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    const result = { ...user };
    delete result.passwordHash;
    return result;
  }
}