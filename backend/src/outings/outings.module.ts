import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { OutingsController } from './outings.controller';
import { OutingsService } from './outings.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [OutingsController],
  providers: [OutingsService],
})
export class OutingsModule {}
