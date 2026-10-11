'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  IVerificationStatusResponse,
  IVerificationOrg,
} from '@/lib/types/verification/verification.interface';
import type { Paginated, PaginationOptions } from '@/lib/types/Paginated';
import { withDefaults } from '@/lib/types/Paginated';
import { IdentityDocumentType } from '@darnozom/shared-types';

// ─── Organization Verification ──────────────────────────────────────

export async function getVerificationStatus() {
  return createAuthorizedNatsRequest<IVerificationStatusResponse>('verification.getStatus', {});
}

export async function sendEmailOtp() {
  return createAuthorizedNatsRequest<{ message: string }>('verification.sendEmailOtp', {});
}

export async function verifyEmailOtp(otp: string) {
  return createAuthorizedNatsRequest<{ message: string }>('verification.verifyEmailOtp', { otp });
}

export async function submitIdentityVerification(
  documentType: IdentityDocumentType,
  fileKeys: string[]
) {
  return createAuthorizedNatsRequest<{ message: string }>('verification.submitIdentity', {
    documentType,
    fileKeys,
  });
}

// ─── Admin Review: Identity Verification ────────────────────────────

export async function getPendingVerifications(options: PaginationOptions) {
  const payload = withDefaults(options);
  return createAuthorizedNatsRequest<Paginated<IVerificationOrg>>(
    'adminReview.getPendingVerifications',
    { options: payload }
  );
}

export async function getVerificationDetail(orgId: string) {
  return createAuthorizedNatsRequest<IVerificationOrg>('adminReview.getVerificationDetail', {
    orgId,
  });
}

export async function approveIdentityVerification(orgId: string) {
  return createAuthorizedNatsRequest<IVerificationOrg>('adminReview.approveIdentityVerification', {
    orgId,
  });
}

export async function rejectIdentityVerification(orgId: string, comment: string) {
  return createAuthorizedNatsRequest<IVerificationOrg>('adminReview.rejectIdentityVerification', {
    orgId,
    comment,
  });
}
