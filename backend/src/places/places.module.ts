import { Module } from '@nestjs/common';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { EmailModule } from '../email/email.module';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService],
  imports: [EmailModule],
})
export class PlacesModule {}
