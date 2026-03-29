// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\backend\src\auth\dto\register-organizer.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';

export class RegisterOrganizerDto extends CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['PLACE', 'NOMAD'], {
    message: 'Le type de compte doit être PLACE ou NOMAD',
  })
  accountType: string; // "PLACE" (Lieu physique) ou "NOMAD" (Promoteur)

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  ifuNumber: string;

  @IsString()
  @IsNotEmpty()
  payoutInfo: string; // Mobile Money ou IBAN

  @IsString()
  @IsNotEmpty()
  jobTitle: string; // Patron, Manager, Chargé de Com'

  @IsOptional()
  @IsString()
  @MaxLength(255)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tiktokUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  xUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  websiteUrl?: string;
}
