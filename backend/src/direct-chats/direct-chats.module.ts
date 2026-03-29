import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { DirectChatsController } from './direct-chats.controller';
import { DirectChatsGateway } from './direct-chats.gateway';
import { DirectChatsService } from './direct-chats.service';

@Module({
  imports: [StorageModule],
  controllers: [DirectChatsController],
  providers: [DirectChatsService, DirectChatsGateway, PrismaService],
  exports: [DirectChatsService],
})
export class DirectChatsModule {}
