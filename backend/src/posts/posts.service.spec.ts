import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';

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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService, // On injecte notre mock ici
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
      const createPostDto = { content: 'Hello World', visibility: 'public' };
      const files = []; // Pas d'images pour ce test
      const expectedResult = { id: 'post-1', ...createPostDto, userId, images: [] };

      // On configure le mock pour qu'il retourne une valeur précise quand on l'appelle
      (prisma.post.create as jest.Mock).mockResolvedValue(expectedResult);

      // 2. ACT (Action)
      const result = await service.create(userId, createPostDto, files);

      // 3. ASSERT (Vérification)
      expect(result).toEqual(expectedResult); // Le résultat est-il celui attendu ?
      expect(prisma.post.create as jest.Mock).toHaveBeenCalledWith({ // La méthode create de Prisma a-t-elle été appelée avec les bons arguments ?
        data: {
          userId,
          content: 'Hello World',
          visibility: 'public',
          images: [],
        },
      });
    });
  });
});
