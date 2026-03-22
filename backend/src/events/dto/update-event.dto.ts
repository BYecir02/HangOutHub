import {
  IsDateString,
  IsIn,
  IsInt,
  Max,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsString()
  refundPolicy?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  entryFee?: number;

  @IsOptional()
  @IsUUID()
  placeId?: string;

  @IsOptional()
  @IsString()
  ticketTypes?: string;

  @IsOptional()
  @IsString()
  existingImages?: string;

  @IsOptional()
  @IsString()
  existingCoverUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  checkInOpensAtOffsetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  checkInClosesAtOffsetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxTicketsPerUser?: number;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsIn(['PERCENT', 'FIXED'])
  promoType?: 'PERCENT' | 'FIXED';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  promoValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  promoMaxRedemptions?: number;

  @IsOptional()
  @IsDateString()
  promoEndsAt?: string;
}
