// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\backend\src\auth\dto\register-organizer.dto.ts
import { IsString, IsNotEmpty, IsIn } from 'class-validator';
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
}
