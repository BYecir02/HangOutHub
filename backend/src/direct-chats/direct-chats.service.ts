import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DirectChatsGateway } from './direct-chats.gateway';
import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { UpdateDirectMessageDto } from './dto/update-direct-message.dto';

const userSummarySelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
});

const directMessageInclude = Prisma.validator<Prisma.DirectMessageInclude>()({
  User: { select: userSummarySelect },
  Reactions: {
    select: {
      messageId: true,
      userId: true,
      emoji: true,
    },
  },
});

type ConversationMembership = {
  id: string;
  userOneId: string;
  userTwoId: string;
};

@Injectable()
export class DirectChatsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private directChatsGateway: DirectChatsGateway,
  ) {}

  private normalizePair(userId: string, otherUserId: string) {
    return userId < otherUserId
      ? { userOneId: userId, userTwoId: otherUserId }
      : { userOneId: otherUserId, userTwoId: userId };
  }

  private async assertConnected(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas discuter avec vous-meme.',
      );
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
      UserOne: {
        id: string;
        username: string | null;
        displayName: string | null;
        avatarUrl: string | null;
      };
      UserTwo: {
        id: string;
        username: string | null;
        displayName: string | null;
        avatarUrl: string | null;
      };
    },
    userId: string,
  ) {
    return conversation.userOneId === userId
      ? conversation.UserTwo
      : conversation.UserOne;
  }

  private async assertMember(
    userId: string,
    conversationId: string,
  ): Promise<ConversationMembership> {
    const conversation = (await this.prisma.directConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userOneId: true, userTwoId: true },
    })) as ConversationMembership | null;

    if (!conversation) {
      throw new NotFoundException('Discussion introuvable.');
    }

    if (
      conversation.userOneId !== userId &&
      conversation.userTwoId !== userId
    ) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a acceder a cette discussion.",
      );
    }

    return conversation;
  }

  private resolvePartnerId(
    conversation: { userOneId: string; userTwoId: string },
    userId: string,
  ) {
    return conversation.userOneId === userId
      ? conversation.userTwoId
      : conversation.userOneId;
  }

  private async assertReplyTarget(
    conversationId: string,
    replyToMessageId?: string | null,
  ) {
    if (!replyToMessageId) {
      return null;
    }

    const replyTarget = await this.prisma.directMessage.findFirst({
      where: {
        id: replyToMessageId,
        conversationId,
      },
      select: { id: true },
    });

    if (!replyTarget) {
      throw new NotFoundException('Message de reponse introuvable.');
    }

    return replyTarget.id;
  }

  private async assertSharedPost(sharedPostId?: string | null) {
    if (!sharedPostId) {
      return null;
    }

    const post = await this.prisma.post.findUnique({
      where: { id: sharedPostId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post introuvable pour ce partage.');
    }

    return post.id;
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
          include: directMessageInclude,
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

    return conversations
      .map((conversation) => ({
        id: conversation.id,
        partner: this.mapPartner(conversation, userId),
        lastMessage: conversation.DirectMessage[0] ?? null,
        messagesCount: conversation._count.DirectMessage,
        unreadCount: unreadCounts.get(conversation.id) || 0,
        lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
      }))
      .sort((left, right) => {
        const leftTime = new Date(left.lastMessageAt || 0).getTime();
        const rightTime = new Date(right.lastMessageAt || 0).getTime();
        return rightTime - leftTime;
      });
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

    if (
      conversation.userOneId !== userId &&
      conversation.userTwoId !== userId
    ) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a acceder a cette discussion.",
      );
    }

    return {
      id: conversation.id,
      partner: this.mapPartner(conversation, userId),
    };
  }

  async findMessages(
    userId: string,
    conversationId: string,
    options?: { beforeMessageId?: string; limit?: number },
  ) {
    await this.assertMember(userId, conversationId);
    const readAt = await this.touchReadAt(userId, conversationId);
    this.directChatsGateway.emitReadUpdated(conversationId, userId, readAt);

    const take = Math.min(Math.max(options?.limit || 40, 1), 100);
    const where: Prisma.DirectMessageWhereInput = { conversationId };

    if (options?.beforeMessageId) {
      const beforeMessage = await this.prisma.directMessage.findFirst({
        where: {
          id: options.beforeMessageId,
          conversationId,
        },
        select: { id: true, sentAt: true },
      });

      if (!beforeMessage) {
        throw new NotFoundException('Message de pagination introuvable.');
      }

      where.OR = [
        {
          sentAt: {
            lt: beforeMessage.sentAt || new Date(),
          },
        },
        {
          AND: [
            {
              sentAt: beforeMessage.sentAt || new Date(),
            },
            {
              id: {
                lt: beforeMessage.id,
              },
            },
          ],
        },
      ];
    }

    const rows = await this.prisma.directMessage.findMany({
      where,
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      include: directMessageInclude,
    });

    const hasMore = rows.length > take;
    const pageRows = hasMore ? rows.slice(0, take) : rows;
    const items = [...pageRows].reverse();
    const nextCursor = hasMore ? items[0]?.id || null : null;

    return {
      items,
      hasMore,
      nextCursor,
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    payload: CreateDirectMessageDto,
    files: Express.Multer.File[] = [],
  ) {
    const conversation = await this.assertMember(userId, conversationId);

    const content = payload.content?.trim() || '';
    const clientId = payload.clientId?.trim() || null;

    if (clientId) {
      const existing = await this.prisma.directMessage.findFirst({
        where: {
          conversationId,
          senderId: userId,
          clientId,
        },
        include: directMessageInclude,
      });

      if (existing) {
        return existing;
      }
    }

    const replyToMessageId = await this.assertReplyTarget(
      conversationId,
      payload.replyToMessageId,
    );
    const sharedPostId = await this.assertSharedPost(payload.sharedPostId);
    const images =
      files.length > 0
        ? await this.storageService.uploadFiles('direct-messages', files)
        : [];
    if (!content && images.length === 0) {
      throw new ForbiddenException('Message vide.');
    }

    const recipientUserId = this.resolvePartnerId(conversation, userId);
    const recipientActiveInConversation =
      this.directChatsGateway.isUserInConversation(
        recipientUserId,
        conversationId,
      );
    const deliveredAt = recipientActiveInConversation ? new Date() : null;

    const message = await this.prisma.directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        clientId,
        content,
        images,
        replyToMessageId,
        sharedPostId,
        deliveredAt,
      },
      include: directMessageInclude,
    });

    await this.prisma.directConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.sentAt || new Date(),
        ...(await this.getReadUpdatePayload(
          userId,
          conversationId,
          new Date(),
        )),
      },
    });

    this.directChatsGateway.emitMessageCreated(conversationId, message);
    this.directChatsGateway.emitChatListUpdated(
      [userId, recipientUserId],
      conversationId,
    );

    return message;
  }

  async updateMessage(
    userId: string,
    conversationId: string,
    messageId: string,
    payload: UpdateDirectMessageDto,
  ) {
    const conversation = await this.assertMember(userId, conversationId);

    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        conversationId: true,
        isDeleted: true,
        replyToMessageId: true,
        sharedPostId: true,
      },
    });

    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException('Message introuvable.');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier ce message.');
    }

    if (message.isDeleted) {
      throw new ForbiddenException('Ce message a deja ete supprime.');
    }

    const content = payload.content?.trim() || '';
    if (!content) {
      throw new ForbiddenException('Message vide.');
    }

    const hasReplyToUpdate = Object.hasOwn(payload, 'replyToMessageId');
    const hasSharedPostUpdate = Object.hasOwn(payload, 'sharedPostId');

    const replyToMessageId = hasReplyToUpdate
      ? await this.assertReplyTarget(conversationId, payload.replyToMessageId)
      : message.replyToMessageId;
    const sharedPostId = hasSharedPostUpdate
      ? await this.assertSharedPost(payload.sharedPostId)
      : message.sharedPostId;

    if (replyToMessageId && replyToMessageId === messageId) {
      throw new ForbiddenException(
        'Un message ne peut pas repondre a lui-meme.',
      );
    }

    const updated = await this.prisma.directMessage.update({
      where: { id: messageId },
      data: {
        content,
        replyToMessageId,
        sharedPostId,
        editedAt: new Date(),
      },
      include: directMessageInclude,
    });

    this.directChatsGateway.emitMessageUpdated(conversationId, updated);
    this.directChatsGateway.emitChatListUpdated(
      [conversation.userOneId, conversation.userTwoId],
      conversationId,
    );
    return updated;
  }

  async deleteMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ) {
    const conversation = await this.assertMember(userId, conversationId);

    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        conversationId: true,
        isDeleted: true,
      },
    });

    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException('Message introuvable.');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce message.');
    }

    if (message.isDeleted) {
      return this.prisma.directMessage.findUnique({
        where: { id: messageId },
        include: directMessageInclude,
      });
    }

    await this.prisma.directMessage.update({
      where: { id: messageId },
      data: {
        content: '',
        images: [],
        replyToMessageId: null,
        sharedPostId: null,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await this.prisma.directMessageReaction.deleteMany({
      where: { messageId },
    });

    const deleted = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      include: directMessageInclude,
    });

    if (!deleted) {
      throw new NotFoundException('Message introuvable.');
    }

    this.directChatsGateway.emitMessageUpdated(conversationId, deleted);
    this.directChatsGateway.emitChatListUpdated(
      [conversation.userOneId, conversation.userTwoId],
      conversationId,
    );
    return deleted;
  }

  async markRead(userId: string, conversationId: string) {
    const conversation = await this.assertMember(userId, conversationId);
    const readAt = await this.touchReadAt(userId, conversationId);
    this.directChatsGateway.emitReadUpdated(conversationId, userId, readAt);
    this.directChatsGateway.emitChatListUpdated(
      [conversation.userOneId, conversation.userTwoId],
      conversationId,
    );
    return { success: true };
  }

  async addReaction(
    userId: string,
    conversationId: string,
    messageId: string,
    emoji: string,
  ) {
    await this.assertMember(userId, conversationId);

    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji) {
      throw new BadRequestException('Emoji invalide.');
    }

    const message = await this.prisma.directMessage.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
      select: {
        id: true,
        isDeleted: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message introuvable.');
    }

    if (message.isDeleted) {
      throw new ForbiddenException(
        'Reaction impossible sur un message supprime.',
      );
    }

    const reaction = await this.prisma.directMessageReaction.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: {
        emoji: trimmedEmoji,
      },
      create: {
        messageId,
        userId,
        emoji: trimmedEmoji,
      },
    });

    this.directChatsGateway.emitReactionUpdated(conversationId, {
      messageId,
      userId,
      emoji: reaction.emoji,
    });

    return reaction;
  }

  async removeReaction(
    userId: string,
    conversationId: string,
    messageId: string,
  ) {
    await this.assertMember(userId, conversationId);

    const message = await this.prisma.directMessage.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
      select: { id: true },
    });

    if (!message) {
      throw new NotFoundException('Message introuvable.');
    }

    await this.prisma.directMessageReaction.deleteMany({
      where: {
        messageId,
        userId,
      },
    });

    this.directChatsGateway.emitReactionUpdated(conversationId, {
      messageId,
      userId,
      emoji: null,
    });

    return { success: true };
  }

  private async touchReadAt(userId: string, conversationId: string) {
    const now = new Date();
    const payload = await this.getReadUpdatePayload(
      userId,
      conversationId,
      now,
    );
    await this.prisma.directConversation.update({
      where: { id: conversationId },
      data: payload,
    });

    await this.prisma.directMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        deliveredAt: null,
      },
      data: {
        deliveredAt: now,
      },
    });

    await this.prisma.directMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: now,
      },
    });

    return now;
  }

  private async getReadUpdatePayload(
    userId: string,
    conversationId: string,
    at: Date,
  ) {
    const conversation = await this.prisma.directConversation.findUnique({
      where: { id: conversationId },
      select: { userOneId: true, userTwoId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Discussion introuvable.');
    }

    return conversation.userOneId === userId
      ? { userOneLastReadAt: at }
      : { userTwoLastReadAt: at };
  }
}
