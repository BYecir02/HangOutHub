import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 1. On cherche le token dans le Header
      ignoreExpiration: false, // 2. On refuse les tokens périmés
      secretOrKey: process.env.JWT_SECRET || 'secretParDefautPourDev', // 3. La même clé que pour signer !
    });
  }

  validate(payload: { sub: string; username: string; role: string }) {
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
