import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

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
    return this.postsService.create(req.user.userId, createPostDto, files);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('feed')
  findFeed(@Request() req: AuthenticatedRequest) {
    return this.postsService.findFeed(req.user.userId);
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
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, req.user.userId, updatePostDto);
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
