import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { PASSWORD_RESET } from '@darnozom/shared-types';

export class VerifyPasswordResetOtpDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(PASSWORD_RESET.OTP_LENGTH, PASSWORD_RESET.OTP_LENGTH)
  @Matches(new RegExp(String.raw`^\d{${PASSWORD_RESET.OTP_LENGTH}}$`))
  otp: string;
}
