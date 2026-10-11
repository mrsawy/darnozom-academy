import { Controller, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../auth.service';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { RpcValidationPipe } from '../../../utils/RpcValidationPipe';
import { RegisterDto } from '../../dto/register.dto';
import { LoginDto } from '../../dto/login.dto';
import { RefreshDto } from '../../dto/refresh.dto';
import { ForgotPasswordDto } from '../../dto/forgot-password.dto';
import { ResetPasswordDto } from '../../dto/reset-password.dto';
import { VerifyPasswordResetOtpDto } from '../../dto/verify-password-reset-otp.dto';
import { CompleteOnboardingDto } from '../../dto/complete-onboarding.dto';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RateLimit } from 'src/rate-limiter/rate-limiter.decorator';
import { RATE_LIMIT } from '@darnozom/shared-types';

@ApplyRpcErrorHandling
@Controller()
export class AuthControllerMessage {
  constructor(private authService: AuthService) {}

  @MessagePattern('auth.register')
  async register(
    @Payload(new RpcValidationPipe())
    registerDto: RegisterDto
  ) {
    try {
      return await this.authService.register(registerDto);
    } catch (error) {
      // Convert NestJS exceptions to RpcException for microservice context
      if (error instanceof ConflictException) {
        throw new RpcException({
          message: error.message,
          code: 409,
          error: 'Conflict',
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        code: 500,
        error: 'Internal Server Error',
      });
    }
  }

  @MessagePattern('auth.login')
  async login(
    @Payload(new RpcValidationPipe())
    loginDto: LoginDto
  ) {
    try {
      return await this.authService.login(loginDto);
    } catch (error) {
      // Convert NestJS exceptions to RpcException for microservice context
      if (error instanceof UnauthorizedException) {
        throw new RpcException({
          message: error.message,
          status: 401,
          error: 'Unauthorized',
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        status: 500,
        error: 'Internal Server Error',
      });
    }
  }

  @MessagePattern('auth.refresh')
  async refresh(
    @Payload(new RpcValidationPipe())
    refreshDto: RefreshDto
  ) {
    try {
      return await this.authService.refreshTokens(refreshDto.refreshToken);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new RpcException({
          message: error.message,
          status: 401,
          error: 'Unauthorized',
        });
      }
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        status: 500,
        error: 'Internal Server Error',
      });
    }
  }

  @RateLimit({ ttlSeconds: RATE_LIMIT.PASSWORD_RESET_SEND.TTL_SECONDS, maxRequests: RATE_LIMIT.PASSWORD_RESET_SEND.MAX_REQUESTS })
  @MessagePattern('auth.forgotPassword')
  async forgotPassword(
    @Payload(new RpcValidationPipe())
    forgotPasswordDto: ForgotPasswordDto
  ) {
    try {
      return await this.authService.requestPasswordReset(forgotPasswordDto.email, forgotPasswordDto.client);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        status: 400,
        error: 'Bad Request',
      });
    }
  }

  @RateLimit({ ttlSeconds: RATE_LIMIT.PASSWORD_RESET_VERIFY.TTL_SECONDS, maxRequests: RATE_LIMIT.PASSWORD_RESET_VERIFY.MAX_REQUESTS })
  @MessagePattern('auth.verifyPasswordResetOtp')
  async verifyPasswordResetOtp(
    @Payload(new RpcValidationPipe())
    dto: VerifyPasswordResetOtpDto
  ) {
    try {
      return await this.authService.verifyPasswordResetOtp(dto.email, dto.otp);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        status: 400,
        error: 'Bad Request',
      });
    }
  }

  @RateLimit({ ttlSeconds: RATE_LIMIT.PASSWORD_RESET_VERIFY.TTL_SECONDS, maxRequests: RATE_LIMIT.PASSWORD_RESET_VERIFY.MAX_REQUESTS })
  @MessagePattern('auth.resetPassword')
  async resetPassword(
    @Payload(new RpcValidationPipe())
    resetPasswordDto: ResetPasswordDto
  ) {
    try {
      return await this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.email, resetPasswordDto.newPassword);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        status: 400,
        error: 'Bad Request',
      });
    }
  }

  /**
   * Completes the onboarding flow for a GUEST user who signed up via Google.
   * Payload must include `authorization` (JWT) so the guard can resolve the user.
   */
  @MessagePattern('auth.completeOnboarding')
  async completeOnboarding(
    @Payload(new RpcValidationPipe())
    payload: CompleteOnboardingDto & { authorization: string }
  ) {
    const { authorization, ...dto } = payload;
    // `authorization` is validated by AuthGuard inside AuthService.verifyToken —
    // the RPC context carries it just like every other authorized NATS request.
    const user = await this.authService.verifyToken(authorization);
    const userId = (user as unknown as { _id: { toString(): string } })._id.toString();
    return await this.authService.completeOnboarding(userId, dto as CompleteOnboardingDto);
  }
}
