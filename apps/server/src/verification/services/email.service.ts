import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') ?? 'noreply@example.com';
  }

  async sendPasswordResetEmail(to: string, resetLink: string, userName?: string): Promise<void> {
    try {
      const greeting = userName ? `Hello ${userName},` : 'Hello,';
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Reset your password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a1a;">Password Reset Request</h2>
            <p>${greeting}</p>
            <p>We received a request to reset your account password. Click the button below to choose a new password:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #71717a; font-size: 14px;">This link expires in 15 minutes. If you did not request a password reset, please ignore this email — your account is safe.</p>
            <p style="color: #71717a; font-size: 12px; margin-top: 16px;">If the button does not work, copy and paste the following link into your browser:<br/><a href="${resetLink}" style="color: #1a1a1a;">${resetLink}</a></p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend API error sending password reset email to ${to}`, error);
        const detail =
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Email provider rejected the send request';
        throw new Error(detail);
      }
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      throw error;
    }
  }

  async sendPasswordResetOtpEmail(to: string, otp: string, userName?: string): Promise<void> {
    try {
      const greeting = userName ? `Hello ${userName},` : 'Hello,';
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Your password reset code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a1a;">Password Reset Code</h2>
            <p>${greeting}</p>
            <p>Use the following code in the app to reset your password:</p>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #1a1a1a;">${otp}</span>
            </div>
            <p style="color: #71717a; font-size: 14px;">This code expires in 15 minutes. If you did not request a password reset, please ignore this email — your account is safe.</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend API error sending password reset OTP to ${to}`, error);
        const detail =
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Email provider rejected the send request';
        throw new Error(detail);
      }
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP email to ${to}`, error);
      throw error;
    }
  }

  async sendOtpEmail(to: string, otp: string, organizationName: string): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Your verification code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a1a;">Email Verification</h2>
            <p>Hello,</p>
            <p>Use the following code to verify the email address for <strong>${organizationName}</strong>:</p>
            <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #1a1a1a;">${otp}</span>
            </div>
            <p style="color: #71717a; font-size: 14px;">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend API error sending OTP to ${to}`, error);
        const detail =
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Email provider rejected the send request';
        throw new Error(detail);
      }
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      throw error;
    }
  }
}
