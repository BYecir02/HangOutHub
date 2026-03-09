import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Prisma } from '@prisma/client';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { StorageService } from '../storage/storage.service';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  private ensureAdmin(req: AuthenticatedRequest) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acces reserve aux administrateurs.');
    }
  }

  private ensureAdminOrSelf(req: AuthenticatedRequest, targetUserId: string) {
    if (req.user.role !== 'ADMIN' && req.user.userId !== targetUserId) {
      throw new ForbiddenException(
        "Vous n'etes pas autorise a acceder a ce profil.",
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = await this.usersService.findOne(req.user.userId);

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const userRoles = user.UserRole || [];
    const role = userRoles.length > 0 ? userRoles[0].Role.name : 'USER';

    return { ...user, role };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
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
  updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFiles()
    files: { avatar?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    return this.updateProfileData(req.user.userId, updateUserDto, files);
  }

  private async updateProfileData(
    userId: string,
    updateUserDto: UpdateUserDto,
    files: { avatar?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    const updateData: Prisma.UserUpdateInput = { ...updateUserDto };

    if (files?.avatar?.[0]) {
      updateData.avatarUrl = await this.storageService.uploadFile(
        'profiles',
        files.avatar[0],
      );
    }

    if (files?.cover?.[0]) {
      updateData.coverUrl = await this.storageService.uploadFile(
        'profiles',
        files.cover[0],
      );
    }

    return this.usersService.update(userId, updateData);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    this.ensureAdmin(req);
    return this.usersService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    this.ensureAdminOrSelf(req, id);
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: Prisma.UserUpdateInput,
    @Request() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.usersService.update(id, data);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    this.ensureAdmin(req);
    return this.usersService.approveOrganizer(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  deleteMe(@Request() req: AuthenticatedRequest) {
    return this.usersService.remove(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    this.ensureAdmin(req);
    return this.usersService.remove(id);
  }
}
