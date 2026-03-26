import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 1. On cherche le token dans le Header
      ignoreExpiration: false, // 2. On refuse les tokens périmés
      secretOrKey: process.env.JWT_SECRET || 'secretParDefautPourDev', // 3. La même clé que pour signer !
      passReqToCallback: true, // ✅ On veut accéder à la requête pour lire le token brut
    });
  }

  async validate(
    req: Request,
    payload: {
      sub: string;
      username: string;
      role: string;
      sid?: string;
      type?: 'access' | 'refresh';
    },
  ) {
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Token invalide');
    }

    const now = new Date();
    const bearerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    // Nouveau flux: on cherche la session via l'identifiant de session (sid).
    if (payload.sid) {
      const session = await this.prisma.session.findUnique({
        where: { token: payload.sid },
        include: {
          User: {
            select: {
              id: true,
              isSuspended: true,
            },
          },
        },
      });

      if (
        !session ||
        session.userId !== payload.sub ||
        session.revokedAt ||
        (session.expiresAt && session.expiresAt < now)
      ) {
        throw new UnauthorizedException('Session expiree ou invalide');
      }

      if (session.User?.isSuspended) {
        throw new UnauthorizedException('Compte suspendu');
      }

      return {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
      };
    }

    // Compatibilite legacy: anciennes sessions stockant l'access token brut.
    const legacySession = await this.prisma.session.findUnique({
      where: { token: bearerToken || '' },
      include: {
        User: {
          select: {
            id: true,
            isSuspended: true,
          },
        },
      },
    });

    if (!legacySession) {
      throw new UnauthorizedException('Session expirée ou invalide');
    }

    if (legacySession.User?.isSuspended) {
      throw new UnauthorizedException('Compte suspendu');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
