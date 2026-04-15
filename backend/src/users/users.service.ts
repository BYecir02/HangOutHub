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
import { EmailService } from '../email/email.service';

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

export interface UserCityPreferencesResponse {
  selectedCityIds: number[];
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

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
    const normalizedEmail = createUserDto.email?.trim().toLowerCase();
    const normalizedUsername = createUserDto.username?.trim();
    const normalizedPhone = createUserDto.phoneNumber?.trim();

    if (!normalizedPhone) {
      throw new BadRequestException('Le numero de telephone est requis.');
    }

    const uniqueChecks: Prisma.UserWhereInput[] = [];

    if (normalizedEmail) {
      uniqueChecks.push({
        email: { equals: normalizedEmail, mode: 'insensitive' },
      });
    }

    if (normalizedUsername) {
      uniqueChecks.push({
        username: { equals: normalizedUsername, mode: 'insensitive' },
      });
    }

    uniqueChecks.push({ phoneNumber: normalizedPhone });

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: uniqueChecks,
      },
      select: {
        email: true,
        phoneNumber: true,
        username: true,
      },
    });

    if (existingUser) {
      const conflicts: string[] = [];

      if (
        normalizedEmail &&
        existingUser.email &&
        existingUser.email.toLowerCase() === normalizedEmail
      ) {
        conflicts.push('email');
      }

      if (
        normalizedUsername &&
        existingUser.username &&
        existingUser.username.toLowerCase() === normalizedUsername.toLowerCase()
      ) {
        conflicts.push('pseudo');
      }

      if (existingUser.phoneNumber === normalizedPhone) {
        conflicts.push('telephone');
      }

      const message =
        conflicts.length > 0
          ? `Un utilisateur avec ce ${conflicts.join(', ')} existe deja.`
          : 'Un utilisateur avec cet email, telephone ou pseudo existe deja.';

      throw new ConflictException(message);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const userData: Omit<CreateUserDto, 'password'> = {
      username: normalizedUsername || createUserDto.username,
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
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
        UserCityInterest: {
          select: {
            cityId: true,
          },
        },
        UserTagInterest: {
          select: {
            tagId: true,
          },
        },
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
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const uniqueIds = (values: string[]) => Array.from(new Set(values));

    await this.prisma.$transaction(async (tx) => {
      const ownedPlaces = await tx.place.findMany({
        where: { ownerId: id },
        select: { id: true },
      });
      const placeIds = ownedPlaces.map((place) => place.id);

      const events = await tx.event.findMany({
        where: placeIds.length
          ? { OR: [{ organizerId: id }, { placeId: { in: placeIds } }] }
          : { organizerId: id },
        select: { id: true },
      });
      const eventIds = events.map((event) => event.id);

      const outings = await tx.outing.findMany({
        where: placeIds.length
          ? { OR: [{ creatorId: id }, { placeId: { in: placeIds } }] }
          : { creatorId: id },
        select: { id: true },
      });
      const outingIds = outings.map((outing) => outing.id);

      const posts = await tx.post.findMany({
        where: {
          OR: [
            { userId: id },
            ...(placeIds.length ? [{ placeId: { in: placeIds } }] : []),
            ...(eventIds.length ? [{ eventId: { in: eventIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const postIds = posts.map((post) => post.id);

      const stories = await tx.story.findMany({
        where: {
          OR: [
            { userId: id },
            ...(placeIds.length ? [{ placeId: { in: placeIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const storyIds = stories.map((story) => story.id);

      const reviews = await tx.review.findMany({
        where: {
          OR: [
            { userId: id },
            ...(placeIds.length ? [{ placeId: { in: placeIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const reviewIds = reviews.map((review) => review.id);

      const conversations = await tx.directConversation.findMany({
        where: { OR: [{ userOneId: id }, { userTwoId: id }] },
        select: { id: true },
      });
      const conversationIds = conversations.map((conversation) => conversation.id);

      const outingMedias = outingIds.length
        ? await tx.outingMedia.findMany({
            where: { outingId: { in: outingIds } },
            select: { id: true },
          })
        : [];
      const outingMediaIds = outingMedias.map((media) => media.id);

      const bookings = await tx.booking.findMany({
        where: {
          OR: [
            { userId: id },
            ...(eventIds.length ? [{ eventId: { in: eventIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const bookingIds = bookings.map((booking) => booking.id);

      const uniqueEventIds = uniqueIds(eventIds);
      const uniqueOutingIds = uniqueIds(outingIds);
      const uniquePostIds = uniqueIds(postIds);
      const uniqueStoryIds = uniqueIds(storyIds);
      const uniqueReviewIds = uniqueIds(reviewIds);
      const uniquePlaceIds = uniqueIds(placeIds);
      const uniqueBookingIds = uniqueIds(bookingIds);
      const uniqueConversationIds = uniqueIds(conversationIds);
      const uniqueOutingMediaIds = uniqueIds(outingMediaIds);

      await tx.notification.deleteMany({
        where: { OR: [{ userId: id }, { actorId: id }] },
      });
      await tx.friendship.deleteMany({
        where: { OR: [{ requesterId: id }, { receiverId: id }] },
      });
      await tx.userFlowEvent.deleteMany({ where: { userId: id } });

      await tx.directMessageReaction.deleteMany({ where: { userId: id } });
      if (uniqueConversationIds.length) {
        await tx.directConversation.deleteMany({
          where: { id: { in: uniqueConversationIds } },
        });
      }

      await tx.postShareEvent.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniquePostIds.length ? [{ postId: { in: uniquePostIds } }] : []),
          ],
        },
      });
      await tx.postLike.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniquePostIds.length ? [{ postId: { in: uniquePostIds } }] : []),
          ],
        },
      });
      await tx.postComment.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniquePostIds.length ? [{ postId: { in: uniquePostIds } }] : []),
          ],
        },
      });
      if (uniquePostIds.length) {
        await tx.post.deleteMany({ where: { id: { in: uniquePostIds } } });
      }

      await tx.storyLike.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniqueStoryIds.length ? [{ storyId: { in: uniqueStoryIds } }] : []),
          ],
        },
      });
      await tx.storyView.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniqueStoryIds.length ? [{ storyId: { in: uniqueStoryIds } }] : []),
          ],
        },
      });
      if (uniqueStoryIds.length) {
        await tx.story.deleteMany({ where: { id: { in: uniqueStoryIds } } });
      }

      await tx.reviewLike.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniqueReviewIds.length ? [{ reviewId: { in: uniqueReviewIds } }] : []),
          ],
        },
      });
      await tx.reviewComment.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniqueReviewIds.length ? [{ reviewId: { in: uniqueReviewIds } }] : []),
          ],
        },
      });
      if (uniqueReviewIds.length) {
        await tx.review.deleteMany({ where: { id: { in: uniqueReviewIds } } });
      }

      await tx.outingMediaLike.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniqueOutingMediaIds.length
              ? [{ mediaId: { in: uniqueOutingMediaIds } }]
              : []),
          ],
        },
      });
      await tx.outingMediaComment.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniqueOutingMediaIds.length
              ? [{ mediaId: { in: uniqueOutingMediaIds } }]
              : []),
          ],
        },
      });
      if (uniqueOutingMediaIds.length) {
        await tx.outingMedia.deleteMany({
          where: { id: { in: uniqueOutingMediaIds } },
        });
      }
      await tx.chatMessage.deleteMany({
        where: {
          OR: [
            { senderId: id },
            ...(uniqueOutingIds.length ? [{ outingId: { in: uniqueOutingIds } }] : []),
          ],
        },
      });
      await tx.outingParticipant.deleteMany({
        where: {
          OR: [
            { userId: id },
            ...(uniqueOutingIds.length ? [{ outingId: { in: uniqueOutingIds } }] : []),
          ],
        },
      });
      if (uniqueOutingIds.length) {
        await tx.outing.deleteMany({ where: { id: { in: uniqueOutingIds } } });
      }

      if (uniqueBookingIds.length) {
        await tx.payment.deleteMany({
          where: { bookingId: { in: uniqueBookingIds } },
        });
        await tx.booking.deleteMany({
          where: { id: { in: uniqueBookingIds } },
        });
      }

      if (uniqueEventIds.length) {
        await tx.ticketType.deleteMany({
          where: { eventId: { in: uniqueEventIds } },
        });
        await tx.eventTag.deleteMany({
          where: { eventId: { in: uniqueEventIds } },
        });
        await tx.eventCollaborator.deleteMany({
          where: {
            OR: [
              { userId: id },
              { eventId: { in: uniqueEventIds } },
            ],
          },
        });
        await tx.eventRevision.deleteMany({
          where: { eventId: { in: uniqueEventIds } },
        });
        await tx.promotion.deleteMany({
          where: {
            OR: [
              { eventId: { in: uniqueEventIds } },
              ...(uniquePlaceIds.length ? [{ placeId: { in: uniquePlaceIds } }] : []),
            ],
          },
        });
        await tx.event.deleteMany({ where: { id: { in: uniqueEventIds } } });
      }

      if (uniquePlaceIds.length) {
        await tx.placeTag.deleteMany({
          where: { placeId: { in: uniquePlaceIds } },
        });
        await tx.placeTeamMember.deleteMany({
          where: {
            OR: [
              { userId: id },
              { placeId: { in: uniquePlaceIds } },
            ],
          },
        });
        await tx.placeClaim.deleteMany({
          where: {
            OR: [
              { userId: id },
              { placeId: { in: uniquePlaceIds } },
            ],
          },
        });
        await tx.savedPlace.deleteMany({
          where: {
            OR: [
              { userId: id },
              { placeId: { in: uniquePlaceIds } },
            ],
          },
        });
        await tx.subscription.deleteMany({
          where: { placeId: { in: uniquePlaceIds } },
        });
        await tx.place.deleteMany({ where: { id: { in: uniquePlaceIds } } });
      }

      await tx.deviceToken.deleteMany({ where: { userId: id } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.emailVerificationToken.deleteMany({ where: { userId: id } });
      await tx.organizerProfile.deleteMany({ where: { userId: id } });
      await tx.userSettings.deleteMany({ where: { userId: id } });
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userCityInterest.deleteMany({ where: { userId: id } });
      await tx.userTagInterest.deleteMany({ where: { userId: id } });

      await tx.report.updateMany({
        where: { resolvedByUserId: id },
        data: { resolvedByUserId: null },
      });

      await tx.user.delete({ where: { id } });
    });

    return { success: true, mode: 'deleted' as const };
  }

  async update(id: string, updateUserDto: Prisma.UserUpdateInput) {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    return this.sanitizeUser(user);
  }

  async approveOrganizer(userId: string) {
    return this.updateOrganizerStatus(userId, 'APPROVED');
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

    const organizer = await this.prisma.organizerProfile.update({
      where: { userId },
      data: { status: normalized },
      include: {
        User: {
          select: {
            email: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    await this.sendOrganizerStatusEmail(organizer.User, {
      status: normalized,
      companyName: organizer.companyName,
      accountType: organizer.accountType,
    });

    return organizer;
  }

  private async sendOrganizerStatusEmail(
    user: { email: string | null; username: string | null; displayName: string | null } | null,
    payload: { status: string; companyName?: string | null; accountType?: string | null },
  ) {
    if (!user?.email) {
      return;
    }

    const name = user.displayName || user.username || 'la';
    const company = payload.companyName ? ` (${payload.companyName})` : '';

    let subject = '';
    let message = '';

    if (payload.status === 'APPROVED') {
      subject = 'Ton compte pro est approuve';
      message =
        `Bonne nouvelle ${name}, ton compte pro${company} a ete approuve. ` +
        "Tu peux maintenant acceder a l'espace organisateur.";
    } else if (payload.status === 'REJECTED') {
      subject = 'Ton compte pro a ete refuse';
      message =
        `Bonjour ${name}, ton compte pro${company} a ete refuse. ` +
        "Tu peux contacter l'equipe si tu veux plus de details.";
    } else if (payload.status === 'SUSPENDED') {
      subject = 'Ton compte pro est suspendu';
      message =
        `Bonjour ${name}, ton compte pro${company} a ete suspendu. ` +
        "Contacte l'equipe si tu as besoin d'aide.";
    } else {
      return;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">${subject}</h2>
        <p>${message}</p>
      </div>
    `;

    await this.emailService.sendEmail({
      toEmail: user.email,
      toName: user.username || user.displayName || undefined,
      subject,
      html,
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

  async updateCityPreferences(
    userId: string,
    cityIds: number[],
  ): Promise<UserCityPreferencesResponse> {
    const uniqueCityIds = Array.from(new Set(cityIds));

    if (uniqueCityIds.length > 0) {
      const existingCities = await this.prisma.city.findMany({
        where: {
          id: {
            in: uniqueCityIds,
          },
        },
        select: { id: true },
      });

      if (existingCities.length !== uniqueCityIds.length) {
        throw new NotFoundException('Certaines villes sont introuvables.');
      }
    }

    await this.prisma.$transaction([
      this.prisma.userCityInterest.deleteMany({
        where: { userId },
      }),
      ...(uniqueCityIds.length > 0
        ? [
            this.prisma.userCityInterest.createMany({
              data: uniqueCityIds.map((cityId) => ({
                userId,
                cityId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    return {
      selectedCityIds: uniqueCityIds,
    };
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
