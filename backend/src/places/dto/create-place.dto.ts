import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlaceDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  openingHours?: string;

  // Horaires structurés, transmis en chaîne JSON (parsés/validés côté service).
  @IsOptional()
  @IsString()
  openingHoursStructured?: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(4)
  priceLevel?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cityId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  moderationStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  externalProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalProviderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalUrl?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  providerLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  providerLongitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  providerMatchConfidence?: number;

  @IsOptional()
  @IsString()
  tagIds?: string;
}
