import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
  };
}

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  private ensureAdmin(req: AuthenticatedRequest) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acces reserve aux administrateurs.');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 5, {
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
    }),
  )
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.postsService.create(
      req.user.userId,
      req.user.role || 'USER',
      createPostDto,
      files,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('feed')
  findFeed(
    @Request() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('after') after?: string,
  ) {
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    return this.postsService.findFeed(req.user.userId, {
      cursor,
      limit: parsedLimit,
      after,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/analytics/shares')
  getShareAnalytics(@Request() req: AuthenticatedRequest) {
    this.ensureAdmin(req);
    return this.postsService.getShareAnalytics();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/:id')
  findOneAdmin(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    this.ensureAdmin(req);
    return this.postsService.findOneAdmin(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user/:userId')
  findAllByUser(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.postsService.findAllByUser(userId, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.postsService.remove(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.postsService.findOneForUser(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/share')
  incrementShareCount(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.postsService.incrementShareCount(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
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
    }),
  )
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.postsService.update(
      id,
      req.user.userId,
      req.user.role || 'USER',
      updatePostDto,
      files,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/comments')
  addComment(
    @Param('id') postId: string,
    @Request() req: AuthenticatedRequest,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.postsService.addComment(
      req.user.userId,
      postId,
      createCommentDto,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/comments')
  getComments(@Param('id') postId: string) {
    return this.postsService.getComments(postId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  toggleLike(
    @Param('id') postId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.postsService.toggleLike(postId, req.user.userId);
  }
}
