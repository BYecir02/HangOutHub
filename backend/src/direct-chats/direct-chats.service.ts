import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';

const userSummarySelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
});

@Injectable()
export class DirectChatsService {
  constructor(private prisma: PrismaService) {}

  private normalizePair(userId: string, otherUserId: string) {
    return userId < otherUserId
      ? { userOneId: userId, userTwoId: otherUserId }
      : { userOneId: otherUserId, userTwoId: userId };
  }

  private async assertConnected(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new ForbiddenException('Vous ne pouvez pas discuter avec vous-meme.');
    }

    const connection = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, receiverId: otherUserId },
          { requesterId: otherUserId, receiverId: userId },
        ],
      },
      select: { id: true },
    });

    if (!connection) {
      throw new ForbiddenException('Connexion requise pour discuter.');
    }
  }

  private mapPartner(
    conversation: {
      userOneId: string;
      userTwoId: string;
      UserOne: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null };
      UserTwo: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null };
    },
    userId: string,
  ) {
    return conversation.userOneId === userId ? conversation.UserTwo : conversation.UserOne;
  }

  private async assertMember(userId: string, conversationId: string) {
    const conversation = await this.prisma.directConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userOneId: true, userTwoId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Discussion introuvable.');
    }

    if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
      throw new ForbiddenException("Vous n'etes pas autorise a acceder a cette discussion.");
    }

    return conversation;
  }

  async getOrCreateConversation(userId: string, otherUserId: string) {
    await this.assertConnected(userId, otherUserId);
    const { userOneId, userTwoId } = this.normalizePair(userId, otherUserId);

    const existing = await this.prisma.directConversation.findUnique({
      where: {
        userOneId_userTwoId: {
          userOneId,
          userTwoId,
        },
      },
      include: {
        UserOne: { select: userSummarySelect },
        UserTwo: { select: userSummarySelect },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.directConversation.create({
      data: {
        userOneId,
        userTwoId,
      },
      include: {
        UserOne: { select: userSummarySelect },
        UserTwo: { select: userSummarySelect },
      },
    });
  }

  async listChats(userId: string) {
    const conversations = await this.prisma.directConversation.findMany({
      where: {
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      include: {
        UserOne: { select: userSummarySelect },
        UserTwo: { select: userSummarySelect },
        DirectMessage: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          include: {
            User: { select: userSummarySelect },
          },
        },
        _count: {
          select: {
            DirectMessage: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const unreadCounts = new Map<string, number>();

    await Promise.all(
      conversations.map(async (conversation) => {
        const lastReadAt =
          conversation.userOneId === userId
            ? conversation.userOneLastReadAt
            : conversation.userTwoLastReadAt;

        const unreadCount = await this.prisma.directMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            ...(lastReadAt
              ? { OR: [{ sentAt: null }, { sentAt: { gt: lastReadAt } }] }
              : {}),
          },
        });

        unreadCounts.set(conversation.id, unreadCount);
      }),
    );

    return conversations.map((conversation) => ({
      id: conversation.id,
      partner: this.mapPartner(conversation, userId),
      lastMessage: conversation.DirectMessage[0] ?? null,
      messagesCount: conversation._count.DirectMessage,
      unreadCount: unreadCounts.get(conversation.id) || 0,
      lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
    }));
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.directConversation.findUnique({
      where: { id: conversationId },
      include: {
        UserOne: { select: userSummarySelect },
        UserTwo: { select: userSummarySelect },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Discussion introuvable.');
    }

    if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
      throw new ForbiddenException("Vous n'etes pas autorise a acceder a cette discussion.");
    }

    return {
      id: conversation.id,
      partner: this.mapPartner(conversation, userId),
    };
  }

  async findMessages(userId: string, conversationId: string) {
    await this.assertMember(userId, conversationId);
    await this.touchReadAt(userId, conversationId);

    return this.prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
      include: {
        User: { select: userSummarySelect },
      },
    });
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    payload: CreateDirectMessageDto,
  ) {
    await this.assertMember(userId, conversationId);

    const content = payload.content.trim();
    if (!content) {
      throw new ForbiddenException('Message vide.');
    }

    const message = await this.prisma.directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content,
      },
      include: {
        User: { select: userSummarySelect },
      },
    });

    await this.prisma.directConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.sentAt || new Date(),
        ...(await this.getReadUpdatePayload(userId, conversationId)),
      },
    });

    return message;
  }

  async markRead(userId: string, conversationId: string) {
    await this.assertMember(userId, conversationId);
    await this.touchReadAt(userId, conversationId);
    return { success: true };
  }

  private async touchReadAt(userId: string, conversationId: string) {
    const payload = await this.getReadUpdatePayload(userId, conversationId);
    await this.prisma.directConversation.update({
      where: { id: conversationId },
      data: payload,
    });
  }

  private async getReadUpdatePayload(userId: string, conversationId: string) {
    const conversation = await this.prisma.directConversation.findUnique({
      where: { id: conversationId },
      select: { userOneId: true, userTwoId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Discussion introuvable.');
    }

    return conversation.userOneId === userId
      ? { userOneLastReadAt: new Date() }
      : { userTwoLastReadAt: new Date() };
  }
}
