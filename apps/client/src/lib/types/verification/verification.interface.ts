import {
  VerificationStatus,
  IdentityDocumentType,
  ApprovalStatus,
} from '@darnozom/shared-types';

export interface IEmailVerification {
  verified: boolean;
  verifiedAt: string | null;
}

export interface IIdentityVerification {
  status: VerificationStatus;
  documentType: IdentityDocumentType | null;
  fileKeys: string[];
  rejectionMessage: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface IVerification {
  email: IEmailVerification;
  identity: IIdentityVerification;
}

export interface IVerificationStatusResponse {
  verification: IVerification;
  isFullyVerified: boolean;
  approvalStatus: ApprovalStatus;
  approvalComment: string | null;
  approvalReviewedAt: string | null;
}

export interface IVerificationOrg {
  _id: string;
  name: string;
  slug: string;
  verification: IVerification;
  superAdmin?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
  };
  identityFileUrls?: string[];
}
