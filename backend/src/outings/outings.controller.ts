import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

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
  sendMessage(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() createOutingMessageDto: CreateOutingMessageDto,
  ) {
    return this.outingsService.sendMessage(
      req.user.userId,
      id,
      createOutingMessageDto.content,
    );
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
