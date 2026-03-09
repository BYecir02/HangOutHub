import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { CreateOutingDto } from './dto/create-outing.dto';
import { OutingsService } from './outings.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

@Controller('outings')
@UseGuards(AuthGuard('jwt'))
export class OutingsController {
  constructor(private readonly outingsService: OutingsService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createOutingDto: CreateOutingDto,
  ) {
    return this.outingsService.create(req.user.userId, createOutingDto);
  }

  @Get('mine')
  findMine(@Request() req: AuthenticatedRequest) {
    return this.outingsService.findMine(req.user.userId);
  }
}
