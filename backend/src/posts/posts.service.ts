import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { hasPlaceTeamRoleAtLeast } from '../permissions/place-team-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsGateway } from './posts.gateway';

type PublicationScope = 'personal' | 'structure';

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

  private async canViewPost(
    post: {
      userId: string;
      visibility?: string | null;
      visibilityUserIds?: string[] | null;
    },
    currentUserId: string,
  ) {
    if (post.userId === currentUserId) {
      return true;
    }

    const visibility = post.visibility || 'public';

    if (visibility === 'public') {
      return true;
    }

    if (visibility === 'private') {
      return false;
    }

    if (visibility === 'custom') {
      return (post.visibilityUserIds || []).includes(currentUserId);
    }

    if (visibility === 'friends') {
      const connections = await this.getConnectionIds(currentUserId);
      return connections.includes(post.userId);
    }

    return false;
  }

  private normalizePublicationScope(
    scope: string | null | undefined,
    fallback: PublicationScope = 'personal',
  ): PublicationScope {
    if (!scope) {
      return fallback;
    }

    const normalized = scope.trim().toLowerCase();
    if (normalized === 'personal' || normalized === 'structure') {
      return normalized;
    }

    throw new BadRequestException('Type de publication invalide.');
  }

  private async findPlaceTeamRole(placeId: string, userId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ role: string | null }>>`
      SELECT "role"
      FROM "PlaceTeamMember"
      WHERE "placeId" = ${placeId}::uuid
        AND "userId" = ${userId}::uuid
      LIMIT 1
    `;

    return rows[0]?.role || null;
  }

  private async ensureStructurePublicationPermission(
    userId: string,
    userRole: string,
    placeId: string,
  ) {
    const normalizedRole = userRole.toUpperCase();
    if (normalizedRole === 'ADMIN') {
      return;
    }

    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!place) {
      throw new NotFoundException('Lieu introuvable.');
    }

    if (normalizedRole === 'PLACE_OWNER' && place.ownerId === userId) {
      return;
    }

    const placeTeamRole = await this.findPlaceTeamRole(place.id, userId);
    if (hasPlaceTeamRoleAtLeast(placeTeamRole, 'STAFF')) {
      return;
    }

    throw new ForbiddenException(
      'Vous n etes pas autorise a publier un post de structure pour ce lieu.',
    );
  }

  async create(
    userId: string,
    userRole: string,
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
        const parsed: unknown = JSON.parse(value);
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
    const publicationScope = this.normalizePublicationScope(
      createPostDto.publicationScope,
      'personal',
    );
    const visibilityUsers = parseVisibilityUsers(
      createPostDto.visibilityUserIds,
    );
    const normalizedPlaceId = normalizeId(createPostDto.placeId);
    if (publicationScope === 'structure') {
      if (!normalizedPlaceId) {
        throw new BadRequestException(
          'Un post de structure doit etre rattache a un lieu.',
        );
      }
      await this.ensureStructurePublicationPermission(
        userId,
        userRole,
        normalizedPlaceId,
      );
    }
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
        publicationScope,
        visibility: effectiveVisibility,
        postType: computedPostType,
        visibilityUserIds:
          effectiveVisibility === 'custom' ? filteredVisibilityUsers : [],
        placeId: normalizedPlaceId || undefined,
        eventId: normalizeId(createPostDto.eventId) || undefined,
        placeName: normalizeText(createPostDto.placeName) || undefined,
        cityName: normalizeText(createPostDto.cityName) || undefined,
        ambiance: normalizeText(createPostDto.ambiance) || undefined,
        images: imageUrls,
      } as Prisma.PostUncheckedCreateInput & { publicationScope?: string },
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
            coverUrl: true,
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
            coverUrl: true,
            images: true,
            Place: {
              select: {
                id: true,
                name: true,
                coverUrl: true,
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

    return postForFeed ? this.serializePost(postForFeed, userId) : created;
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
            coverUrl: true,
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

  async findAllByPlace(placeId: string, userId: string, userRole: string) {
    await this.ensureStructurePublicationPermission(userId, userRole, placeId);

    const posts = await this.prisma.post.findMany({
      where: {
        placeId,
        publicationScope: 'structure',
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
            coverUrl: true,
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
          where: { userId },
          select: { userId: true },
        },
      },
    });

    return posts.map((post) => this.serializePost(post, userId));
  }

  async findOneForUser(id: string, currentUserId: string) {
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
            coverUrl: true,
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

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    const canView = await this.canViewPost(post, currentUserId);
    if (!canView) {
      throw new ForbiddenException('You are not allowed to view this post');
    }

    return this.serializePost(post, currentUserId);
  }

  async incrementShareCount(id: string, currentUserId: string) {
    await this.findOneForUser(id, currentUserId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({
        where: { id },
        data: {
          shareCount: { increment: 1 },
        },
        select: {
          shareCount: true,
        },
      });

      await tx.$executeRaw`
        INSERT INTO "PostShareEvent" ("postId", "userId")
        VALUES (${id}::uuid, ${currentUserId}::uuid)
      `;

      return updated;
    });
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
            coverUrl: true,
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

  async getShareAnalytics() {
    const [aggregate, topShared] = await Promise.all([
      this.prisma.post.aggregate({
        _sum: { shareCount: true },
      }),
      this.prisma.post.findMany({
        where: { shareCount: { gt: 0 } },
        orderBy: { shareCount: 'desc' },
        take: 5,
        select: {
          id: true,
          content: true,
          shareCount: true,
          placeName: true,
          cityName: true,
          createdAt: true,
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
                select: { name: true },
              },
            },
          },
          Event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      totalShares: aggregate._sum.shareCount ?? 0,
      topShared,
    };
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
              coverUrl: true,
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
            coverUrl: true,
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
                coverUrl: true,
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
      select: {
        id: true,
        userId: true,
        visibility: true,
        visibilityUserIds: true,
        images: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You are not allowed to delete this post');
    }

    const deletedPost = await this.prisma.post.delete({
      where: { id },
    });

    const audience =
      post.visibility === 'public'
        ? { type: 'public' as const }
        : {
            type: 'users' as const,
            userIds: await this.getPostAudienceUserIds(post),
          };

    this.postsGateway.emitDeletedPost(post, audience);

    if (Array.isArray(post.images) && post.images.length > 0) {
      void this.storageService.deleteFiles(post.images);
    }

    return deletedPost;
  }

  async update(
    id: string,
    userId: string,
    userRole: string,
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
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === 'string')
          : [];
      } catch {
        return [];
      }
    };
    const { existingImages, visibilityUserIds, publicationScope, ...rest } =
      updatePostDto;
    const nextPublicationScope = this.normalizePublicationScope(
      publicationScope,
      this.normalizePublicationScope(
        (post as { publicationScope?: string | null }).publicationScope,
        'personal',
      ),
    );

    let retainedImages: string[] = [];
    if (existingImages) {
      try {
        const parsed: unknown = JSON.parse(existingImages);
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

    const data: Prisma.PostUncheckedUpdateInput & {
      publicationScope?: string;
    } = {
      ...rest,
      publicationScope: nextPublicationScope,
    };

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

    const nextPlaceId = (() => {
      if (rest.placeId !== undefined) {
        const normalized = normalizeId(rest.placeId);
        return normalized ? normalized : null;
      }
      return post.placeId || null;
    })();

    if (nextPublicationScope === 'structure') {
      if (!nextPlaceId) {
        throw new BadRequestException(
          'Un post de structure doit etre rattache a un lieu.',
        );
      }

      await this.ensureStructurePublicationPermission(
        userId,
        userRole,
        nextPlaceId,
      );
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
