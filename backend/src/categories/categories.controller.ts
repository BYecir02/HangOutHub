import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CreateCategoryTagDto } from './dto/create-category-tag.dto';
import { CategoriesService } from './categories.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
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
