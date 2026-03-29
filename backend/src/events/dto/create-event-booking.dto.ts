import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEventBookingDto {
  @IsOptional()
  @IsUUID()
  ticketTypeId?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
