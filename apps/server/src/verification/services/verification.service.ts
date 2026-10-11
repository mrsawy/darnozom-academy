import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApprovalStatus, VerificationStatus, IdentityDocumentType } from '@darnozom/shared-types';
import { Organization } from 'src/organization/entities/organization.entity';
import { isOrgFullyVerified } from 'src/utils/verification.utils';

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<Organization>
  ) {}

  async getVerificationStatus(organizationId: string) {
    const org = await this.organizationModel.findById(organizationId);
    if (!org) throw new NotFoundException('Organization not found');

    const plain = org.toObject().verification;
    const { failedAttempts: _fa, lockedUntil: _lu, ...safeEmail } = plain?.email ?? {};

    return {
      verification: {
        email: safeEmail,
        identity: plain?.identity,
      },
      isFullyVerified: isOrgFullyVerified(org),
      approvalStatus: org.approvalStatus,
      approvalComment: org.approvalComment,
      approvalReviewedAt: org.approvalReviewedAt,
    };
  }

  async submitIdentityVerification(organizationId: string, documentType: IdentityDocumentType, fileKeys: string[]) {
    const org = await this.organizationModel.findById(organizationId);
    if (!org) throw new NotFoundException('Organization not found');

    const currentStatus = org.verification?.identity?.status;
    if (currentStatus === VerificationStatus.PENDING) {
      throw new BadRequestException('Identity verification is already pending review');
    }
    if (currentStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Identity is already verified');
    }

    org.verification = {
      ...org.verification,
      identity: {
        status: VerificationStatus.PENDING,
        documentType,
        fileKeys,
        rejectionMessage: null,
        submittedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
      },
    };
    // Submitting (or re-submitting after rejection) puts the account back into
    // the platform-admin approval queue.
    if (org.approvalStatus !== ApprovalStatus.APPROVED) {
      org.approvalStatus = ApprovalStatus.PENDING;
      org.approvalComment = null;
    }
    await org.save();

    return { message: 'Identity verification submitted successfully' };
  }
}
