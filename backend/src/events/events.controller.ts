import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Patch,
  ParseUUIDPipe,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CreateEventBookingDto } from './dto/create-event-booking.dto';
import { CreateEventCollaboratorDto } from './dto/create-event-collaborator.dto';
import { CreatePlaceTeamMemberDto } from './dto/create-place-team-member.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { OrganizerAnalyticsOverview } from './events.service';
import { EventsService } from './events.service';
import { UpdateEventDto } from './dto/update-event.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: string;
  };
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  private ensureOrganizerRole(req: AuthenticatedRequest) {
    if (
      req.user.role !== 'ORGANIZER' &&
      req.user.role !== 'PLACE_OWNER' &&
      req.user.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Acces reserve aux organisateurs et gerants de lieux.',
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover', maxCount: 1 },
        { name: 'gallery', maxCount: 10 },
      ],
      {
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
      },
    ),
  )
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createEventDto: CreateEventDto,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; gallery?: Express.Multer.File[] },
  ) {
    this.ensureOrganizerRole(req);
    return this.eventsService.create(req.user.userId, createEventDto, files);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.eventsService.findMine(req.user.userId, req.user.role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('analytics/overview')
  getOrganizerAnalytics(
    @Req() req: AuthenticatedRequest,
  ): Promise<OrganizerAnalyticsOverview> {
    return this.eventsService.getOrganizerAnalytics(
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover', maxCount: 1 },
        { name: 'gallery', maxCount: 10 },
      ],
      {
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
      },
    ),
  )
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateEventDto,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; gallery?: Express.Multer.File[] },
  ) {
    return this.eventsService.update(
      id,
      req.user.userId,
      req.user.role,
      body,
      files,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.remove(id, req.user.userId, req.user.role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/collaborators')
  listCollaborators(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.listCollaborators(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/collaborators')
  addCollaborator(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateEventCollaboratorDto,
  ) {
    return this.eventsService.addCollaborator(
      id,
      req.user.userId,
      req.user.role,
      body,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/collaborators/:userId')
  removeCollaborator(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) collaboratorUserId: string,
  ) {
    return this.eventsService.removeCollaborator(
      id,
      req.user.userId,
      req.user.role,
      collaboratorUserId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/place-team')
  listPlaceTeam(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.listPlaceTeam(id, req.user.userId, req.user.role);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/place-team')
  addPlaceTeamMember(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreatePlaceTeamMemberDto,
  ) {
    return this.eventsService.addPlaceTeamMember(
      id,
      req.user.userId,
      req.user.role,
      body,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/place-team/:userId')
  removePlaceTeamMember(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) placeMemberUserId: string,
  ) {
    return this.eventsService.removePlaceTeamMember(
      id,
      req.user.userId,
      req.user.role,
      placeMemberUserId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/book')
  createBooking(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateEventBookingDto,
  ) {
    return this.eventsService.createBooking(req.user.userId, id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('bookings/:bookingId/cancel')
  cancelBooking(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.eventsService.cancelBooking(req.user.userId, bookingId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-bookings')
  findMyBookings(@Req() req: AuthenticatedRequest) {
    return this.eventsService.findMyBookings(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/scans')
  findEventScans(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.findEventScans(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/revisions')
  listEventRevisions(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.listEventRevisions(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }
}
