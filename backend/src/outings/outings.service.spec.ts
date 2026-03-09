import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { OutingsService } from './outings.service';

describe('OutingsService', () => {
  let service: OutingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutingsService,
        {
          provide: PrismaService,
          useValue: {
            place: { findUnique: jest.fn() },
            outing: { create: jest.fn(), findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<OutingsService>(OutingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
