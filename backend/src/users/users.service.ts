import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { ActivateProProfileDto } from './dto/activate-pro-profile.dto';

interface OrganizerDetailsInput {
  accountType: string;
  companyName: string;
  ifuNumber: string;
  payoutInfo: string;
  jobTitle: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  xUrl?: string;
  websiteUrl?: string;
}

interface UserSessionItem {
  id: string;
  device: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  isActive: boolean;
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

export interface UserSettingsResponse {
  notificationMessages: boolean;
  notificationOutingInvites: boolean;
  notificationFriendRequests: boolean;
  notificationSavedPlacesActivity: boolean;
  organizerNotifyBookings: boolean;
  organizerNotifyTeamUpdates: boolean;
  organizerNotifyReminderD1: boolean;
  organizerNotifyReminderH3: boolean;
  organizerNotifyReminderH1: boolean;
  organizerReminderMode: 'preset' | 'custom';
  organizerReminderOffsetsMin: number[];
  organizerNotificationPriorityMin: 'IMPORTANT' | 'URGENT';
  organizerScannerOfflineAuto: boolean;
  organizerScannerAutoSync: boolean;
  organizerScannerHaptics: boolean;
  organizerScannerSound: boolean;
  organizerScannerStrictWindow: boolean;
  organizerDefaultCheckInOpenOffsetMin: number;
  organizerDefaultCheckInCloseOffsetMin: number;
  organizerDefaultMaxTicketsPerUser: number;
  organizerDefaultCancellationPolicy: string | null;
  organizerDefaultRefundPolicy: string | null;
  organizerTeamInviteScope: 'OWNER_ONLY' | 'OWNER_AND_EDITORS';
  organizerTeamDefaultPermission: 'EDIT' | 'SCAN';
  organizerTeamRequireRemovalConfirm: boolean;
  profilePublic: boolean;
  defaultPostVisibility: 'public' | 'friends' | 'private';
  allowOutingInvitesFrom: 'everyone' | 'connections' | 'nobody';
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'en';
  dataSaver: boolean;
}

export interface AdminUserSessionResponse {
  id: string;
  device: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  isActive: boolean;
}

type StoredUserSettings = {
  notificationMessages: boolean;
  notificationOutingInvites: boolean;
  notificationFriendRequests: boolean;
  notificationSavedPlacesActivity: boolean;
  organizerNotifyBookings: boolean;
  organizerNotifyTeamUpdates: boolean;
  organizerNotifyReminderD1: boolean;
  organizerNotifyReminderH3: boolean;
  organizerNotifyReminderH1: boolean;
  organizerReminderMode?: string;
  organizerReminderOffsetsMin?: number[];
  organizerNotificationPriorityMin: string;
  organizerScannerOfflineAuto: boolean;
  organizerScannerAutoSync: boolean;
  organizerScannerHaptics: boolean;
  organizerScannerSound: boolean;
  organizerScannerStrictWindow: boolean;
  organizerDefaultCheckInOpenOffsetMin: number;
  organizerDefaultCheckInCloseOffsetMin: number;
  organizerDefaultMaxTicketsPerUser: number;
  organizerDefaultCancellationPolicy: string | null;
  organizerDefaultRefundPolicy: string | null;
  organizerTeamInviteScope: string;
  organizerTeamDefaultPermission: string;
  organizerTeamRequireRemovalConfirm: boolean;
  profilePublic: boolean;
  defaultPostVisibility: string;
  allowOutingInvitesFrom: string;
  theme: string;
  language: string;
  dataSaver: boolean;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeReminderOffsets(
    offsets: number[] | null | undefined,
  ): number[] {
    if (!Array.isArray(offsets)) {
      return [];
    }

    const uniqueSorted = Array.from(
      new Set(
        offsets
          .filter((offset) => Number.isInteger(offset))
          .map((offset) => Number(offset))
          .filter((offset) => offset >= 15 && offset <= 10080),
      ),
    )
      .sort((a, b) => b - a)
      .slice(0, 3);

    return uniqueSorted;
  }

  private buildLegacyReminderOffsets(settings: {
    organizerNotifyReminderD1: boolean;
    organizerNotifyReminderH3: boolean;
    organizerNotifyReminderH1: boolean;
  }): number[] {
    const offsets: number[] = [];

    if (settings.organizerNotifyReminderD1) {
      offsets.push(1440);
    }
    if (settings.organizerNotifyReminderH3) {
      offsets.push(180);
    }
    if (settings.organizerNotifyReminderH1) {
      offsets.push(60);
    }

    return offsets;
  }

  private mapSettings(settings: StoredUserSettings): UserSettingsResponse {
    const normalizedCustomOffsets = this.normalizeReminderOffsets(
      settings.organizerReminderOffsetsMin,
    );

    const fallbackLegacyOffsets = this.normalizeReminderOffsets(
      this.buildLegacyReminderOffsets(settings),
    );

    return {
      notificationMessages: settings.notificationMessages,
      notificationOutingInvites: settings.notificationOutingInvites,
      notificationFriendRequests: settings.notificationFriendRequests,
      notificationSavedPlacesActivity: settings.notificationSavedPlacesActivity,
      organizerNotifyBookings: settings.organizerNotifyBookings,
      organizerNotifyTeamUpdates: settings.organizerNotifyTeamUpdates,
      organizerNotifyReminderD1: settings.organizerNotifyReminderD1,
      organizerNotifyReminderH3: settings.organizerNotifyReminderH3,
      organizerNotifyReminderH1: settings.organizerNotifyReminderH1,
      organizerReminderMode:
        settings.organizerReminderMode === 'custom' ? 'custom' : 'preset',
      organizerReminderOffsetsMin:
        normalizedCustomOffsets.length > 0
          ? normalizedCustomOffsets
          : fallbackLegacyOffsets,
      organizerNotificationPriorityMin:
        settings.organizerNotificationPriorityMin as 'IMPORTANT' | 'URGENT',
      organizerScannerOfflineAuto: settings.organizerScannerOfflineAuto,
      organizerScannerAutoSync: settings.organizerScannerAutoSync,
      organizerScannerHaptics: settings.organizerScannerHaptics,
      organizerScannerSound: settings.organizerScannerSound,
      organizerScannerStrictWindow: settings.organizerScannerStrictWindow,
      organizerDefaultCheckInOpenOffsetMin:
        settings.organizerDefaultCheckInOpenOffsetMin,
      organizerDefaultCheckInCloseOffsetMin:
        settings.organizerDefaultCheckInCloseOffsetMin,
      organizerDefaultMaxTicketsPerUser:
        settings.organizerDefaultMaxTicketsPerUser,
      organizerDefaultCancellationPolicy:
        settings.organizerDefaultCancellationPolicy,
      organizerDefaultRefundPolicy: settings.organizerDefaultRefundPolicy,
      organizerTeamInviteScope: settings.organizerTeamInviteScope as
        | 'OWNER_ONLY'
        | 'OWNER_AND_EDITORS',
      organizerTeamDefaultPermission:
        settings.organizerTeamDefaultPermission as 'EDIT' | 'SCAN',
      organizerTeamRequireRemovalConfirm:
        settings.organizerTeamRequireRemovalConfirm,
      profilePublic: settings.profilePublic,
      defaultPostVisibility: settings.defaultPostVisibility as
        | 'public'
        | 'friends'
        | 'private',
      allowOutingInvitesFrom: settings.allowOutingInvitesFrom as
        | 'everyone'
        | 'connections'
        | 'nobody',
      theme: settings.theme as 'light' | 'dark' | 'system',
      language: settings.language as 'fr' | 'en',
      dataSaver: settings.dataSaver,
    };
  }

  private async getOrCreateSettings(userId: string) {
    const existingSettings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (existingSettings) {
      return existingSettings;
    }

    return this.prisma.userSettings.create({
      data: {
        userId,
      },
    });
  }

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

  async findAllAdmin() {
    const now = new Date();
    const users = await this.prisma.user.findMany({
      include: {
        UserRole: { include: { Role: true } },
        OrganizerProfile: true,
        Session: {
          select: {
            id: true,
            lastUsedAt: true,
            createdAt: true,
            expiresAt: true,
            revokedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      ...this.sanitizeUser(user),
      role: user.UserRole[0]?.Role?.name || 'USER',
      isSuspended: user.isSuspended,
      lastLoginAt: user.lastLoginAt,
      updatedAt: user.updatedAt,
      organizerStatus: user.OrganizerProfile?.status || null,
      organizerAccountType: user.OrganizerProfile?.accountType || null,
      organizerCompanyName: user.OrganizerProfile?.companyName || null,
      sessionCount: user.Session.filter(
        (session) =>
          !session.revokedAt &&
          (!session.expiresAt || session.expiresAt.getTime() > now.getTime()),
      ).length,
      lastActiveAt: (() => {
        const sessionDates = user.Session.map((session) =>
          session.lastUsedAt || session.createdAt,
        ).filter((date): date is Date => Boolean(date));
        sessionDates.sort((a, b) => b.getTime() - a.getTime());
        return user.lastLoginAt || sessionDates[0] || null;
      })(),
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        OrganizerProfile: true,
        UserRole: { include: { Role: true } },
        Session: {
          select: {
            id: true,
            device: true,
            createdAt: true,
            lastUsedAt: true,
            expiresAt: true,
            revokedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
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

  async listAdminSessions(userId: string): Promise<AdminUserSessionResponse[]> {
    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        device: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    return sessions.map((session) => ({
      ...session,
      isActive:
        !session.revokedAt &&
        (!session.expiresAt || session.expiresAt.getTime() > now.getTime()),
    }));
  }

  async revokeAdminSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        refreshTokenHash: null,
      },
    });

    return {
      success: true,
      id: session.id,
    };
  }

  async revokeAllAdminSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        refreshTokenHash: null,
      },
    });

    return {
      success: true,
    };
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
        UserSettings: {
          select: {
            profilePublic: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    if (user.UserSettings && user.UserSettings.profilePublic === false) {
      return null;
    }

    const role = user.UserRole[0]?.Role?.name || 'USER';

    return {
      ...user,
      role,
    };
  }

  async findOneByEmail(email: string) {
    const normalizedEmail = email.replace(/\s+/g, '').toLowerCase();

    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
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

  async listOrganizerProfiles() {
    const users = await this.prisma.user.findMany({
      where: {
        OrganizerProfile: {
          isNot: null,
        },
      },
      include: {
        OrganizerProfile: true,
        UserRole: { include: { Role: true } },
        OwnedPlaces: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      role: user.UserRole[0]?.Role?.name || 'USER',
      organizer: user.OrganizerProfile
        ? {
            accountType: user.OrganizerProfile.accountType,
            companyName: user.OrganizerProfile.companyName,
            status: user.OrganizerProfile.status,
            jobTitle: user.OrganizerProfile.jobTitle,
            createdAt: user.OrganizerProfile.createdAt,
          }
        : null,
      placesCount: user.OwnedPlaces.length,
    }));
  }

  async updateOrganizerStatus(userId: string, status: string) {
    const normalized = status.toUpperCase();
    if (
      !['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(normalized)
    ) {
      throw new BadRequestException('Statut organisateur invalide.');
    }

    return this.prisma.organizerProfile.update({
      where: { userId },
      data: { status: normalized },
    });
  }

  async activateProProfile(userId: string, activateDto: ActivateProProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        OrganizerProfile: true,
        UserRole: {
          include: {
            Role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const targetRoleName =
      activateDto.accountType === 'PLACE' ? 'PLACE_OWNER' : 'ORGANIZER';
    const targetRole = await this.prisma.role.findUnique({
      where: { name: targetRoleName },
    });

    if (!targetRole) {
      throw new NotFoundException(`Role '${targetRoleName}' introuvable.`);
    }

    const currentRoleName = user.UserRole[0]?.Role?.name || 'USER';
    const alreadyActive =
      currentRoleName === targetRoleName &&
      user.OrganizerProfile?.status === 'APPROVED';

    if (alreadyActive) {
      throw new BadRequestException('Votre espace pro est deja actif.');
    }

    const organizerData = {
      accountType: activateDto.accountType,
      companyName: activateDto.companyName,
      ifuNumber: activateDto.ifuNumber,
      payoutInfo: activateDto.payoutInfo,
      jobTitle: activateDto.jobTitle,
      instagramUrl: activateDto.instagramUrl || null,
      tiktokUrl: activateDto.tiktokUrl || null,
      facebookUrl: activateDto.facebookUrl || null,
      xUrl: activateDto.xUrl || null,
      websiteUrl: activateDto.websiteUrl || null,
      status: 'PENDING',
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId },
      });

      await tx.userRole.create({
        data: {
          userId,
          roleId: targetRole.id,
        },
      });

      if (user.OrganizerProfile) {
        await tx.organizerProfile.update({
          where: { userId },
          data: organizerData,
        });
      } else {
        await tx.organizerProfile.create({
          data: {
            userId,
            ...organizerData,
          },
        });
      }
    });

    const updated = await this.findOne(userId);
    return {
      ...updated,
      role: targetRoleName,
      organizerStatus: 'PENDING',
      organizerAccountType: activateDto.accountType,
      organizerCompanyName: activateDto.companyName,
    };
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

  async getSettings(userId: string): Promise<UserSettingsResponse> {
    const settings = await this.getOrCreateSettings(userId);
    return this.mapSettings(settings);
  }

  async updateSettings(
    userId: string,
    updateUserSettingsDto: UpdateUserSettingsDto,
  ): Promise<UserSettingsResponse> {
    await this.getOrCreateSettings(userId);

    const updatePayload: UpdateUserSettingsDto = { ...updateUserSettingsDto };
    const reminderOffsetsInput = Array.isArray(
      updatePayload.organizerReminderOffsetsMin,
    )
      ? updatePayload.organizerReminderOffsetsMin
      : undefined;
    const normalizedReminderOffsets = reminderOffsetsInput
      ? this.normalizeReminderOffsets(reminderOffsetsInput)
      : undefined;

    if (normalizedReminderOffsets) {
      updatePayload.organizerReminderOffsetsMin = normalizedReminderOffsets;
    }

    if (
      updatePayload.organizerReminderMode === 'custom' &&
      normalizedReminderOffsets &&
      normalizedReminderOffsets.length === 0
    ) {
      updatePayload.organizerReminderMode = 'preset';
    }

    const settings = await this.prisma.userSettings.update({
      where: { userId },
      data: updatePayload,
    });

    return this.mapSettings(settings);
  }
}
