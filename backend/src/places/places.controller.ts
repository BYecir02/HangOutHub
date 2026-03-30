import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  ParseUUIDPipe,
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
import { CreatePlaceTeamMemberDto } from './dto/create-place-team-member.dto';
import { CreatePlaceReviewDto } from './dto/create-place-review.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { PlacesService } from './places.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
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
      req.user.role || 'USER',
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.placesService.remove(
      id,
      req.user.userId,
      req.user.role || 'USER',
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

  @Get(':id/reviews')
  getReviews(@Param('id') id: string) {
    return this.placesService.getReviews(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/reviews')
  createReview(
    @Param('id') id: string,
    @Body() payload: CreatePlaceReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.placesService.upsertReview(id, req.user.userId, payload);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('team/me')
  listMyPlaceTeams(@Request() req: AuthenticatedRequest) {
    return this.placesService.listMyPlaceTeams(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/team')
  listPlaceTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.placesService.listPlaceTeam(
      id,
      req.user.userId,
      req.user.role || 'USER',
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/team')
  upsertPlaceTeamMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: CreatePlaceTeamMemberDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.placesService.upsertPlaceTeamMember(
      id,
      req.user.userId,
      req.user.role || 'USER',
      payload,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/team/:userId')
  removePlaceTeamMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) placeMemberUserId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.placesService.removePlaceTeamMember(
      id,
      req.user.userId,
      req.user.role || 'USER',
      placeMemberUserId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placesService.findOne(id);
  }
}
