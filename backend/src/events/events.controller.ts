import {
  BadRequestException,
  Body,
  Controller,
  Get,
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

import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }
}
