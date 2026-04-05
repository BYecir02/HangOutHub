import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateEventBookingDto {
  @IsOptional()
  @IsUUID()
  ticketTypeId?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsString()
  @IsUUID()
  @MaxLength(64)
  clientRequestId!: string;
}
