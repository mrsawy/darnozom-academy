import { NotFoundException } from '@nestjs/common';
import { ActiveStatus, ApprovalStatus, PublishStatus } from '@darnozom/shared-types';
import { APPROVED_STATUSES } from 'src/utils/approval.utils';
import { sanitizeContentForStudent } from './content-sanitizer.util';

/** Minimal enrollment gate the content controllers depend on (EnrollmentService satisfies it). */
interface EnrollmentGate {
  assertActiveEnrollmentForCourse(courseId: string, userId: string): Promise<unknown>;
}

interface ContentRequester {
  _id?: { toString(): string } | null;
  organizationId?: { toString(): string } | null;
}

interface ServableContent {
  organizationId?: { toString(): string } | null;
  courseId?: { toString(): string } | null;
  publishStatus?: unknown;
  approvalStatus?: unknown;
  activeStatus?: unknown;
  deletedAt?: Date | null;
}

/**
 * A content item is visible to a non-owner learner only when it is published,
 * approved (or approved-with-pending-update), active, and not soft-deleted.
 */
export function isContentServableToStudent(content: ServableContent): boolean {
  return (
    content.deletedAt == null &&
    content.publishStatus === PublishStatus.PUBLISHED &&
    APPROVED_STATUSES.includes(content.approvalStatus as ApprovalStatus) &&
    content.activeStatus === ActiveStatus.ACTIVE
  );
}

/**
 * Authorizes a direct-by-id content read and strips learner-forbidden fields.
 * Shared by the HTTP and NATS `getContent` handlers so the rule lives in one place.
 *
 * - Owners (same organization as the content) receive the full document unchanged.
 * - Everyone else must hold an active enrollment in the content's course, may only
 *   see published + approved + active content, and receives a sanitized document
 *   (no quiz answer key, no peers' submissions/attendance). Mutates in place.
 *
 * Throws ForbiddenException (via the gate) when not enrolled, or NotFoundException
 * when the content is not yet servable to learners.
 */
export async function authorizeContentForRequester<T extends ServableContent>(
  content: T,
  requester: ContentRequester,
  enrollmentGate: EnrollmentGate
): Promise<T> {
  const requesterId = requester._id?.toString() ?? '';
  const requesterOrgId = requester.organizationId?.toString();
  const isOwner = !!requesterOrgId && content.organizationId?.toString() === requesterOrgId;
  if (isOwner) return content;

  await enrollmentGate.assertActiveEnrollmentForCourse(content.courseId?.toString() ?? '', requesterId);
  if (!isContentServableToStudent(content)) {
    throw new NotFoundException('Content not found');
  }
  sanitizeContentForStudent(content);
  return content;
}
