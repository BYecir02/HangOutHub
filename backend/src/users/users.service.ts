import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

interface OrganizerDetailsInput {
  accountType: string;
  companyName: string;
  ifuNumber: string;
  payoutInfo: string;
  jobTitle: string;
}

type SanitizedUser<T extends { passwordHash?: string | null }> = Omit<
  T,
  'passwordHash'
>;

export interface UserPreferenceTag {
  id: number;
  name: string;
}

export interface UserPreferenceCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  tags: UserPreferenceTag[];
}

export interface UserTagPreferencesResponse {
  categories: UserPreferenceCategory[];
  selectedTagIds: number[];
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser<T extends { passwordHash?: string | null }>(
    user: T,
  ): SanitizedUser<T> {
    const result = { ...user } as T & { passwordHash?: string | null };
    delete result.passwordHash;
    return result;
  }

  private sanitizeUsers<T extends { passwordHash?: string | null }>(
    users: T[],
  ) {
    return users.map((user) => this.sanitizeUser(user));
  }

  async create(
    createUserDto: CreateUserDto,
    roleName = 'USER',
    organizerDetails?: OrganizerDetailsInput,
  ) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { phoneNumber: createUserDto.phoneNumber },
          { username: createUserDto.username },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Un utilisateur avec cet email, telephone ou pseudo existe deja.',
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const userData: Omit<CreateUserDto, 'password'> = {
      username: createUserDto.username,
      email: createUserDto.email,
      phoneNumber: createUserDto.phoneNumber,
      residenceCityId: createUserDto.residenceCityId,
    };

    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(
        `Le role '${roleName}' est introuvable en base de donnees.`,
      );
    }

    const newUser = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        isVerified: false,
        UserRole: {
          create: {
            roleId: role.id,
          },
        },
        OrganizerProfile: organizerDetails
          ? { create: organizerDetails }
          : undefined,
      },
      include: {
        UserRole: {
          include: { Role: true },
        },
        OrganizerProfile: true,
      },
    });

    return this.sanitizeUser(newUser);
  }

  async findAll() {
    const users = await this.prisma.user.findMany();
    return this.sanitizeUsers(users);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        OrganizerProfile: true,
        UserRole: { include: { Role: true } },
        OwnedPlaces: {
          select: {
            id: true,
            name: true,
            coverUrl: true,
            address: true,
            avgRating: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return user ? this.sanitizeUser(user) : null;
  }

  async findPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        OrganizerProfile: {
          select: {
            companyName: true,
            jobTitle: true,
            accountType: true,
            status: true,
          },
        },
        OwnedPlaces: {
          select: {
            id: true,
            name: true,
            coverUrl: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        UserRole: {
          include: {
            Role: true,
          },
        },
        _count: {
          select: {
            Post: true,
            Outing: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const role = user.UserRole[0]?.Role?.name || 'USER';

    return {
      ...user,
      role,
    };
  }

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        UserRole: {
          include: {
            Role: true,
          },
        },
        OrganizerProfile: true,
        OwnedPlaces: { select: { id: true } },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true };
  }

  async update(id: string, updateUserDto: Prisma.UserUpdateInput) {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    return this.sanitizeUser(user);
  }

  async approveOrganizer(userId: string) {
    return this.prisma.organizerProfile.update({
      where: { userId },
      data: { status: 'APPROVED' },
    });
  }

  async getTagPreferences(userId: string): Promise<UserTagPreferencesResponse> {
    const [categories, interests] = await Promise.all([
      this.prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: {
          Tag: {
            select: {
              id: true,
              name: true,
            },
            orderBy: { name: 'asc' },
          },
        },
      }),
      this.prisma.userTagInterest.findMany({
        where: { userId },
        select: { tagId: true },
      }),
    ]);

    return {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        tags: category.Tag,
      })),
      selectedTagIds: interests.map((interest) => interest.tagId),
    };
  }

  async updateTagPreferences(
    userId: string,
    tagIds: number[],
  ): Promise<UserTagPreferencesResponse> {
    const uniqueTagIds = Array.from(new Set(tagIds));

    if (uniqueTagIds.length > 0) {
      const existingTags = await this.prisma.tag.findMany({
        where: {
          id: {
            in: uniqueTagIds,
          },
        },
        select: { id: true },
      });

      if (existingTags.length !== uniqueTagIds.length) {
        throw new NotFoundException('Certains tags sont introuvables.');
      }
    }

    await this.prisma.$transaction([
      this.prisma.userTagInterest.deleteMany({
        where: { userId },
      }),
      ...(uniqueTagIds.length > 0
        ? [
            this.prisma.userTagInterest.createMany({
              data: uniqueTagIds.map((tagId) => ({
                userId,
                tagId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    return this.getTagPreferences(userId);
  }
}
