import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../auth.service';
import { LoginDto } from '../../dto/login.dto';
import { RegisterDto } from '../../dto/register.dto';
import { RefreshDto } from '../../dto/refresh.dto';
import { ForgotPasswordDto } from '../../dto/forgot-password.dto';
import { ResetPasswordDto } from '../../dto/reset-password.dto';
import { CompleteOnboardingDto } from '../../dto/complete-onboarding.dto';
import { OAuthProfileService, GoogleProfile } from '../../services/oauth-profile.service';
import { AuthSessionService } from '../../services/auth-session.service';
import { OAuthCodeService } from '../../services/oauth-code.service';
import { SkipOnboardingCheck } from '../../decorators/skip-onboarding-check.decorator';
import { AuthGuard } from '../../guards/auth.guard';
import { UserDocument } from '../../../user/entities/user.entity';
import { Role } from '../../../role/entities/role.entity';
import { AuthErrors } from '@islamic-academy/shared-types';
import { GoogleAuthGuard } from '../../guards/google-auth.guard';

interface RequestWithGoogleUser extends Request {
  user?: GoogleProfile;
}

interface RequestWithUser extends Request {
  user?: { _id: string; onboardingComplete?: boolean };
}

@Controller('auth')
export class AuthControllerHttp {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthProfileService: OAuthProfileService,
    private readonly authSessionService: AuthSessionService,
    private readonly oauthCodeService: OAuthCodeService,
    private readonly configService: ConfigService
  ) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() { refreshToken }: RefreshDto) {
    return this.authService.refreshTokens(refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.email, dto.newPassword);
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  @Get('google')
  @SkipOnboardingCheck()
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {
    // Passport redirects to Google; body is never reached.
  }

  @Get('google/callback')
  @SkipOnboardingCheck()
  @UseGuards(PassportAuthGuard('google'))
  async googleCallback(@Req() req: RequestWithGoogleUser, @Res() res: Response): Promise<void> {
    const profile = req.user;
    if (!profile) {
      throw new UnauthorizedException(AuthErrors.GOOGLE_AUTH_FAILED);
    }

    const user = await this.oauthProfileService.findOrCreateGoogleUser(profile);
    const previousSid = (user as unknown as { activeSessionId?: string }).activeSessionId ?? null;

    const tokens = await this.authSessionService.rotateSessionAndIssueTokens(user as UserDocument & { role: Role }, previousSid);

    const onboardingRequired = (tokens.user as { onboardingComplete?: boolean }).onboardingComplete === false;
    const code = this.oauthCodeService.generate({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      sid: tokens.sid,
      onboarding_required: onboardingRequired,
    });

    const baseUrl = this.configService.get<string>('OAUTH_SUCCESS_REDIRECT_URL');
    const separator = baseUrl?.includes('?') ? '&' : '?';
    res.redirect(`${baseUrl}${separator}oauth_code=${encodeURIComponent(code)}`);
  }

  /**
   * Exchanges a short-lived one-time oauth_code for the actual access/refresh tokens.
   * Prevents tokens from appearing in browser history, server logs, and referrer headers.
   */
  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  @SkipOnboardingCheck()
  exchangeOAuthCode(@Body() body: { oauth_code: string }) {
    return this.oauthCodeService.exchange(body.oauth_code);
  }

  // ── Onboarding ────────────────────────────────────────────────────────────

  /**
   * Completes the onboarding flow for GUEST users that signed up via Google.
   * Requires a valid JWT (from the initial OAuth tokens). The AuthGuard populates
   * req.user; OnboardingGuard is skipped so a not-yet-onboarded user can reach this.
   */
  @Post('onboarding/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @SkipOnboardingCheck()
  async completeOnboarding(@Req() req: RequestWithUser, @Body() dto: CompleteOnboardingDto) {
    const userId = req.user?._id;
    if (!userId) throw new UnauthorizedException(AuthErrors.GOOGLE_AUTH_FAILED);
    return this.authService.completeOnboarding(userId, dto);
  }
}
