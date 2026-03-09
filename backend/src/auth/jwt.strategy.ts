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
    payload: { sub: string; username: string; role: string },
  ) {
    // Récupérer le token brut depuis le header (Bearer eyJ...)
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    // ✅ Vérifier si la session est active en BDD
    const session = await this.prisma.session.findUnique({
      where: { token: token || '' },
    });

    if (!session) {
      // Si pas de session en base, le token a été révoqué (logout)
      throw new UnauthorizedException('Session expirée ou invalide');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
