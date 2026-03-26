import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateCategoryTagDto } from './dto/create-category-tag.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { CategoriesService } from './categories.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
  };
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  private ensureAdmin(req: AuthenticatedRequest) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acces reserve aux administrateurs.');
    }
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin')
  findAllAdmin(@Request() req: AuthenticatedRequest) {
    this.ensureAdmin(req);
    return this.categoriesService.findAllAdmin();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  createCategory(@Body() body: CreateCategoryDto, @Request() req: AuthenticatedRequest) {
    this.ensureAdmin(req);
    return this.categoriesService.createCategory(body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.categoriesService.updateCategory(id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('tags/:id')
  updateTag(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTagDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.categoriesService.updateTag(id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('organizer')
  findAllForOrganizer(@Request() req: AuthenticatedRequest) {
    return this.categoriesService.findAllForUser(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/tags')
  createTag(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateCategoryTagDto,
  ) {
    return this.categoriesService.createTagForCategory(id, req.user.userId, body.name);
  }

  @Get(':id/discover')
  discover(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.discover(id);
  }
}
