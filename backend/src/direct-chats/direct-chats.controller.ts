import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CreateDirectMessageDto } from './dto/create-direct-message.dto';
import { CreateDirectReactionDto } from './dto/create-direct-reaction.dto';
import { UpdateDirectMessageDto } from './dto/update-direct-message.dto';
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
    return this.directChatsService.getOrCreateConversation(
      req.user.userId,
      userId,
    );
  }

  @Get(':id')
  getConversation(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.directChatsService.getConversation(req.user.userId, id);
  }

  @Get(':id/messages')
  findMessages(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('beforeMessageId') beforeMessageId?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number(limitRaw) : undefined;
    return this.directChatsService.findMessages(req.user.userId, id, {
      beforeMessageId,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  @Post(':id/messages')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (
          !file.mimetype.startsWith('image/') &&
          !file.mimetype.startsWith('video/')
        ) {
          return cb(
            new BadRequestException('Seules les images et videos sont autorisees.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  sendMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() payload: CreateDirectMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.directChatsService.sendMessage(
      req.user.userId,
      id,
      payload,
      files,
    );
  }

  @Patch(':id/messages/:messageId')
  updateMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() payload: UpdateDirectMessageDto,
  ) {
    return this.directChatsService.updateMessage(
      req.user.userId,
      id,
      messageId,
      payload,
    );
  }

  @Delete(':id/messages/:messageId')
  deleteMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.directChatsService.deleteMessage(
      req.user.userId,
      id,
      messageId,
    );
  }

  @Post(':id/messages/:messageId/reactions')
  reactToMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() payload: CreateDirectReactionDto,
  ) {
    return this.directChatsService.addReaction(
      req.user.userId,
      id,
      messageId,
      payload.emoji,
    );
  }

  @Delete(':id/messages/:messageId/reactions')
  removeReaction(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.directChatsService.removeReaction(
      req.user.userId,
      id,
      messageId,
    );
  }

  @Post(':id/read')
  markRead(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.directChatsService.markRead(req.user.userId, id);
  }
}
