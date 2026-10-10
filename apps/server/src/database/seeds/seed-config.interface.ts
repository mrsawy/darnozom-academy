import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { ContentType } from '../../course/enum/contentType.enum';
import { Currency, ApprovalStatus, EntityStatus, PublishStatus, VerificationStatus, IdentityDocumentType } from '@lms-organization/shared-types';
import { PlanTier } from 'src/plan/enum/planTier.enum';

export interface CourseSeedConfig {
  name: string;
  isPaid: boolean;
  categories?: string[];
  contentTypes?: ContentType[];
  approvalStatus?: ApprovalStatus;
  publishStatus?: PublishStatus;
  entityStatus?: EntityStatus;
  pricing?: {
    [BillingCycle.MONTHLY]?: {
      originalPrice: number;
      originalCurrency: Currency;
      priceUSD?: number;
      discountPercentage?: number;
      discountStartDate?: Date;
      discountEndDate?: Date;
    };
    [BillingCycle.YEARLY]?: {
      originalPrice: number;
      originalCurrency: Currency;
      priceUSD?: number;
      discountPercentage?: number;
      discountStartDate?: Date;
      discountEndDate?: Date;
    };
    [BillingCycle.ONE_TIME]?: {
      originalPrice: number;
      originalCurrency: Currency;
      priceUSD?: number;
      discountPercentage?: number;
      discountStartDate?: Date;
      discountEndDate?: Date;
    };
  };
  discussions?: {
    title: string;
    content: string;
  }[];
  reviews?: {
    rating: number;
    comment: string;
  }[];
}

export interface OrganizationSeedConfig {
  name: string;
  planTier?: PlanTier;
  verificationStatus?: VerificationStatus;
  identityDocumentType?: IdentityDocumentType;
  entityStatus?: EntityStatus;
  emailVerified?: boolean;
  studentsCount: number;
  teachersCount: number;
  adminsCount: number;
  suspendedUsersCount?: number;
  parentAccountsCount?: number;
  courses: CourseSeedConfig[];
}
