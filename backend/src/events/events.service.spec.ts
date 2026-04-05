import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('EventsService', () => {
  let service: EventsService;
  let prismaMock: {
    event: { findUnique: jest.Mock };
    booking: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    ticketType: { updateMany: jest.Mock };
    promotion: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      event: {
        findUnique: jest.fn(),
      },
      booking: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      ticketType: {
        updateMany: jest.fn(),
      },
      promotion: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            uploadFiles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns an existing booking for the same client request id', async () => {
    prismaMock.event.findUnique.mockResolvedValue({
      id: 'event-1',
      placeId: null,
      organizerId: 'organizer-1',
      title: 'Event test',
      startTime: new Date('2026-04-05T12:00:00.000Z'),
      endTime: null,
      maxTicketsPerUser: 1,
      entryFee: 0,
      Promotion: [],
      TicketType: [],
    });
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      userId: 'user-1',
      eventId: 'event-1',
      ticketTypeId: null,
      clientRequestId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'CONFIRMED',
      qrCode: 'qr-1',
      Event: {
        id: 'event-1',
        title: 'Event test',
        startTime: new Date('2026-04-05T12:00:00.000Z'),
        endTime: null,
        coverUrl: null,
        organizerId: 'organizer-1',
        Place: null,
      },
      TicketType: null,
    });

    const result = await service.createBooking('user-1', 'event-1', {
      clientRequestId: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result).toMatchObject({
      id: 'booking-1',
      status: 'CONFIRMED',
      qrCode: 'qr-1',
    });
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
