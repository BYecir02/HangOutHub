import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlaceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty() // Je le laisse obligatoire dans l'API même si nullable en DB, c'est mieux pour une map
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number) // Convertit "6.37" (string) en 6.37 (float)
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(4) // Généralement 1=Peu cher, 4=Très cher
  priceLevel?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cityId?: number; // Si le front ne l'envoie pas, on mettra 1 par défaut côté service
}
