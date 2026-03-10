import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    const count = await this.notificationsService.getUnreadCount(
      req.user.userId,
    );
    return { unreadCount: count };
  }

  @Post('mark-read')
  markRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @Get('activity')
  getActivity(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.getActivity(req.user.userId);
  }
}
