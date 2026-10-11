import { BadRequestException, Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, RATE_LIMIT, Subjects, UserErrors } from '@darnozom/shared-types';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RateLimit } from 'src/rate-limiter/rate-limiter.decorator';
import { OtpService } from '../../services/otp.service';
import { VerificationService } from '../../services/verification.service';
import { VerifyOtpDto } from '../../dto/verify-otp.dto';
import { SubmitIdentityDto } from '../../dto/submit-identity.dto';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';

@ApplyRpcErrorHandling
@Controller()
export class VerificationControllerMessage {
  constructor(
    private readonly otpService: OtpService,
    private readonly verificationService: VerificationService
  ) {}

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.VERIFICATION_STATUS })
  @MessagePattern('verification.getStatus')
  async getStatus(@Ctx() context: IUserContext) {
    const organizationId = context.userPayload.organizationId;
    if (!organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    return this.verificationService.getVerificationStatus(organizationId.toString());
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.VERIFICATION })
  @RateLimit({ ttlSeconds: RATE_LIMIT.OTP_SEND.TTL_SECONDS, maxRequests: RATE_LIMIT.OTP_SEND.MAX_REQUESTS })
  @MessagePattern('verification.sendEmailOtp')
  async sendEmailOtp(@Ctx() context: IUserContext) {
    const organizationId = context.userPayload.organizationId;
    if (!organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    return this.otpService.sendOtp(organizationId.toString());
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.VERIFICATION })
  @RateLimit({ ttlSeconds: RATE_LIMIT.OTP_VERIFY.TTL_SECONDS, maxRequests: RATE_LIMIT.OTP_VERIFY.MAX_REQUESTS })
  @MessagePattern('verification.verifyEmailOtp')
  async verifyEmailOtp(@Payload(new RpcValidationPipe()) payload: VerifyOtpDto, @Ctx() context: IUserContext) {
    const organizationId = context.userPayload.organizationId;
    if (!organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    return this.otpService.verifyOtp(organizationId.toString(), payload.otp);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.VERIFICATION })
  @MessagePattern('verification.submitIdentity')
  async submitIdentity(@Payload(new RpcValidationPipe()) payload: SubmitIdentityDto, @Ctx() context: IUserContext) {
    const organizationId = context.userPayload.organizationId;
    if (!organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    return this.verificationService.submitIdentityVerification(organizationId.toString(), payload.documentType, payload.fileKeys);
  }
}
