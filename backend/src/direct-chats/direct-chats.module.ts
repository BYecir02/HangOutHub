import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { DirectChatsController } from './direct-chats.controller';
import { DirectChatsService } from './direct-chats.service';

@Module({
  controllers: [DirectChatsController],
  providers: [DirectChatsService, PrismaService],
  exports: [DirectChatsService],
})
export class DirectChatsModule {}
