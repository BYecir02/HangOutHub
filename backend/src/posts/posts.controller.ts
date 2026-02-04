import { Controller, Post, Body, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @UseInterceptors(FilesInterceptor('images', 5, { // Max 5 images
    storage: diskStorage({
      destination: './uploads/posts', // Assure-toi de créer ce dossier !
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `post-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  create(@Request() req, @Body() createPostDto: CreatePostDto, @UploadedFiles() files: Array<Express.Multer.File>) {
    return this.postsService.create(req.user.userId, createPostDto, files);
  }
}
