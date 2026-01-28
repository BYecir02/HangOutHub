import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFiles, UseGuards } from '@nestjs/common';
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '@nestjs/passport';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  // POST /places
  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'cover', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ], {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  create(@Body() createPlaceDto: CreatePlaceDto, @UploadedFiles() files: { cover?: any[], gallery?: any[] }) {
    return this.placesService.create(createPlaceDto, files);
  }

  // GET /places
  @Get()
  findAll() {
    return this.placesService.findAll();
  }

  // GET /places/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placesService.findOne(id);
  }
}