import { IsEmail } from 'class-validator';

export class RequestEmailVerificationDto {
  @IsEmail({}, { message: "L'email n'est pas valide" })
  email: string;
}
