import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OutingsController } from './outings.controller';
import { OutingsService } from './outings.service';

@Module({
  imports: [PrismaModule],
  controllers: [OutingsController],
  providers: [OutingsService],
})
export class OutingsModule {}
