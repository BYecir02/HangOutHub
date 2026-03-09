import { Test, TestingModule } from '@nestjs/testing';

import { OutingsController } from './outings.controller';
import { OutingsService } from './outings.service';

describe('OutingsController', () => {
  let controller: OutingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutingsController],
      providers: [
        {
          provide: OutingsService,
          useValue: {
            create: jest.fn(),
            findMine: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OutingsController>(OutingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
