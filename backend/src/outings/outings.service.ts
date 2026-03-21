import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOutingDto } from './dto/create-outing.dto';

@Injectable()
export class OutingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async touchChatReadAt(userId: string, outingId: string) {
    await this.prisma.outingParticipant.updateMany({
      where: {
        outingId,
        userId,
      },
      data: {
        chatLastReadAt: new Date(),
      },
    });
  }

  private async assertChatAccess(userId: string, outingId: string) {
    const outing = await this.prisma.outing.findUnique({
      where: { id: outingId },
      select: {
        id: true,
        creatorId: true,
        OutingParticipant: {
          where: { userId },
          select: { status: true },
          take: 1,
        },
      },
    });

    if (!outing) {
      throw new NotFoundException('Sortie introuvable');
    }

    const participant = outing.OutingParticipant[0];
    const canAccess =
      outing.creatorId === userId ||
      (participant && participant.status !== 'DECLINED');

    if (!canAccess) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a acceder a cette discussion.",
      );
    }
  }

  async findChats(userId: string) {
    const outings = await this.prisma.outing.findMany({
      where: {
        OR: [
          { creatorId: userId },
          {
            OutingParticipant: {
              some: {
                userId,
                status: {
                  not: 'DECLINED',
                },
              },
            },
          },
        ],
      },
      orderBy: { scheduledDate: 'desc' },
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        ChatMessage: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          include: {
            User: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            ChatMessage: true,
            OutingParticipant: true,
          },
        },
        OutingParticipant: {
          where: {
            userId,
          },
          select: {
            chatLastReadAt: true,
          },
          take: 1,
        },
      },
    });

    const unreadCounts = new Map<string, number>();

    await Promise.all(
      outings.map(async (outing) => {
        const lastReadAt = outing.OutingParticipant[0]?.chatLastReadAt;
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            outingId: outing.id,
            senderId: {
              not: userId,
            },
            ...(lastReadAt
              ? {
                  OR: [{ sentAt: null }, { sentAt: { gt: lastReadAt } }],
                }
              : {}),
          },
        });
        unreadCounts.set(outing.id, unreadCount);
      }),
    );

    const chats = outings.map((outing) => ({
      id: outing.id,
      title: outing.title,
      scheduledDate: outing.scheduledDate,
      Place: outing.Place,
      User: outing.User,
      participantsCount: outing._count.OutingParticipant,
      messagesCount: outing._count.ChatMessage,
      unreadCount: unreadCounts.get(outing.id) || 0,
      lastMessage: outing.ChatMessage[0] ?? null,
    }));

    chats.sort((left, right) => {
      const leftActivity = new Date(
        left.lastMessage?.sentAt || left.scheduledDate,
      ).getTime();
      const rightActivity = new Date(
        right.lastMessage?.sentAt || right.scheduledDate,
      ).getTime();

      return rightActivity - leftActivity;
    });

    return chats;
  }

  async findMessages(userId: string, outingId: string) {
    await this.assertChatAccess(userId, outingId);
    await this.touchChatReadAt(userId, outingId);

    return this.prisma.chatMessage.findMany({
      where: { outingId },
      orderBy: { sentAt: 'asc' },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async sendMessage(userId: string, outingId: string, content: string) {
    await this.assertChatAccess(userId, outingId);

    const message = await this.prisma.chatMessage.create({
      data: {
        outingId,
        senderId: userId,
        content,
      },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.touchChatReadAt(userId, outingId);

    return message;
  }

  async markMessagesAsRead(userId: string, outingId: string) {
    await this.assertChatAccess(userId, outingId);
    await this.touchChatReadAt(userId, outingId);

    return {
      success: true,
    };
  }

  async create(userId: string, createOutingDto: CreateOutingDto) {
    const participantIds = Array.from(
      new Set(
        (createOutingDto.participantIds || []).filter(
          (participantId) => participantId !== userId,
        ),
      ),
    );

    if (createOutingDto.placeId) {
      const place = await this.prisma.place.findUnique({
        where: { id: createOutingDto.placeId },
        select: { id: true },
      });

      if (!place) {
        throw new NotFoundException('Lieu introuvable');
      }
    }

    if (participantIds.length > 0) {
      const acceptedConnections = await this.prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [
            {
              requesterId: userId,
              receiverId: {
                in: participantIds,
              },
            },
            {
              receiverId: userId,
              requesterId: {
                in: participantIds,
              },
            },
          ],
        },
        select: {
          requesterId: true,
          receiverId: true,
        },
      });

      const allowedParticipantIds = new Set(
        acceptedConnections.map((connection) =>
          connection.requesterId === userId
            ? connection.receiverId
            : connection.requesterId,
        ),
      );

      if (allowedParticipantIds.size !== participantIds.length) {
        throw new BadRequestException(
          'Certaines invitations sont invalides. Invitez uniquement vos connexions.',
        );
      }
    }

    const outing = await this.prisma.outing.create({
      data: {
        creatorId: userId,
        title: createOutingDto.title,
        scheduledDate: new Date(createOutingDto.scheduledDate),
        placeId: createOutingDto.placeId || null,
        status: 'PLANNED',
        OutingParticipant: {
          create: [
            {
              userId,
              status: 'GOING',
              isAdmin: true,
            },
            ...participantIds.map((participantId) => ({
              userId: participantId,
              status: 'INVITED',
              isAdmin: false,
            })),
          ],
        },
      },
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
            coverUrl: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            OutingParticipant: true,
          },
        },
        OutingParticipant: {
          select: {
            status: true,
            isAdmin: true,
            User: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (participantIds.length > 0) {
      await this.prisma.notification.createMany({
        data: participantIds.map((participantId) => ({
          userId: participantId,
          actorId: userId,
          type: 'OUTING_INVITE',
          isRead: false,
        })),
      });
    }

    return outing;
  }

  findMine(userId: string) {
    return this.prisma.outing.findMany({
      where: { creatorId: userId },
      orderBy: { scheduledDate: 'asc' },
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
            coverUrl: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            OutingParticipant: true,
          },
        },
        OutingParticipant: {
          select: {
            status: true,
            isAdmin: true,
            User: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async findOneForUser(userId: string, outingId: string) {
    const outing = await this.prisma.outing.findUnique({
      where: { id: outingId },
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
            coverUrl: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        OutingParticipant: {
          select: {
            status: true,
            isAdmin: true,
            userId: true,
            User: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!outing) {
      throw new NotFoundException('Sortie introuvable');
    }

    const isAllowed =
      outing.creatorId === userId ||
      outing.OutingParticipant.some(
        (participant) => participant.userId === userId,
      );

    if (!isAllowed) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a consulter cette sortie.",
      );
    }

    return outing;
  }

  async inviteParticipants(
    userId: string,
    outingId: string,
    participantIds: string[],
  ) {
    const outing = await this.prisma.outing.findUnique({
      where: { id: outingId },
      include: {
        OutingParticipant: {
          select: {
            userId: true,
            isAdmin: true,
          },
        },
      },
    });

    if (!outing) {
      throw new NotFoundException('Sortie introuvable');
    }

    const currentParticipant = outing.OutingParticipant.find(
      (participant) => participant.userId === userId,
    );

    if (outing.creatorId !== userId && !currentParticipant?.isAdmin) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a inviter des participants.",
      );
    }

    const existingParticipantIds = new Set(
      outing.OutingParticipant.map((participant) => participant.userId),
    );

    const uniqueIds = Array.from(
      new Set(
        participantIds.filter(
          (participantId) =>
            participantId !== userId &&
            !existingParticipantIds.has(participantId),
        ),
      ),
    );

    if (uniqueIds.length === 0) {
      return this.findOneForUser(userId, outingId);
    }

    const acceptedConnections = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          {
            requesterId: userId,
            receiverId: {
              in: uniqueIds,
            },
          },
          {
            receiverId: userId,
            requesterId: {
              in: uniqueIds,
            },
          },
        ],
      },
      select: {
        requesterId: true,
        receiverId: true,
      },
    });

    const allowedParticipantIds = new Set(
      acceptedConnections.map((connection) =>
        connection.requesterId === userId
          ? connection.receiverId
          : connection.requesterId,
      ),
    );

    if (allowedParticipantIds.size !== uniqueIds.length) {
      throw new BadRequestException(
        'Certaines invitations sont invalides. Invitez uniquement vos connexions.',
      );
    }

    await this.prisma.outingParticipant.createMany({
      data: uniqueIds.map((participantId) => ({
        outingId,
        userId: participantId,
        status: 'INVITED',
        isAdmin: false,
      })),
      skipDuplicates: true,
    });

    await this.prisma.notification.createMany({
      data: uniqueIds.map((participantId) => ({
        userId: participantId,
        actorId: userId,
        type: 'OUTING_INVITE',
        isRead: false,
      })),
    });

    return this.findOneForUser(userId, outingId);
  }

  findInvitations(userId: string) {
    return this.prisma.outing.findMany({
      where: {
        OutingParticipant: {
          some: {
            userId,
            isAdmin: false,
            status: 'INVITED',
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
      include: {
        Place: {
          select: {
            id: true,
            name: true,
            address: true,
            coverUrl: true,
            City: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async respondToInvitation(
    userId: string,
    outingId: string,
    status: 'GOING' | 'MAYBE' | 'DECLINED',
  ) {
    const participant = await this.prisma.outingParticipant.findUnique({
      where: {
        outingId_userId: {
          outingId,
          userId,
        },
      },
      include: {
        Outing: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!participant || !participant.Outing) {
      throw new NotFoundException('Invitation introuvable.');
    }

    if (participant.isAdmin) {
      throw new BadRequestException(
        'Le createur de la sortie ne peut pas repondre a une invitation.',
      );
    }

    return this.prisma.outingParticipant.update({
      where: {
        outingId_userId: {
          outingId,
          userId,
        },
      },
      data: {
        status,
      },
    });
  }
}
