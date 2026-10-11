import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { PasswordResetClient } from '@darnozom/shared-types';

export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  /** `mobile` sends a 6-digit OTP; `web` (default) sends a reset link. */
  @IsOptional()
  @IsEnum(PasswordResetClient)
  client?: PasswordResetClient;
}
