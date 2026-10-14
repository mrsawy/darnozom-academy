import { ApprovalStatus, ShariaStatus } from '@darnozom/shared-types';
import { APPROVED_STATUSES } from 'src/utils/approval.utils';

/**
 * The two gates a content item passes before a student sees it. They are independent: the platform
 * gate is the platform admin reviewing an unverified organization, the Sharia gate is the academy
 * reviewing its own material. Neither one implies the other.
 */
export const STUDENT_VISIBLE_CONTENT_FILTER = {
  approvalStatus: { $in: APPROVED_STATUSES },
  shariaStatus: ShariaStatus.APPROVED,
} as const;

export function isStudentVisible(approvalStatus: ApprovalStatus, shariaStatus: ShariaStatus): boolean {
  return APPROVED_STATUSES.includes(approvalStatus) && shariaStatus === ShariaStatus.APPROVED;
}
