import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  private serializePost(
    post: {
      id: string;
      userId: string;
      likes: { userId: string }[];
      _count: { likes: number; comments: number };
      [key: string]: unknown;
    },
    currentUserId: string,
  ) {
    return {
      ...post,
      isLiked: post.likes.length > 0,
      isOwner: post.userId === currentUserId,
      likes: undefined,
    };
  }

  async create(
    userId: string,
    createPostDto: CreatePostDto,
    files: Express.Multer.File[],
  ) {
    const normalizeText = (value?: string) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };
    const imageUrls =
      files && files.length > 0
        ? await this.storageService.uploadFiles('posts', files)
        : [];

    const normalizeId = (value?: string) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };

    return this.prisma.post.create({
      data: {
        userId,
        content: createPostDto.content,
        visibility: createPostDto.visibility || 'public',
        postType: createPostDto.postType || 'post',
        placeId:
          createPostDto.postType === 'plan'
            ? normalizeId(createPostDto.placeId) || undefined
            : undefined,
        eventId:
          createPostDto.postType === 'plan'
            ? normalizeId(createPostDto.eventId) || undefined
            : undefined,
        placeName:
          createPostDto.postType === 'plan'
            ? normalizeText(createPostDto.placeName) || undefined
            : undefined,
        cityName:
          createPostDto.postType === 'plan'
            ? normalizeText(createPostDto.cityName) || undefined
            : undefined,
        ambiance:
          createPostDto.postType === 'plan'
            ? normalizeText(createPostDto.ambiance) || undefined
            : undefined,
        images: imageUrls,
      },
    });
  }

  async findFeed(currentUserId: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        OR: [{ userId: currentUserId }, { visibility: 'public' }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        Place: {
          select: {
            id: true,
            name: true,
            City: {
              select: {
                name: true,
              },
            },
          },
        },
        Event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            placeId: true,
            Place: {
              select: {
                id: true,
                name: true,
                City: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: { userId: currentUserId },
          select: { userId: true },
        },
      },
    });

    return posts.map((post) => this.serializePost(post, currentUserId));
  }

  async findAllByUser(userId: string, currentUserId: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        ...(userId !== currentUserId ? { visibility: 'public' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        User: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        Place: {
          select: {
            id: true,
            name: true,
            City: {
              select: {
                name: true,
              },
            },
          },
        },
        Event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            placeId: true,
            Place: {
              select: {
                id: true,
                name: true,
                City: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: { userId: currentUserId },
          select: { userId: true },
        },
      },
    });

    return posts.map((post) => this.serializePost(post, currentUserId));
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You are not allowed to delete this post');
    }

    return this.prisma.post.delete({
      where: { id },
    });
  }

  async update(
    id: string,
    userId: string,
    updatePostDto: UpdatePostDto,
    files: Express.Multer.File[],
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You are not allowed to update this post');
    }

    const normalizeText = (value?: string) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };
    const normalizeId = (value?: string) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };
    const { existingImages, ...rest } = updatePostDto;

    let retainedImages: string[] = [];
    if (existingImages) {
      try {
        const parsed = JSON.parse(existingImages);
        if (Array.isArray(parsed)) {
          retainedImages = parsed.filter((image) => typeof image === 'string');
        }
      } catch {
        // If parsing fails, treat as no retained images.
      }
    }

    const newImages =
      files && files.length > 0
        ? await this.storageService.uploadFiles('posts', files)
        : [];

    const data: Prisma.PostUncheckedUpdateInput = { ...rest };

    if (rest.placeId !== undefined) {
      data.placeId = normalizeId(rest.placeId);
    }
    if (rest.eventId !== undefined) {
      data.eventId = normalizeId(rest.eventId);
    }
    if (rest.placeName !== undefined) {
      data.placeName = normalizeText(rest.placeName);
    }
    if (rest.cityName !== undefined) {
      data.cityName = normalizeText(rest.cityName);
    }
    if (rest.ambiance !== undefined) {
      data.ambiance = normalizeText(rest.ambiance);
    }
    if (rest.postType !== undefined) {
      if (!rest.postType) {
        data.postType = 'post';
      }
      if (rest.postType === 'post') {
        data.placeId = null;
        data.eventId = null;
        data.placeName = null;
        data.cityName = null;
        data.ambiance = null;
      }
    }

    if (existingImages !== undefined || newImages.length > 0) {
      data.images = [...retainedImages, ...newImages];
    }

    return this.prisma.post.update({
      where: { id },
      data,
    });
  }

  async addComment(
    userId: string,
    postId: string,
    createCommentDto: CreateCommentDto,
  ) {
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
        parentId: createCommentDto.parentId,
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
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

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
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

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
    }

    await this.prisma.postLike.create({
      data: { userId, postId },
    });
    return { liked: true };
  }
}
