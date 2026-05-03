import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { FriendshipsService } from './friendships.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('friendships')
@UseGuards(AuthGuard('jwt'))
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get('mine')
  findMine(@Request() req: AuthenticatedRequest) {
    return this.friendshipsService.findMine(req.user.userId);
  }

  @Throttle({ global: { ttl: 60_000, limit: 30 } })
  @Get('discover')
  discover(
    @Request() req: AuthenticatedRequest,
    @Query('query') query?: string,
  ) {
    return this.friendshipsService.discover(req.user.userId, query);
  }

  @Post('request/:targetUserId')
  request(
    @Request() req: AuthenticatedRequest,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.friendshipsService.request(req.user.userId, targetUserId);
  }

  @Patch(':id/accept')
  accept(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.friendshipsService.accept(req.user.userId, id);
  }

  @Patch(':id/reject')
  reject(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.friendshipsService.reject(req.user.userId, id);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.friendshipsService.remove(req.user.userId, id);
  }
}
