import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const userSummarySelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  UserRole: {
    include: {
      Role: true,
    },
  },
});

type UserSummaryRecord = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;

type FriendshipWithUsers = Prisma.FriendshipGetPayload<{
  include: {
    User_Friendship_requesterIdToUser: {
      select: typeof userSummarySelect;
    };
    User_Friendship_receiverIdToUser: {
      select: typeof userSummarySelect;
    };
  };
}>;

@Injectable()
export class FriendshipsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapUserSummary(user: UserSummaryRecord) {
    const primaryRole = user.UserRole[0]?.Role?.name || 'USER';

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: primaryRole,
    };
  }

  private mapPartner(friendship: FriendshipWithUsers, currentUserId: string) {
    const partner =
      friendship.requesterId === currentUserId
        ? friendship.User_Friendship_receiverIdToUser
        : friendship.User_Friendship_requesterIdToUser;

    return {
      friendshipId: friendship.id,
      status: friendship.status || 'PENDING',
      user: this.mapUserSummary(partner),
    };
  }

  private async findRelationBetweenUsers(userId: string, targetUserId: string) {
    return this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId: userId,
            receiverId: targetUserId,
          },
          {
            requesterId: targetUserId,
            receiverId: userId,
          },
        ],
      },
    });
  }

  async findMine(userId: string) {
    const [connections, incomingRequests, outgoingRequests] = await Promise.all(
      [
        this.prisma.friendship.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: userId }, { receiverId: userId }],
          },
          orderBy: { createdAt: 'desc' },
          include: {
            User_Friendship_requesterIdToUser: {
              select: userSummarySelect,
            },
            User_Friendship_receiverIdToUser: {
              select: userSummarySelect,
            },
          },
        }),
        this.prisma.friendship.findMany({
          where: {
            status: 'PENDING',
            receiverId: userId,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            User_Friendship_requesterIdToUser: {
              select: userSummarySelect,
            },
            User_Friendship_receiverIdToUser: {
              select: userSummarySelect,
            },
          },
        }),
        this.prisma.friendship.findMany({
          where: {
            status: 'PENDING',
            requesterId: userId,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            User_Friendship_requesterIdToUser: {
              select: userSummarySelect,
            },
            User_Friendship_receiverIdToUser: {
              select: userSummarySelect,
            },
          },
        }),
      ],
    );

    return {
      counts: {
        connections: connections.length,
        incomingRequests: incomingRequests.length,
        outgoingRequests: outgoingRequests.length,
      },
      connections: connections.map((item) => this.mapPartner(item, userId)),
      incomingRequests: incomingRequests.map((item) =>
        this.mapPartner(item, userId),
      ),
      outgoingRequests: outgoingRequests.map((item) =>
        this.mapPartner(item, userId),
      ),
    };
  }

  async discover(userId: string, query?: string) {
    const normalizedQuery = query?.trim();

    if (!normalizedQuery) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        OR: [
          {
            username: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
          {
            displayName: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 20,
      orderBy: [{ displayName: 'asc' }, { username: 'asc' }],
      select: userSummarySelect,
    });

    if (users.length === 0) {
      return [];
    }

    const relations = await this.prisma.friendship.findMany({
      where: {
        OR: [
          {
            requesterId: userId,
            receiverId: {
              in: users.map((user) => user.id),
            },
          },
          {
            receiverId: userId,
            requesterId: {
              in: users.map((user) => user.id),
            },
          },
        ],
      },
      select: {
        id: true,
        requesterId: true,
        receiverId: true,
        status: true,
      },
    });

    const relationsByUserId = new Map(
      relations.map((relation) => [
        relation.requesterId === userId
          ? relation.receiverId
          : relation.requesterId,
        relation,
      ]),
    );

    return users.map((user) => {
      const relation = relationsByUserId.get(user.id);
      let relationStatus:
        | 'NONE'
        | 'OUTGOING_REQUEST'
        | 'INCOMING_REQUEST'
        | 'CONNECTED' = 'NONE';

      if (relation?.status === 'ACCEPTED') {
        relationStatus = 'CONNECTED';
      } else if (relation?.status === 'PENDING') {
        relationStatus =
          relation.requesterId === userId
            ? 'OUTGOING_REQUEST'
            : 'INCOMING_REQUEST';
      }

      return {
        ...this.mapUserSummary(user),
        relationStatus,
        friendshipId: relation?.id || null,
      };
    });
  }

  async request(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new ConflictException('Vous ne pouvez pas vous ajouter vous-meme.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || targetUser.isActive === false) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const existingRelation = await this.findRelationBetweenUsers(
      userId,
      targetUserId,
    );

    if (existingRelation?.status === 'ACCEPTED') {
      throw new ConflictException('Vous etes deja connectes.');
    }

    if (
      existingRelation?.status === 'PENDING' &&
      existingRelation.requesterId === userId
    ) {
      throw new ConflictException('Demande deja envoyee.');
    }

    if (
      existingRelation?.status === 'PENDING' &&
      existingRelation.receiverId === userId
    ) {
      return this.accept(userId, existingRelation.id);
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        requesterId: userId,
        receiverId: targetUserId,
        status: 'PENDING',
      },
    });

    const receiverSettings = await this.prisma.userSettings.findUnique({
      where: { userId: targetUserId },
      select: { notificationFriendRequests: true },
    });

    if (receiverSettings?.notificationFriendRequests !== false) {
      await this.prisma.notification.create({
        data: {
          userId: targetUserId,
          actorId: userId,
          type: 'FRIEND_REQUEST',
          isRead: false,
        },
      });
    }

    return friendship;
  }

  async accept(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Demande introuvable.');
    }

    if (friendship.receiverId !== userId) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a accepter cette demande.",
      );
    }

    if (friendship.status === 'ACCEPTED') {
      return friendship;
    }

    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: 'ACCEPTED',
      },
    });
  }

  async reject(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Demande introuvable.');
    }

    if (friendship.receiverId !== userId) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a refuser cette demande.",
      );
    }

    return this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  async remove(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Relation introuvable.');
    }

    const isParticipant =
      friendship.requesterId === userId || friendship.receiverId === userId;

    if (!isParticipant) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a modifier cette relation.",
      );
    }

    return this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }
}
