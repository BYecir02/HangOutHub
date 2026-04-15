import { Module } from '@nestjs/common';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { UserFlowAnalyticsController } from './user-flow-analytics.controller';
import { UserFlowAnalyticsService } from './user-flow-analytics.service';

@Module({
  controllers: [AnalyticsController, UserFlowAnalyticsController],
  providers: [AnalyticsService, UserFlowAnalyticsService],
})
export class AnalyticsModule {}
