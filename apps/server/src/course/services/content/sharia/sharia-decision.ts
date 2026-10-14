import { ShariaStatus } from '@darnozom/shared-types';

/**
 * Fields that are operational toggles rather than editorial content. They mirror the
 * BYPASS_APPROVAL_FIELDS of `src/utils/approval.utils.ts`: publishing or un-publishing an item,
 * or flipping a download switch, is not a change a Sharia reviewer has anything to say about.
 */
export const SHARIA_BYPASS_FIELDS: ReadonlySet<string> = new Set([
  'publishStatus',
  'publishedAt',
  'settings',
  'attendanceSettings',
]);

/** True when the change-set touches at least one field a reviewer would need to read. */
export function isEditorialChange(changes: Record<string, unknown>): boolean {
  return Object.keys(changes).some((key) => !SHARIA_BYPASS_FIELDS.has(key));
}

export type ShariaPath =
  /** Write the edit now and put the item back in the queue: it was never approved anyway. */
  | 'APPLY_AND_PEND'
  /** Do not write the edit. Record it as a pending version; students keep the approved values. */
  | 'HOLD_AS_PENDING'
  /** Not editorial. Write it and leave the review state alone. */
  | 'APPLY_UNGATED';

/**
 * Decides what to do with an edit under Sharia review. The rule:
 * - Non-editorial edits go through ungated.
 * - Editorial edits to unapproved content: apply now and queue for review.
 * - Editorial edits to approved content: hold back; students keep approved values.
 */
export function decideShariaPath(shariaStatus: ShariaStatus, changes: Record<string, unknown>): ShariaPath {
  if (!isEditorialChange(changes)) {
    return 'APPLY_UNGATED';
  }

  if (shariaStatus === ShariaStatus.APPROVED) {
    return 'HOLD_AS_PENDING';
  }

  return 'APPLY_AND_PEND';
}
