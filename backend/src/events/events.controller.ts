import { Controller, Get, Post, Body, UseGuards, UseInterceptors, UploadedFiles, Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '@nestjs/passport';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(AuthGuard('jwt')) // Seulement si connecté
  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'cover', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ], {
    storage: diskStorage({
      destination: './uploads', // Dossier où stocker les images
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  create(@Req() req: { user: { userId: string } }, @Body() createEventDto: CreateEventDto, @UploadedFiles() files: { cover?: Express.Multer.File[], gallery?: Express.Multer.File[] }) {
    // req.user contient l'user extrait du Token JWT
    return this.eventsService.create(req.user.userId, createEventDto, files); 
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }
}