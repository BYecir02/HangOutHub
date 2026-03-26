import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { DirectChatsService } from './direct-chats.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@UseGuards(AuthGuard('jwt'))
@Controller('direct-chats')
export class DirectChatsController {
  constructor(private readonly directChatsService: DirectChatsService) {}

  @Get()
  list(@Request() req: AuthenticatedRequest) {
    return this.directChatsService.listChats(req.user.userId);
  }

  @Post('with/:userId')
  createOrGet(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.directChatsService.getOrCreateConversation(req.user.userId, userId);
  }

  @Get(':id')
  getConversation(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.directChatsService.getConversation(req.user.userId, id);
  }

  @Get(':id/messages')
  findMessages(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.directChatsService.findMessages(req.user.userId, id);
  }

  @Post(':id/messages')
  sendMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() payload: CreateDirectMessageDto,
  ) {
    return this.directChatsService.sendMessage(req.user.userId, id, payload);
  }

  @Post(':id/read')
  markRead(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.directChatsService.markRead(req.user.userId, id);
  }
}
