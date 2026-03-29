import { Module } from '@nestjs/common';

import { OrganizerScannerController } from './organizer-scanner.controller';
import { OrganizerScannerService } from './organizer-scanner.service';

@Module({
  controllers: [OrganizerScannerController],
  providers: [OrganizerScannerService],
})
export class OrganizerScannerModule {}
