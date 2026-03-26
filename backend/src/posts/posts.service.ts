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
import { PostsGateway } from './posts.gateway';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private postsGateway: PostsGateway,
  ) {}

  private serializePost(
    post: {
      id: string;
      userId: string;
      likes?: { userId: string }[];
      _count?: { likes: number; comments: number };
      [key: string]: unknown;
    },
    currentUserId: string,
  ) {
    const likes = post.likes ?? [];
    const count = post._count ?? { likes: 0, comments: 0 };
    return {
      ...post,
      isLiked: likes.length > 0,
      isOwner: post.userId === currentUserId,
      likes: undefined,
      _count: count,
    };
  }

  private async getConnectionIds(userId: string) {
    const acceptedConnections = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: {
        requesterId: true,
        receiverId: true,
      },
    });

    return acceptedConnections.map((connection) =>
      connection.requesterId === userId
        ? connection.receiverId
        : connection.requesterId,
    );
  }

  private async getPostAudienceUserIds(post: {
    userId: string;
    visibility?: string | null;
    visibilityUserIds?: string[] | null;
  }) {
    if (post.visibility === 'private') {
      return [post.userId];
    }

    if (post.visibility === 'friends') {
      const connections = await this.getConnectionIds(post.userId);
      return [post.userId, ...connections];
    }

    if (post.visibility === 'custom') {
      const customIds = post.visibilityUserIds || [];
      return [post.userId, ...customIds];
    }

    return [];
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
    const parseVisibilityUsers = (value?: string) => {
      if (!value) {
        return [];
      }
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === 'string')
          : [];
      } catch {
        return [];
      }
    };
    const computedPostType =
      createPostDto.postType ||
      (createPostDto.visibility === 'friends' ? 'plan' : 'post');
    const effectiveVisibility =
      computedPostType === 'plan'
        ? 'friends'
        : createPostDto.visibility || 'public';
    const visibilityUsers = parseVisibilityUsers(
      createPostDto.visibilityUserIds,
    );
    const connectionIds =
      effectiveVisibility === 'custom'
        ? await this.getConnectionIds(userId)
        : [];
    const filteredVisibilityUsers =
      effectiveVisibility === 'custom'
        ? visibilityUsers.filter((id) => connectionIds.includes(id))
        : [];

    const created = await this.prisma.post.create({
      data: {
        userId,
        content: createPostDto.content,
        visibility: effectiveVisibility,
        postType: computedPostType,
        visibilityUserIds:
          effectiveVisibility === 'custom' ? filteredVisibilityUsers : [],
        placeId: normalizeId(createPostDto.placeId) || undefined,
        eventId: normalizeId(createPostDto.eventId) || undefined,
        placeName: normalizeText(createPostDto.placeName) || undefined,
        cityName: normalizeText(createPostDto.cityName) || undefined,
        ambiance: normalizeText(createPostDto.ambiance) || undefined,
        images: imageUrls,
      },
    });

    const postForFeed = await this.prisma.post.findUnique({
      where: { id: created.id },
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
      },
    });

    if (postForFeed) {
      const audience =
        postForFeed.visibility === 'public'
          ? { type: 'public' as const }
          : {
              type: 'users' as const,
              userIds: await this.getPostAudienceUserIds(postForFeed),
            };

      this.postsGateway.emitNewPost(postForFeed, audience);
    }

    return created;
  }

  async findFeed(
    currentUserId: string,
    options?: {
      cursor?: string;
      limit?: number;
      after?: string;
    },
  ) {
    const connectionIds = await this.getConnectionIds(currentUserId);
    const orFilters: Prisma.PostWhereInput[] = [
      { userId: currentUserId },
      { visibility: 'public' },
      { visibility: 'custom', visibilityUserIds: { has: currentUserId } },
    ];
    if (connectionIds.length > 0) {
      orFilters.push({ visibility: 'friends', userId: { in: connectionIds } });
    }

    const limit = options?.limit ?? 20;
    const cursorPayload = options?.cursor
      ? decodeURIComponent(options.cursor).split('::')
      : [];
    const cursorDate =
      cursorPayload.length === 2 ? new Date(cursorPayload[0]) : null;
    const cursorId = cursorPayload.length === 2 ? cursorPayload[1] : null;
    const isCursorValid =
      cursorDate instanceof Date &&
      !Number.isNaN(cursorDate.getTime()) &&
      Boolean(cursorId);
    const afterDate = options?.after ? new Date(options.after) : null;
    const isAfterValid =
      afterDate instanceof Date && !Number.isNaN(afterDate.getTime());
    const filters: Prisma.PostWhereInput[] = [{ OR: orFilters }];

    if (isAfterValid && afterDate) {
      filters.push({ createdAt: { gt: afterDate } });
    }

    if (isCursorValid && cursorDate && cursorId) {
      filters.push({
        OR: [
          { createdAt: { lt: cursorDate } },
          { createdAt: cursorDate, id: { lt: cursorId } },
        ],
      });
    }

    const where =
      filters.length > 1
        ? {
            AND: filters,
          }
        : filters[0];

    const posts = await this.prisma.post.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
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

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem?.createdAt
        ? `${lastItem.createdAt.toISOString()}::${lastItem.id}`
        : null;

    return {
      items: items.map((post) => this.serializePost(post, currentUserId)),
      nextCursor,
    };
  }

  async findOneAdmin(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
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
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async findAllByUser(userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      const ownPosts = await this.prisma.post.findMany({
        where: { userId },
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

      return ownPosts.map((post) => this.serializePost(post, currentUserId));
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, receiverId: currentUserId },
          { receiverId: userId, requesterId: currentUserId },
        ],
      },
      select: { id: true },
    });
    const isConnection = Boolean(friendship);
    const orFilters: Prisma.PostWhereInput[] = [
      { visibility: 'public' },
      { visibility: 'custom', visibilityUserIds: { has: currentUserId } },
    ];
    if (isConnection) {
      orFilters.push({ visibility: 'friends' });
    }

    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        OR: orFilters,
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
    const parseVisibilityUsers = (value?: string) => {
      if (!value) {
        return [];
      }
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === 'string')
          : [];
      } catch {
        return [];
      }
    };
    const { existingImages, visibilityUserIds, ...rest } = updatePostDto;

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
    if (rest.postType !== undefined && !rest.postType) {
      data.postType = 'post';
    }
    if (rest.visibility) {
      data.postType = rest.visibility === 'friends' ? 'plan' : 'post';
    }
    if (visibilityUserIds !== undefined) {
      const nextVisibility = rest.visibility ?? post.visibility;
      const parsed = parseVisibilityUsers(visibilityUserIds);
      if (nextVisibility === 'custom') {
        const connectionIds = await this.getConnectionIds(userId);
        data.visibilityUserIds = parsed.filter((id) =>
          connectionIds.includes(id),
        );
      } else {
        data.visibilityUserIds = [];
      }
    }

    const isPlanPost =
      (data.postType ?? rest.postType ?? post.postType) === 'plan';
    if (isPlanPost) {
      data.visibility = 'friends';
    }
    if (rest.visibility && rest.visibility !== 'custom') {
      data.visibilityUserIds = [];
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
