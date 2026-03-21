import { IsOptional, IsUUID } from 'class-validator';

export class CreateEventBookingDto {
  @IsOptional()
  @IsUUID()
  ticketTypeId?: string;
}