import {
  BadRequestException,
  Body,
  Controller,
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
import { CreateEventDto } from './dto/create-event.dto';
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
    if (req.user.role !== 'ORGANIZER' && req.user.role !== 'PLACE_OWNER') {
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
    return this.eventsService.findMine(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateEventDto,
  ) {
    this.ensureOrganizerRole(req);
    return this.eventsService.update(id, req.user.userId, req.user.role, body);
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
    this.ensureOrganizerRole(req);
    return this.eventsService.findEventScans(id, req.user.userId, req.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }
}
