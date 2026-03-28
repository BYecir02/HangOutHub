import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: string;
  };
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private async ensureOrganizerRole(req: AuthenticatedRequest) {
    const hasAccess = await this.notificationsService.hasOrganizerOrTeamAccess(
      req.user.userId,
      req.user.role,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        'Acces reserve aux organisateurs et gerants de lieux.',
      );
    }
  }

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

  @Get('organizer/unread-count')
  async getOrganizerUnreadCount(@Request() req: AuthenticatedRequest) {
    await this.ensureOrganizerRole(req);
    const count = await this.notificationsService.getOrganizerUnreadCount(
      req.user.userId,
    );

    return { unreadCount: count };
  }

  @Post('organizer/mark-read')
  async markOrganizerRead(@Request() req: AuthenticatedRequest) {
    await this.ensureOrganizerRole(req);
    return this.notificationsService.markOrganizerAllRead(req.user.userId);
  }

  @Get('organizer/activity')
  async getOrganizerActivity(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('urgentOnly') urgentOnly?: string,
  ) {
    await this.ensureOrganizerRole(req);
    return this.notificationsService.getOrganizerActivity(req.user.userId, {
      limit: limit ? Number(limit) : undefined,
      cursor,
      unreadOnly: unreadOnly === 'true',
      urgentOnly: urgentOnly === 'true',
    });
  }

  @Post('organizer/:id/mark-read')
  async markOrganizerOneRead(
    @Request() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    await this.ensureOrganizerRole(req);
    return this.notificationsService.markOrganizerOneRead(
      req.user.userId,
      notificationId,
    );
  }

  @Post('organizer/mark-read-batch')
  async markOrganizerBatchRead(
    @Request() req: AuthenticatedRequest,
    @Body('ids') notificationIds?: string[],
  ) {
    await this.ensureOrganizerRole(req);
    return this.notificationsService.markOrganizerBatchRead(
      req.user.userId,
      notificationIds || [],
    );
  }

  @Post('organizer/debug/emit-reminders')
  async emitOrganizerReminders(@Request() req: AuthenticatedRequest) {
    await this.ensureOrganizerRole(req);

    if (
      req.user.role !== 'ADMIN' &&
      req.user.role !== 'ORGANIZER' &&
      req.user.role !== 'PLACE_OWNER'
    ) {
      throw new ForbiddenException(
        'Endpoint debug reserve aux comptes organisateur.',
      );
    }

    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Endpoint debug indisponible en production.',
      );
    }

    return this.notificationsService.emitUpcomingEventReminders();
  }

  @Get('activity')
  getActivity(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.getActivity(req.user.userId);
  }
}
