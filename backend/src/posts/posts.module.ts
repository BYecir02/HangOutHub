import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostsGateway } from './posts.gateway';

@Module({
  controllers: [PostsController],
  providers: [PostsService, PostsGateway],
})
export class PostsModule {}
