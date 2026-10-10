import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomInt } from 'node:crypto';
import { compare, hash } from 'bcrypt';
import { RATE_LIMIT, UserErrors, VerificationErrors, VerificationSuccessMessages } from '@lms-organization/shared-types';
import { Organization } from 'src/organization/entities/organization.entity';
import { User } from 'src/user/entities/user.entity';
import { Otp } from '../entities/otp.entity';
import { EmailService } from './email.service';

const OTP_COOLDOWN_MS = 60_000;
const OTP_LENGTH = 6;

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<Otp>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly emailService: EmailService
  ) {}

  async sendOtp(organizationId: string): Promise<{ message: string }> {
    const org = await this.organizationModel.findById(organizationId);
    if (!org) throw new NotFoundException(UserErrors.ORGANIZATION_NOT_FOUND);

    if (org.verification?.email?.verified) {
      throw new BadRequestException(VerificationErrors.EMAIL_ALREADY_VERIFIED);
    }

    await this.assertNotLocked(org);

    const superAdmin = await this.userModel.findById(org.superAdminId);
    if (!superAdmin) throw new NotFoundException(VerificationErrors.ORGANIZATION_SUPER_ADMIN_NOT_FOUND);

    const lastOtp = await this.otpModel.findOne({ organizationId: org._id }, undefined, { sort: { createdAt: -1 } });

    if (lastOtp) {
      const elapsed = Date.now() - lastOtp.createdAt.getTime();
      if (elapsed < OTP_COOLDOWN_MS) {
        const remaining = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
        throw new BadRequestException(`${VerificationErrors.OTP_RESEND_COOLDOWN}|${remaining}`);
      }
    }

    await this.otpModel.deleteMany({ organizationId: org._id });

    const otp = this.generateOtp();
    const hashedOtp = await hash(otp, 10);

    await this.otpModel.create({
      organizationId: org._id,
      email: superAdmin.email,
      hashedOtp,
    });

    try {
      await this.emailService.sendOtpEmail(superAdmin.email, otp, org.name);
    } catch (err) {
      await this.otpModel.deleteMany({ organizationId: org._id });
      throw err;
    }

    return { message: VerificationSuccessMessages.VERIFICATION_CODE_SENT };
  }

  async verifyOtp(organizationId: string, otp: string): Promise<{ message: string }> {
    const org = await this.organizationModel.findById(organizationId);
    if (!org) throw new NotFoundException(UserErrors.ORGANIZATION_NOT_FOUND);

    if (org.verification?.email?.verified) {
      throw new BadRequestException(VerificationErrors.EMAIL_ALREADY_VERIFIED);
    }

    await this.assertNotLocked(org);

    const storedOtp = await this.otpModel.findOne({ organizationId: org._id }, undefined, { sort: { createdAt: -1 } });

    if (!storedOtp) {
      throw new BadRequestException(VerificationErrors.OTP_NOT_FOUND);
    }

    const isValid = await compare(otp, storedOtp.hashedOtp);
    if (!isValid) {
      await this.recordFailedAttempt(org);
      throw new BadRequestException(VerificationErrors.INVALID_VERIFICATION_CODE);
    }

    org.verification = {
      ...org.verification,
      email: {
        verified: true,
        verifiedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
      },
    };
    await org.save();

    await this.otpModel.deleteMany({ organizationId: org._id });

    return { message: VerificationSuccessMessages.EMAIL_VERIFIED_SUCCESS };
  }

  private async assertNotLocked(org: Organization): Promise<void> {
    const email = org.verification?.email;
    if (!email?.lockedUntil) return;

    if (new Date(email.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(email.lockedUntil).getTime() - Date.now()) / 60_000);
      throw new BadRequestException(`${VerificationErrors.OTP_ACCOUNT_LOCKED_MINUTES}|${remainingMinutes}`);
    }

    if (email.failedAttempts > 0) {
      org.verification = {
        ...org.verification,
        email: { ...email, failedAttempts: 0, lockedUntil: null },
      };
      await org.save();
    }
  }

  private async recordFailedAttempt(org: Organization): Promise<void> {
    const currentAttempts = (org.verification?.email?.failedAttempts ?? 0) + 1;
    const maxAttempts = RATE_LIMIT.OTP_BRUTE_FORCE.MAX_FAILED_ATTEMPTS;
    const lockoutMs = RATE_LIMIT.OTP_BRUTE_FORCE.LOCKOUT_DURATION_MS;

    org.verification =
      currentAttempts >= maxAttempts
        ? {
            ...org.verification,
            email: {
              ...org.verification.email,
              failedAttempts: currentAttempts,
              lockedUntil: new Date(Date.now() + lockoutMs),
            },
          }
        : {
            ...org.verification,
            email: {
              ...org.verification.email,
              failedAttempts: currentAttempts,
            },
          };
    await org.save();
  }

  private generateOtp(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
      otp += digits[randomInt(digits.length)];
    }
    return otp;
  }
}
