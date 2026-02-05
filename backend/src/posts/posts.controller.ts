import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  Delete,
  Patch,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      // Max 5 images
      storage: diskStorage({
        destination: './uploads/posts', // Assure-toi de créer ce dossier !
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `post-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  create(
    @Request() req: { user: { userId: string } },
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.postsService.create(req.user.userId, createPostDto, files);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user/:userId')
  findAllByUser(
    @Param('userId') userId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.postsService.findAllByUser(userId, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    // On passe l'ID de l'utilisateur connecté pour la vérification
    return this.postsService.remove(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, req.user.userId, updatePostDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/comments')
  addComment(
    @Param('id') postId: string,
    @Request() req: { user: { userId: string } },
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
    @Request() req: { user: { userId: string } },
  ) {
    return this.postsService.toggleLike(postId, req.user.userId);
  }
}
