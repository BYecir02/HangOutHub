import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsNumber,
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

  // Note : Dans ton schéma, l'Event n'est pas lié directement à Category,
  // mais via des Tags. On verra ça après, restons simple pour la création.
}
