import { Controller, ForbiddenException, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AnalyticsService } from './analytics.service';
import { DashboardTrendRange } from './analytics.types';
import { UserFlowAnalyticsService } from './user-flow-analytics.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
  };
}

interface DashboardQuery {
  range?: DashboardTrendRange;
  from?: string;
  to?: string;
}

@Controller('admin/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly userFlowAnalyticsService: UserFlowAnalyticsService,
  ) {}

  private ensureAdmin(req: AuthenticatedRequest) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acces reserve aux administrateurs.');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('dashboard')
  getDashboard(@Request() req: AuthenticatedRequest, @Query() query: DashboardQuery) {
    this.ensureAdmin(req);
    return this.analyticsService.getDashboardOverview(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('flow-tree')
  getFlowTree(@Request() req: AuthenticatedRequest, @Query() query: DashboardQuery) {
    this.ensureAdmin(req);
    return this.userFlowAnalyticsService.getFlowTree(query);
  }
}
