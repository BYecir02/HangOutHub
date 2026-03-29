import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PostsGateway } from './posts.gateway';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: PrismaService;

  // On crée un "faux" PrismaService (Mock)
  // Cela évite d'écrire dans la vraie base de données pendant les tests
  const mockPrismaService = {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    postLike: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    postComment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const mockStorageService = {
    uploadFile: jest.fn(),
    uploadFiles: jest.fn(),
  };
  const mockPostsGateway = {
    emitNewPost: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService, // On injecte notre mock ici
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: PostsGateway,
          useValue: mockPostsGateway,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('doit créer un post et retourner le résultat', async () => {
      // 1. ARRANGE (Préparation)
      const userId = 'user-123';
      const userRole = 'USER';
      const createPostDto = { content: 'Hello World', visibility: 'public' };
      const files = []; // Pas d'images pour ce test
      const expectedResult = {
        id: 'post-1',
        ...createPostDto,
        userId,
        images: [],
      };

      // On configure le mock pour qu'il retourne une valeur précise quand on l'appelle
      (prisma.post.create as jest.Mock).mockResolvedValue(expectedResult);

      // 2. ACT (Action)
      await expect(
        service.create(userId, userRole, createPostDto, files),
      ).resolves.toEqual(expectedResult);

      // 3. ASSERT (Vérification)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prisma.post.create).toHaveBeenCalledTimes(1);

      const createCalls = (prisma.post.create as jest.Mock).mock
        .calls as unknown[][];
      const firstCreateCallArg = createCalls[0]?.[0] as {
        data?: {
          userId?: string;
          content?: string;
          visibility?: string;
          images?: unknown[];
        };
      };

      expect(firstCreateCallArg.data?.userId).toBe(userId);
      expect(firstCreateCallArg.data?.content).toBe('Hello World');
      expect(firstCreateCallArg.data?.visibility).toBe('public');
      expect(firstCreateCallArg.data?.images).toEqual([]);
    });
  });
});
