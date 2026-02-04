import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPostDto: CreatePostDto, files: Array<Express.Multer.File>) {
    // Construction des URLs des images
    const imageUrls = files ? files.map(file => `/uploads/posts/${file.filename}`) : [];

    return this.prisma.post.create({
      data: {
        userId,
        content: createPostDto.content,
        visibility: createPostDto.visibility || 'public',
        images: imageUrls,
      },
    });
  }

  // ✅ NOUVELLE MÉTHODE
  async findAllByUser(userId: string) {
    return this.prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });
  }
}
