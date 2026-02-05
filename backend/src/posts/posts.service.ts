import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';

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

  async findAllByUser(userId: string, currentUserId: string) {
    const posts = await this.prisma.post.findMany({
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
        },
        _count: { 
          select: {
            likes: true,
            comments: true,
          }
        },
        likes: {
          where: { userId: currentUserId },
          select: { userId: true }
        }
      }
    });

    // On transforme le résultat pour ajouter un champ booléen simple "isLiked"
    return posts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
      likes: undefined // On nettoie le tableau likes qui ne sert plus
    }));
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    // 1. Vérifier si le post existe
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    // 2. Vérifier si l'utilisateur est le propriétaire
    if (post.userId !== userId) {
      throw new ForbiddenException('You are not allowed to delete this post');
    }
    
    return this.prisma.post.delete({
      where: { id },
    });
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You are not allowed to update this post');
    }

    return this.prisma.post.update({
      where: { id },
      data: updatePostDto,
    });
  }

  async addComment(userId: string, postId: string, createCommentDto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    return this.prisma.postComment.create({
      data: {
        content: createCommentDto.content,
        userId,
        postId,
      },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getComments(postId: string) {
    return this.prisma.postComment.findMany({
      where: { postId },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async toggleLike(postId: string, userId: string) {
    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.postLike.delete({
        where: { userId_postId: { userId, postId } },
      });
      return { liked: false };
    } else {
      await this.prisma.postLike.create({
        data: { userId, postId },
      });
      return { liked: true };
    }
  }
}
