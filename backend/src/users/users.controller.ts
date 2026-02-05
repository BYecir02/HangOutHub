import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, NotFoundException, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt')) 
  @Get('me') // Route: /users/me
  async getProfile(@Request() req: { user: { userId: string } }) {
    const userId = req.user.userId;
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    
    // On retire le mot de passe avant de renvoyer les infos
    const result = { ...user };
    delete result.passwordHash;
    return result;
  }
  
  @UseGuards(AuthGuard('jwt')) 
  @Patch('me')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ], {
    storage: diskStorage({
      destination: './uploads/profiles', // Assure-toi que ce dossier existe !
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  updateProfile(
    @Request() req: { user: { userId: string } }, 
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFiles() files: { avatar?: Express.Multer.File[], cover?: Express.Multer.File[] }
  ) {
    const updateData = { ...updateUserDto };
    
    // Si un avatar a été uploadé, on construit son URL
    if (files.avatar && files.avatar[0]) {
      updateData['avatarUrl'] = `/uploads/profiles/${files.avatar[0].filename}`;
    }

    // Si une couverture a été uploadée
    if (files.cover && files.cover[0]) {
      updateData['coverUrl'] = `/uploads/profiles/${files.cover[0].filename}`;
    }

    return this.usersService.update(req.user.userId, updateData);
  }
  
  @Post() // Inscription
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Prisma.UserUpdateInput) {
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}