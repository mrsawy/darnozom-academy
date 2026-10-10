import type { PasswordResetClient } from './password-reset-client.enum';

export interface ForgotPasswordPayload {
  email: string;
  /** Defaults to {@link PasswordResetClient.WEB} on the server. */
  client?: PasswordResetClient;
}

export interface VerifyPasswordResetOtpPayload {
  email: string;
  otp: string;
}

export interface VerifyPasswordResetOtpResponse {
  message: string;
  resetToken: string;
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  newPassword: string;
}

export interface PasswordResetMessageResponse {
  message: string;
}
