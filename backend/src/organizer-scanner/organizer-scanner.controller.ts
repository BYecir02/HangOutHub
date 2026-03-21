import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { VerifyScanDto } from './dto/verify-scan.dto';
import { OrganizerScannerService } from './organizer-scanner.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
    role: string;
  };
}

@Controller('organizer/scanner')
export class OrganizerScannerController {
  constructor(
    private readonly organizerScannerService: OrganizerScannerService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('verify')
  verify(@Req() req: AuthenticatedRequest, @Body() dto: VerifyScanDto) {
    return this.organizerScannerService.verify(
      req.user.userId,
      req.user.role,
      dto,
    );
  }
}
