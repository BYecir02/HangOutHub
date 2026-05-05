import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { SocialService } from './social.service';

interface AuthenticatedRequest {
  user: { userId: string };
}

@Controller()
@UseGuards(AuthGuard('jwt'))
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('social/activity')
  getActivity(@Req() req: AuthenticatedRequest) {
    return this.socialService.getActivity(req.user.userId);
  }

  @Get('map/friends-activity')
  getMapFriendsActivity(@Req() req: AuthenticatedRequest) {
    return this.socialService.getMapFriendsActivity(req.user.userId);
  }
}
