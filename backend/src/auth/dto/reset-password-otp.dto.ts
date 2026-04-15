import { IsEmail, IsString, Length } from 'class-validator';

export class ResetPasswordOtpDto {
  @IsEmail({}, { message: "L'email n'est pas valide" })
  email: string;

  @IsString()
  @Length(4, 8)
  code: string;

  @IsString()
  @Length(6, 128)
  password: string;
}
