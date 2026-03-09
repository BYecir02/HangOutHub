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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { PlacesService } from './places.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

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
    @Request() req: AuthenticatedRequest,
    @Body() createPlaceDto: CreatePlaceDto,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; gallery?: Express.Multer.File[] },
  ) {
    return this.placesService.create(createPlaceDto, files, req.user.userId);
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
    @Param('id') id: string,
    @Body() updatePlaceDto: UpdatePlaceDto,
    @Request() req: AuthenticatedRequest,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; gallery?: Express.Multer.File[] },
  ) {
    return this.placesService.update(
      id,
      updatePlaceDto,
      files,
      req.user.userId,
    );
  }

  @Get()
  findAll() {
    return this.placesService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('saved/mine')
  findSaved(@Request() req: AuthenticatedRequest) {
    return this.placesService.findSavedByUser(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/save')
  toggleSave(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.placesService.toggleSave(id, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placesService.findOne(id);
  }
}
