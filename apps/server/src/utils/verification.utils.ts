import { ApprovalStatus, OrganizationErrors, VerificationStatus } from '@lms-organization/shared-types';
import { ForbiddenException } from '@nestjs/common';
import { Organization } from 'src/organization/entities/organization.entity';

export function isOrgFullyVerified(org: Organization | null | undefined): boolean {
  return org?.verification?.email?.verified === true && org?.verification?.identity?.status === VerificationStatus.VERIFIED;
}

/**
 * True once a platform admin has approved the organization account. Approved
 * orgs may create content and their content is auto-approved (no per-post
 * review); pending/rejected orgs may not create content.
 */
export function isOrgApproved(org: Organization | null | undefined): boolean {
  return org?.approvalStatus === ApprovalStatus.APPROVED;
}

/**
 * Guards content-creation paths: throws when the org account has not been
 * approved by a platform admin yet.
 */
export function assertOrgApproved(org: Organization | null | undefined): void {
  if (!isOrgApproved(org)) {
    throw new ForbiddenException(OrganizationErrors.ACCOUNT_PENDING_APPROVAL);
  }
}
