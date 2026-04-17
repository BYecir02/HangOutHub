import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNumber,
  IsInt,
  IsIn,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  title: string;

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
  @IsString()
  address?: string;

  @IsNotEmpty()
  @IsDateString()
  startTime: string; // Le frontend envoie une ISO string (ex: "2024-05-20T20:00:00Z")

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @Type(() => Number) // Convertit "10.50" en nombre
  @IsNumber()
  @Min(0)
  entryFee?: number;

  @IsOptional()
  @IsUUID()
  placeId?: string; // Si l'événement se passe dans un lieu référencé (Bar, etc.)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cityId?: number;

  @IsOptional()
  @IsString()
  ticketTypes?: string;

  @IsOptional()
  @IsString()
  tagIds?: string;

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
