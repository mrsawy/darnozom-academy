import { ApprovalStatus } from '../approval/approval-status.enum';
import { EntityStatus } from '../entity-status/entity-status.enum';
import { VerificationStatus } from '../verification/verification-status.enum';
import { IdentityDocumentType } from '../verification/identity-document-type.enum';

export interface IOrganizationBranding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface IOrganizationSettings {
  branding: IOrganizationBranding;
}

export interface IOrganizationStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
}

export interface IOrganizationVerification {
  email: {
    verified: boolean;
    verifiedAt: Date | null;
    failedAttempts: number;
    lockedUntil: Date | null;
  };
  identity: {
    status: VerificationStatus;
    documentType: IdentityDocumentType | null;
    fileKeys: string[];
    rejectionMessage: string | null;
    submittedAt: Date | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
  };
}

export interface IOrganization {
  name: string;
  superAdminId: string;
  slug: string;
  planName?: string;
  settings: IOrganizationSettings;
  stats?: IOrganizationStats;
  verification?: IOrganizationVerification;
  approvalStatus: ApprovalStatus;
  approvalComment?: string | null;
  approvalReviewedBy?: string | null;
  approvalReviewedAt?: Date | null;
  status: EntityStatus;
}
