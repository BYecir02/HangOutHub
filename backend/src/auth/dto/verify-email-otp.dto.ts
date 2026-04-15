import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail({}, { message: "L'email n'est pas valide" })
  email: string;

  @IsString()
  @Length(4, 8)
  code: string;
}
