import { IsEmail, IsString, MinLength, IsOptional, IsPhoneNumber, IsInt } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsEmail({}, { message: 'L’email n’est pas valide' })
  email: string;

  @IsString()
  // @IsPhoneNumber('BJ') 
  phoneNumber: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit faire au moins 6 caractères' })
  password: string;

  @IsOptional()
  @IsInt()
  residenceCityId?: number; 
}