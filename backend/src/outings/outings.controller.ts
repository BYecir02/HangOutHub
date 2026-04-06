import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CreateOutingMessageDto } from './dto/create-outing-message.dto';
import { CreateOutingDto } from './dto/create-outing.dto';
import { InviteOutingParticipantsDto } from './dto/invite-outing-participants.dto';
import { RespondOutingInvitationDto } from './dto/respond-outing-invitation.dto';
import { OutingsService } from './outings.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('outings')
@UseGuards(AuthGuard('jwt'))
export class OutingsController {
  constructor(private readonly outingsService: OutingsService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createOutingDto: CreateOutingDto,
  ) {
    return this.outingsService.create(req.user.userId, createOutingDto);
  }

  @Get('mine')
  findMine(@Request() req: AuthenticatedRequest) {
    return this.outingsService.findMine(req.user.userId);
  }

  @Get('invitations')
  findInvitations(@Request() req: AuthenticatedRequest) {
    return this.outingsService.findInvitations(req.user.userId);
  }

  @Get('chats')
  findChats(@Request() req: AuthenticatedRequest) {
    return this.outingsService.findChats(req.user.userId);
  }

  @Get(':id/messages')
  findMessages(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.outingsService.findMessages(req.user.userId, id);
  }

  @Post(':id/messages')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Seules les images sont autorisees.'),
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
    @Body() createOutingMessageDto: CreateOutingMessageDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.outingsService.sendMessage(
      req.user.userId,
      id,
      createOutingMessageDto,
      files,
    );
  }

  @Post(':id/messages/read')
  markMessagesAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.outingsService.markMessagesAsRead(req.user.userId, id);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.outingsService.findOneForUser(req.user.userId, id);
  }

  @Post(':id/invite')
  inviteParticipants(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() inviteOutingParticipantsDto: InviteOutingParticipantsDto,
  ) {
    return this.outingsService.inviteParticipants(
      req.user.userId,
      id,
      inviteOutingParticipantsDto.participantIds,
    );
  }

  @Patch(':id/respond')
  respond(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() respondOutingInvitationDto: RespondOutingInvitationDto,
  ) {
    return this.outingsService.respondToInvitation(
      req.user.userId,
      id,
      respondOutingInvitationDto.status,
    );
  }
}
