import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

import { PrismaService } from '../prisma/prisma.service';

type AuthPayload = {
  sub: string;
  sid?: string;
  type?: 'access' | 'refresh';
};

type ClientSocketData = {
  userId?: string;
};

@WebSocketGateway({
  namespace: '/posts',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class PostsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PostsGateway.name);
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
      if (payload.type && payload.type !== 'access') {
        client.disconnect(true);
        return;
      }

      const sessionValid = await this.validateSession(payload, token);
      if (!sessionValid) {
        client.disconnect(true);
        return;
      }

      const userId = payload.sub;
      this.setClientUserId(client, userId);
      await client.join(this.getUserRoom(userId));

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
    const userId = this.getClientUserId(client);
    if (!userId) {
      return;
    }

    const sockets = this.connectedUsers.get(userId);
    sockets?.delete(client.id);
    if (sockets && sockets.size === 0) {
      this.connectedUsers.delete(userId);
    }
  }

  emitNewPost(
    post: {
      id: string;
      userId: string;
      visibility?: string | null;
      visibilityUserIds?: string[] | null;
      _count?: { likes?: number; comments?: number };
      [key: string]: unknown;
    },
    audience: { type: 'public' } | { type: 'users'; userIds: string[] },
  ) {
    const recipients =
      audience.type === 'public'
        ? Array.from(this.connectedUsers.keys())
        : Array.from(new Set(audience.userIds));

    if (recipients.length === 0) {
      return;
    }

    recipients.forEach((userId) => {
      const payload = {
        ...post,
        isOwner: post.userId === userId,
        isLiked: false,
        _count: post._count ?? { likes: 0, comments: 0 },
      };
      this.server.to(this.getUserRoom(userId)).emit('post:new', payload);
    });
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
    if (!payload.sub) {
      return false;
    }

    const now = new Date();

    if (payload.sid) {
      const session = await this.prisma.session.findUnique({
        where: { token: payload.sid },
      });

      if (
        !session ||
        session.userId !== payload.sub ||
        session.revokedAt ||
        (session.expiresAt && session.expiresAt < now)
      ) {
        return false;
      }

      return true;
    }

    const legacySession = await this.prisma.session.findUnique({
      where: { token },
    });

    return Boolean(legacySession);
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private setClientUserId(client: Socket, userId: string) {
    const socketData = client.data as ClientSocketData;
    socketData.userId = userId;
  }

  private getClientUserId(client: Socket) {
    const socketData = client.data as ClientSocketData;
    return socketData.userId;
  }
}
