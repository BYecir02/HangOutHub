import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail({}, { message: "L'email n'est pas valide" })
  email: string;
}
