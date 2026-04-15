import { Controller, Post, Body, Request } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request as ExpressRequest } from 'express';

import { RecordUserFlowEventDto } from './dto/record-user-flow-event.dto';
import { UserFlowAnalyticsService } from './user-flow-analytics.service';

interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
  sid?: string;
  type?: 'access' | 'refresh';
}

interface AnalyticsRequest extends ExpressRequest {
  user?: {
    userId: string;
    role?: string;
  };
}

@Controller('analytics')
export class UserFlowAnalyticsController {
  constructor(
    private readonly userFlowAnalyticsService: UserFlowAnalyticsService,
    private readonly jwtService: JwtService,
  ) {}

  private extractBearerToken(authorization?: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null;
    }

    const token = authorization.slice('Bearer '.length).trim();
    return token || null;
  }

  private resolveActor(req: AnalyticsRequest) {
    const token = this.extractBearerToken(req.headers.authorization);

    if (!token) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);

      if (payload.type && payload.type !== 'access') {
        return null;
      }

      return {
        userId: payload.sub,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  @Post('events')
  recordEvent(
    @Body() dto: RecordUserFlowEventDto,
    @Request() req: AnalyticsRequest,
  ) {
    return this.userFlowAnalyticsService.recordEvent(dto, this.resolveActor(req));
  }
}
