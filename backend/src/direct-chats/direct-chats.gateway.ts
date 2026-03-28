import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { PrismaService } from '../prisma/prisma.service';

type AuthPayload = {
  sub: string;
  sid?: string;
  type?: 'access' | 'refresh';
};

type ConversationJoinPayload = {
  conversationId?: string;
};

type TypingPayload = {
  conversationId?: string;
  isTyping?: boolean;
};

type ReactionPayload = {
  messageId: string;
  userId: string;
  emoji: string | null;
};

@WebSocketGateway({
  namespace: '/direct-chats',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class DirectChatsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DirectChatsGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<AuthPayload>(token);
      if (!payload.sub || (payload.type && payload.type !== 'access')) {
        client.disconnect(true);
        return;
      }

      const sessionValid = await this.validateSession(payload, token);
      if (!sessionValid) {
        client.disconnect(true);
        return;
      }

      const userId = payload.sub;
      client.data.userId = userId;
      client.join(this.getUserRoom(userId));

      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)?.add(client.id);
    } catch (error) {
      this.logger.warn(`Socket auth failed: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId: string | undefined = client.data?.userId;
    if (!userId) {
      return;
    }

    const sockets = this.connectedUsers.get(userId);
    sockets?.delete(client.id);
    if (sockets && sockets.size === 0) {
      this.connectedUsers.delete(userId);
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoinConversation(
    client: Socket,
    payload: ConversationJoinPayload,
  ) {
    const userId: string | undefined = client.data?.userId;
    const conversationId = payload?.conversationId?.trim();

    if (!userId || !conversationId) {
      return { ok: false };
    }

    const isMember = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      select: { id: true },
    });

    if (!isMember) {
      return { ok: false };
    }

    client.join(this.getConversationRoom(conversationId));

    const deliveredAt = new Date();
    await this.prisma.directMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        deliveredAt: null,
      },
      data: {
        deliveredAt,
      },
    });

    this.emitDeliveredUpdated(conversationId, userId, deliveredAt);
    return { ok: true };
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveConversation(
    client: Socket,
    payload: ConversationJoinPayload,
  ) {
    const conversationId = payload?.conversationId?.trim();
    if (!conversationId) {
      return { ok: false };
    }

    client.leave(this.getConversationRoom(conversationId));
    return { ok: true };
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(client: Socket, payload: TypingPayload) {
    const userId: string | undefined = client.data?.userId;
    const conversationId = payload?.conversationId?.trim();
    const isTyping = Boolean(payload?.isTyping);

    if (!userId || !conversationId) {
      return { ok: false };
    }

    const isMember = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      select: { id: true },
    });

    if (!isMember) {
      return { ok: false };
    }

    client
      .to(this.getConversationRoom(conversationId))
      .emit('chat:typing', { userId, isTyping });

    return { ok: true };
  }

  emitMessageCreated(
    conversationId: string,
    message: unknown,
  ) {
    this.server.to(this.getConversationRoom(conversationId)).emit(
      'message:new',
      message,
    );
  }

  emitChatListUpdated(userIds: string[], conversationId: string) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    uniqueUserIds.forEach((userId) => {
      this.server
        .to(this.getUserRoom(userId))
        .emit('chat:list-updated', { conversationId });
    });
  }

  emitMessageUpdated(conversationId: string, message: unknown) {
    this.server.to(this.getConversationRoom(conversationId)).emit(
      'message:updated',
      message,
    );
  }

  emitReactionUpdated(conversationId: string, payload: ReactionPayload) {
    this.server.to(this.getConversationRoom(conversationId)).emit(
      'message:reaction',
      payload,
    );
  }

  emitReadUpdated(conversationId: string, userId: string, readAt: Date) {
    this.server.to(this.getConversationRoom(conversationId)).emit('chat:read', {
      userId,
      readAt: readAt.toISOString(),
    });
  }

  emitDeliveredUpdated(conversationId: string, userId: string, deliveredAt: Date) {
    this.server
      .to(this.getConversationRoom(conversationId))
      .emit('chat:delivered', {
        userId,
        deliveredAt: deliveredAt.toISOString(),
      });
  }

  isUserOnline(userId: string) {
    return (this.connectedUsers.get(userId)?.size || 0) > 0;
  }

  isUserInConversation(userId: string, conversationId: string) {
    const sockets = this.connectedUsers.get(userId);
    if (!sockets || sockets.size === 0) {
      return false;
    }

    const roomName = this.getConversationRoom(conversationId);
    for (const socketId of sockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket?.rooms.has(roomName)) {
        return true;
      }
    }

    return false;
  }

  private extractToken(client: Socket) {
    const authToken =
      (client.handshake.auth?.token as string | undefined) || undefined;
    if (authToken) {
      return authToken;
    }

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return undefined;
  }

  private async validateSession(payload: AuthPayload, token: string) {
    const now = new Date();

    if (payload.sid) {
      const session = await this.prisma.session.findUnique({
        where: { token: payload.sid },
      });
      return Boolean(
        session &&
          session.userId === payload.sub &&
          !session.revokedAt &&
          (!session.expiresAt || session.expiresAt > now),
      );
    }

    const legacySession = await this.prisma.session.findUnique({
      where: { token },
    });
    return Boolean(legacySession);
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private getConversationRoom(conversationId: string) {
    return `conversation:${conversationId}`;
  }
}
