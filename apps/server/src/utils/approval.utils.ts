import { ApprovalStatus } from '@lms-organization/shared-types';
import { Document } from 'mongoose';

export function escapeRegex(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export interface IApprovableDocument extends Document {
  approvalStatus: ApprovalStatus;
  approvalComment: string | null;
  pendingUpdate: Record<string, unknown> | null;
  reviewedBy: unknown;
  reviewedAt: Date | null;
}

export const APPROVED_STATUSES = [ApprovalStatus.APPROVED, ApprovalStatus.PENDING_UPDATE];

const PROTECTED_FIELDS = new Set([
  '_id',
  '__v',
  'approvalStatus',
  'approvalComment',
  'reviewedBy',
  'reviewedAt',
  'pendingUpdate',
  'createdAt',
  'updatedAt',
]);

/**
 * Fields that always bypass the approval workflow and are written
 * directly to the document regardless of its current approvalStatus.
 * publishStatus/publishedAt are visibility toggles, not content changes.
 * settings (e.g. downloadEnabled) and attendanceSettings are operational
 * toggles, not editorial content.
 */
const BYPASS_APPROVAL_FIELDS = new Set(['publishStatus', 'publishedAt', 'settings', 'attendanceSettings']);

function stripProtectedFields(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !PROTECTED_FIELDS.has(key)));
}

function partitionBypassFields(obj: Record<string, unknown>): {
  bypass: Record<string, unknown>;
  rest: Record<string, unknown>;
} {
  const bypass: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (BYPASS_APPROVAL_FIELDS.has(key)) {
      bypass[key] = value;
    } else {
      rest[key] = value;
    }
  }
  return { bypass, rest };
}

export function buildApprovedFilter() {
  return { approvalStatus: { $in: APPROVED_STATUSES } };
}

export function buildPendingReviewFilter() {
  return {
    approvalStatus: { $in: [ApprovalStatus.PENDING, ApprovalStatus.PENDING_UPDATE] },
  };
}

export function applyUpdateWithApproval<T extends IApprovableDocument>(doc: T, changes: Record<string, unknown>, skipApproval = false): T {
  const safeChanges = stripProtectedFields(changes);
  const { bypass, rest } = partitionBypassFields(safeChanges);

  // Always apply bypass fields (publishStatus, publishedAt) directly
  if (Object.keys(bypass).length > 0) {
    Object.assign(doc, bypass);
  }

  if (Object.keys(rest).length === 0) {
    return doc;
  }

  if (skipApproval) {
    Object.assign(doc, rest);
    doc.approvalStatus = ApprovalStatus.APPROVED;
    doc.approvalComment = null;
    return doc;
  }

  if (doc.approvalStatus === ApprovalStatus.APPROVED || doc.approvalStatus === ApprovalStatus.PENDING_UPDATE) {
    doc.pendingUpdate = rest as T['pendingUpdate'];
    doc.approvalStatus = ApprovalStatus.PENDING_UPDATE;
    return doc;
  }

  Object.assign(doc, rest);
  doc.approvalStatus = ApprovalStatus.PENDING;
  doc.approvalComment = null;
  return doc;
}

export function mergeApproval<T extends IApprovableDocument>(doc: T, adminId: string): T {
  if (doc.approvalStatus === ApprovalStatus.PENDING_UPDATE && doc.pendingUpdate) {
    const safeChanges = stripProtectedFields(doc.pendingUpdate);
    Object.assign(doc, safeChanges);
    doc.pendingUpdate = null;
  }

  doc.approvalStatus = ApprovalStatus.APPROVED;
  doc.reviewedBy = adminId;
  doc.reviewedAt = new Date();
  doc.approvalComment = null;
  return doc;
}

export function rejectApproval<T extends IApprovableDocument>(doc: T, adminId: string, comment: string): T {
  if (doc.approvalStatus === ApprovalStatus.PENDING_UPDATE) {
    doc.pendingUpdate = null;
    doc.approvalStatus = ApprovalStatus.APPROVED;
  } else {
    doc.approvalStatus = ApprovalStatus.REJECTED;
  }

  doc.approvalComment = comment;
  doc.reviewedBy = adminId;
  doc.reviewedAt = new Date();
  return doc;
}
