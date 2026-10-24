import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, Types } from 'mongoose';
import { ApprovalStatus, OrganizationErrors, VerificationStatus } from '@darnozom/shared-types';
import { Organization } from 'src/organization/entities/organization.entity';
import { User } from 'src/user/entities/user.entity';
import { FileService } from 'src/file/file.service';
import type { AdminPaginateDto } from '../dto/admin-paginate.dto';
import { AdminReviewSupport } from './admin-review.support';
import { OrgReviewNotificationService } from 'src/notification/services/org-review-notification.service';

@Injectable()
export class AdminReviewVerificationService {
  private readonly logger = new Logger(AdminReviewVerificationService.name);

  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: PaginateModel<Organization>,
    @InjectModel(User.name)
    private readonly userModel: PaginateModel<User>,
    private readonly fileService: FileService,
    private readonly support: AdminReviewSupport,
    private readonly orgReviewNotificationService: OrgReviewNotificationService
  ) {}

  async getPendingIdentityVerifications(dto: AdminPaginateDto) {
    const filter: FilterQuery<Organization> = {
      approvalStatus: ApprovalStatus.PENDING,
      'verification.identity.status': VerificationStatus.PENDING,
      ...this.support.buildSearchFilter<Organization>(dto.search, ['name']),
    };
    return this.organizationModel.paginate(filter, {
      ...this.support.extractPaginateOptions(dto),
      populate: ['superAdmin'],
      sort: { 'verification.identity.submittedAt': -1 },
    });
  }

  async getVerificationDetail(orgId: string) {
    const organization = await this.organizationModel.findById(orgId);
    if (!organization) throw new NotFoundException('Organization not found');

    const superAdmin = await this.userModel.findById(organization.superAdminId, '-password').lean();

    const fileUrls: string[] = [];
    if (organization.verification?.identity?.fileKeys?.length) {
      for (const key of organization.verification.identity.fileKeys) {
        const url = await this.fileService.getFileUrl(key);
        fileUrls.push(url);
      }
    }

    return {
      ...organization.toObject(),
      superAdmin,
      identityFileUrls: fileUrls,
    };
  }

  /** Approve the org account: verifies identity and activates the account. */
  async approveIdentityVerification(orgId: string, adminId: string) {
    const org = await this.organizationModel.findById(orgId);
    if (!org) throw new NotFoundException('Organization not found');

    if (org.verification?.identity?.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('No pending identity verification to approve');
    }
    if (!org.verification?.email?.verified) {
      throw new BadRequestException(OrganizationErrors.EMAIL_MUST_BE_VERIFIED_FIRST);
    }

    org.verification = {
      ...org.verification,
      identity: {
        ...org.verification.identity,
        status: VerificationStatus.VERIFIED,
        rejectionMessage: null,
        reviewedBy: new Types.ObjectId(adminId),
        reviewedAt: new Date(),
      },
    };
    org.approvalStatus = ApprovalStatus.APPROVED;
    org.approvalComment = null;
    org.approvalReviewedBy = new Types.ObjectId(adminId);
    org.approvalReviewedAt = new Date();
    await org.save();

    // Trigger notification to the organization super admin
    try {
      const superAdmin = await this.userModel.findById(org.superAdminId).lean();
      if (superAdmin?.email) {
        await this.orgReviewNotificationService.notifyOrgApproved({
          userId: superAdmin._id?.toString(),
          email: superAdmin.email,
          phone: superAdmin.phone,
          superAdminName: superAdmin.firstName ? `${superAdmin.firstName} ${superAdmin.lastName || ''}`.trim() : undefined,
          organizationName: org.name,
        });
      }
    } catch (notifErr) {
      this.logger.error(`Failed to dispatch approval notification for org ${orgId}: ${notifErr}`);
    }

    return org;
  }

  /** Reject the org account: marks identity rejected so the org can resubmit. */
  async rejectIdentityVerification(orgId: string, adminId: string, comment: string) {
    const org = await this.organizationModel.findById(orgId);
    if (!org) throw new NotFoundException('Organization not found');

    if (org.verification?.identity?.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('No pending identity verification to reject');
    }

    org.verification = {
      ...org.verification,
      identity: {
        ...org.verification.identity,
        status: VerificationStatus.REJECTED,
        rejectionMessage: comment || null,
        reviewedBy: new Types.ObjectId(adminId),
        reviewedAt: new Date(),
      },
    };
    org.approvalStatus = ApprovalStatus.REJECTED;
    org.approvalComment = comment || null;
    org.approvalReviewedBy = new Types.ObjectId(adminId);
    org.approvalReviewedAt = new Date();
    await org.save();

    // Trigger notification to the organization super admin
    try {
      const superAdmin = await this.userModel.findById(org.superAdminId).lean();
      if (superAdmin?.email) {
        await this.orgReviewNotificationService.notifyOrgRejected(
          {
            userId: superAdmin._id?.toString(),
            email: superAdmin.email,
            phone: superAdmin.phone,
            superAdminName: superAdmin.firstName ? `${superAdmin.firstName} ${superAdmin.lastName || ''}`.trim() : undefined,
            organizationName: org.name,
          },
          comment
        );
      }
    } catch (notifErr) {
      this.logger.error(`Failed to dispatch rejection notification for org ${orgId}: ${notifErr}`);
    }

    return org;
  }
}
