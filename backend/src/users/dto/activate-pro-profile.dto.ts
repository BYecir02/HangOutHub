import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ActivateProProfileDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['PLACE', 'NOMAD'], {
    message: 'Le type de compte doit etre PLACE ou NOMAD.',
  })
  accountType: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  ifuNumber: string;

  @IsString()
  @IsNotEmpty()
  payoutInfo: string;

  @IsString()
  @IsNotEmpty()
  jobTitle: string;

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
